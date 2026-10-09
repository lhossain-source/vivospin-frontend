import { db } from "./_lib/db";
import { requireUser } from "./_lib/auth";

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const userId = await requireUser(req);
    const account = await db.query(
      `SELECT currency, balance_minor::text AS balance_minor, updated_at
       FROM wallet_accounts WHERE user_id = $1`,
      [userId],
    );

    if (account.rowCount === 0) {
      return res.status(200).json({
        wallet: null,
        entries: [],
        message: "Wallet has not been initialized for this account.",
      });
    }

    const ledger = await db.query(
      `SELECT id, entry_type, amount_minor::text AS amount_minor,
              balance_after_minor::text AS balance_after_minor,
              currency, reference_type, reference_id, created_at
       FROM wallet_ledger
       WHERE user_id = $1
       ORDER BY created_at DESC, id DESC
       LIMIT 100`,
      [userId],
    );

    return res.status(200).json({
      wallet: {
        currency: account.rows[0].currency,
        balanceMinor: account.rows[0].balance_minor,
        updatedAt: account.rows[0].updated_at,
      },
      entries: ledger.rows,
    });
  } catch (error) {
    const status = Number((error as any)?.statusCode) || 500;
    if (status >= 500) console.error("wallet API error", error);
    return res.status(status).json({
      error: status === 500 ? "Unable to load wallet." : (error as Error).message,
    });
  }
}
