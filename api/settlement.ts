import { db } from "./_lib/db";
import { requireSettlementService } from "./_lib/auth";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    requireSettlementService(req);

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const betId = body?.betId;
    const outcome = body?.outcome;
    const idempotencyKey = req.headers?.["idempotency-key"];

    if (typeof betId !== "string" || !UUID.test(betId)) {
      return res.status(400).json({ error: "betId must be a valid UUID." });
    }
    if (!["won", "lost", "void"].includes(outcome)) {
      return res.status(400).json({ error: "outcome must be won, lost, or void." });
    }
    if (typeof idempotencyKey !== "string" || idempotencyKey.length < 8 || idempotencyKey.length > 128) {
      return res.status(400).json({ error: "Provide an Idempotency-Key header (8–128 characters)." });
    }

    const client = await db.connect();
    try {
      await client.query("BEGIN");

      const prior = await client.query(
        `SELECT id, bet_id, outcome, payout_minor::text AS payout_minor,
                currency, idempotency_key, settled_at
         FROM settlement_transactions
         WHERE bet_id = $1 OR idempotency_key = $2
         LIMIT 1`,
        [betId, idempotencyKey],
      );

      if (prior.rowCount) {
        const row = prior.rows[0];
        if (row.bet_id !== betId || row.outcome !== outcome || row.idempotency_key !== idempotencyKey) {
          await client.query("ROLLBACK");
          return res.status(409).json({ error: "This bet or idempotency key has already been settled differently." });
        }
        await client.query("COMMIT");
        return res.status(200).json({ settlement: row, idempotentReplay: true });
      }

      const betResult = await client.query(
        `SELECT id, user_id, stake_minor::text AS stake_minor,
                decimal_odds::text AS decimal_odds, currency, status
         FROM bets WHERE id = $1 FOR UPDATE`,
        [betId],
      );
      if (betResult.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Bet not found." });
      }
      const bet = betResult.rows[0];
      if (bet.status !== "pending") {
        await client.query("ROLLBACK");
        return res.status(409).json({ error: "Bet is not pending settlement." });
      }

      const walletResult = await client.query(
        "SELECT balance_minor::text AS balance_minor, currency FROM wallet_accounts WHERE user_id = $1 FOR UPDATE",
        [bet.user_id],
      );
      if (walletResult.rowCount === 0 || walletResult.rows[0].currency !== bet.currency) {
        await client.query("ROLLBACK");
        return res.status(409).json({ error: "Matching wallet account is missing." });
      }

      const stake = BigInt(bet.stake_minor);
      const payout = outcome === "won"
        ? BigInt(Math.round(Number(stake) * Number(bet.decimal_odds)))
        : outcome === "void" ? stake : 0n;
      if (payout > BigInt(Number.MAX_SAFE_INTEGER)) {
        await client.query("ROLLBACK");
        return res.status(422).json({ error: "Payout exceeds supported safe calculation range." });
      }

      const balanceBefore = BigInt(walletResult.rows[0].balance_minor);
      const balanceAfter = balanceBefore + payout;
      const settlement = await client.query(
        `INSERT INTO settlement_transactions
           (bet_id, user_id, outcome, payout_minor, currency, idempotency_key)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, bet_id, outcome, payout_minor::text AS payout_minor, currency, idempotency_key, settled_at`,
        [betId, bet.user_id, outcome, payout.toString(), bet.currency, idempotencyKey],
      );

      if (payout > 0n) {
        await client.query(
          "UPDATE wallet_accounts SET balance_minor = balance_minor + $2::bigint, updated_at = NOW() WHERE user_id = $1",
          [bet.user_id, payout.toString()],
        );
        await client.query(
          `INSERT INTO wallet_ledger
             (user_id, entry_type, amount_minor, balance_after_minor, currency, reference_type, reference_id, idempotency_key, metadata)
           VALUES ($1, $2, $3, $4, $5, 'bet', $6, $7, $8::jsonb)`,
          [
            bet.user_id,
            outcome === "void" ? "refund" : "settlement_credit",
            payout.toString(),
            balanceAfter.toString(),
            bet.currency,
            betId,
            `settlement:${betId}`,
            JSON.stringify({ settlementId: settlement.rows[0].id, outcome }),
          ],
        );
      }

      await client.query(
        "UPDATE bets SET status = $2, payout_minor = $3::bigint, settled_at = NOW() WHERE id = $1",
        [betId, outcome, payout.toString()],
      );

      await client.query("COMMIT");
      return res.status(200).json({ settlement: settlement.rows[0], balanceAfterMinor: balanceAfter.toString(), idempotentReplay: false });
    } catch (error) {
      await client.query("ROLLBACK");
      if ((error as any)?.code === "23505") {
        return res.status(409).json({ error: "Duplicate settlement or idempotency key." });
      }
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    const status = Number((error as any)?.statusCode) || 500;
    if (status >= 500) console.error("settlement API error", error);
    return res.status(status).json({
      error: status === 500 ? "Unable to settle bet." : (error as Error).message,
    });
  }
}
