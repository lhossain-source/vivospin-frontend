import type { Pool } from "pg";
import { calculateSettlementPayout } from "./service";

export type SettlementOutcome = "won" | "lost" | "void";

export interface SettleBetInput {
  betId: string;
  outcome: SettlementOutcome;
  idempotencyKey: string;
}

export interface SettlementResult {
  settlementId: string;
  betId: string;
  userId: string;
  outcome: SettlementOutcome;
  payoutMinor: string;
  balanceAfterMinor: string;
  currency: string;
  idempotentReplay: boolean;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Settles a previously accepted/pending bet in one PostgreSQL transaction.
 * Call only from a trusted backend worker after independently verifying the result.
 * The bet must already have a matching wager_debit ledger entry.
 */
export async function settleBet(pool: Pool, input: SettleBetInput): Promise<SettlementResult> {
  if (!UUID.test(input.betId)) throw Object.assign(new Error("betId must be a valid UUID."), { statusCode: 400 });
  if (!["won", "lost", "void"].includes(input.outcome)) {
    throw Object.assign(new Error("outcome must be won, lost, or void."), { statusCode: 400 });
  }
  if (typeof input.idempotencyKey !== "string" || input.idempotencyKey.length < 8 || input.idempotencyKey.length > 128) {
    throw Object.assign(new Error("idempotencyKey must contain 8–128 characters."), { statusCode: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const prior = await client.query(
      `SELECT id, bet_id, user_id, outcome, payout_minor::text AS payout_minor, currency, idempotency_key
       FROM settlement_transactions
       WHERE bet_id = $1 OR idempotency_key = $2
       LIMIT 1`,
      [input.betId, input.idempotencyKey],
    );
    if (prior.rowCount) {
      const row = prior.rows[0];
      if (row.bet_id !== input.betId || row.outcome !== input.outcome || row.idempotency_key !== input.idempotencyKey) {
        throw Object.assign(new Error("Bet or idempotency key was already settled differently."), { statusCode: 409 });
      }
      const balance = await client.query(
        "SELECT balance_minor::text AS balance_minor FROM wallet_accounts WHERE user_id = $1",
        [row.user_id],
      );
      await client.query("COMMIT");
      return {
        settlementId: row.id, betId: row.bet_id, userId: row.user_id, outcome: row.outcome,
        payoutMinor: row.payout_minor, balanceAfterMinor: balance.rows[0]?.balance_minor ?? "0",
        currency: row.currency, idempotentReplay: true,
      };
    }

    const betResult = await client.query(
      `SELECT id, user_id, stake_minor::text AS stake_minor, decimal_odds::text AS decimal_odds,
              currency, status
       FROM bets WHERE id = $1 FOR UPDATE`,
      [input.betId],
    );
    if (!betResult.rowCount) throw Object.assign(new Error("Bet not found."), { statusCode: 404 });
    const bet = betResult.rows[0];
    if (bet.status !== "pending") throw Object.assign(new Error("Bet is not pending settlement."), { statusCode: 409 });

    const walletResult = await client.query(
      "SELECT balance_minor::text AS balance_minor, currency FROM wallet_accounts WHERE user_id = $1 FOR UPDATE",
      [bet.user_id],
    );
    if (!walletResult.rowCount || walletResult.rows[0].currency !== bet.currency) {
      throw Object.assign(new Error("Matching wallet account is missing."), { statusCode: 409 });
    }

    const debit = await client.query(
      `SELECT 1 FROM wallet_ledger
       WHERE user_id = $1 AND entry_type = 'wager_debit' AND reference_type = 'bet'
         AND reference_id = $2 AND amount_minor = -$3::bigint AND currency = $4
       LIMIT 1`,
      [bet.user_id, input.betId, bet.stake_minor, bet.currency],
    );
    if (!debit.rowCount) {
      throw Object.assign(new Error("No matching wager debit ledger entry; refusing settlement."), { statusCode: 409 });
    }

    const payout = calculateSettlementPayout(BigInt(bet.stake_minor), bet.decimal_odds, input.outcome);
    const balanceBefore = BigInt(walletResult.rows[0].balance_minor);
    const balanceAfter = balanceBefore + payout;
    const max = 9_223_372_036_854_775_807n;
    if (balanceAfter > max) throw Object.assign(new Error("Payout exceeds PostgreSQL BIGINT range."), { statusCode: 422 });

    const inserted = await client.query(
      `INSERT INTO settlement_transactions (bet_id, user_id, outcome, payout_minor, currency, idempotency_key)
       VALUES ($1, $2, $3, $4::bigint, $5, $6)
       RETURNING id, settled_at`,
      [input.betId, bet.user_id, input.outcome, payout.toString(), bet.currency, input.idempotencyKey],
    );

    if (payout > 0n) {
      await client.query(
        "UPDATE wallet_accounts SET balance_minor = $2::bigint, updated_at = NOW() WHERE user_id = $1",
        [bet.user_id, balanceAfter.toString()],
      );
      await client.query(
        `INSERT INTO wallet_ledger
           (user_id, entry_type, amount_minor, balance_after_minor, currency,
            reference_type, reference_id, idempotency_key, metadata)
         VALUES ($1, $2, $3::bigint, $4::bigint, $5, 'bet', $6, $7, $8::jsonb)`,
        [
          bet.user_id, input.outcome === "void" ? "refund" : "settlement_credit",
          payout.toString(), balanceAfter.toString(), bet.currency, input.betId,
          `settlement:${input.betId}`, JSON.stringify({ settlementId: inserted.rows[0].id, outcome: input.outcome }),
        ],
      );
    }

    await client.query(
      "UPDATE bets SET status = $2, payout_minor = $3::bigint, settled_at = NOW() WHERE id = $1",
      [input.betId, input.outcome, payout.toString()],
    );
    await client.query("COMMIT");

    return {
      settlementId: inserted.rows[0].id, betId: input.betId, userId: bet.user_id,
      outcome: input.outcome, payoutMinor: payout.toString(), balanceAfterMinor: balanceAfter.toString(),
      currency: bet.currency, idempotentReplay: false,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    if ((error as any)?.code === "23505") {
      throw Object.assign(new Error("Duplicate settlement or idempotency key."), { statusCode: 409 });
    }
    throw error;
  } finally {
    client.release();
  }
}
