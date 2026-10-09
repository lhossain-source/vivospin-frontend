import type { Pool, PoolClient } from "pg";

export type WalletEntryType =
  | "deposit"
  | "withdrawal"
  | "wager_debit"
  | "settlement_credit"
  | "refund"
  | "adjustment";

export interface WalletTransactionInput {
  userId: string;
  amountMinor: bigint;
  currency: string;
  entryType: WalletEntryType;
  referenceType: string;
  referenceId: string;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
}

export interface WalletTransactionResult {
  ledgerId: string;
  userId: string;
  entryType: WalletEntryType;
  amountMinor: string;
  balanceAfterMinor: string;
  currency: string;
  idempotentReplay: boolean;
}

const MAX_MINOR = 9_223_372_036_854_775_807n;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validate(input: WalletTransactionInput): void {
  if (!UUID.test(input.userId)) throw new Error("userId must be a UUID.");
  if (input.amountMinor === 0n) throw new Error("amountMinor must not be zero.");
  if (input.amountMinor > MAX_MINOR || input.amountMinor < -MAX_MINOR) {
    throw new Error("amountMinor is outside the PostgreSQL BIGINT range.");
  }
  if (!/^[A-Z]{3}$/.test(input.currency)) throw new Error("currency must be a 3-letter uppercase code.");
  if (input.idempotencyKey.length < 8 || input.idempotencyKey.length > 128) {
    throw new Error("idempotencyKey must contain 8–128 characters.");
  }
  if (!input.referenceType.trim() || !input.referenceId.trim()) {
    throw new Error("referenceType and referenceId are required.");
  }
  if (input.entryType === "deposit" && input.amountMinor < 0n) {
    throw new Error("A deposit must be a positive amount.");
  }
  if (input.entryType === "withdrawal" || input.entryType === "wager_debit") {
    if (input.amountMinor > 0n) throw new Error(`${input.entryType} must be a negative amount.`);
  }
  if (["settlement_credit", "refund"].includes(input.entryType) && input.amountMinor < 0n) {
    throw new Error(`${input.entryType} must be a positive amount.`);
  }
}

/**
 * Applies one immutable ledger movement and its matching balance change atomically.
 * Deposit callers must only call this after their payment provider has verified the deposit.
 * The caller never supplies a balance; it is calculated while the wallet row is locked.
 */
export async function postWalletTransaction(
  pool: Pool,
  input: WalletTransactionInput,
): Promise<WalletTransactionResult> {
  validate(input);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const prior = await client.query(
      `SELECT id, user_id, entry_type, amount_minor::text AS amount_minor,
              balance_after_minor::text AS balance_after_minor, currency,
              reference_type, reference_id, idempotency_key
       FROM wallet_ledger WHERE idempotency_key = $1`,
      [input.idempotencyKey],
    );

    if (prior.rowCount) {
      const row = prior.rows[0];
      const sameRequest =
        row.user_id === input.userId &&
        row.entry_type === input.entryType &&
        row.amount_minor === input.amountMinor.toString() &&
        row.currency === input.currency &&
        row.reference_type === input.referenceType &&
        row.reference_id === input.referenceId;
      if (!sameRequest) throw Object.assign(new Error("Idempotency key was already used for a different transaction."), { statusCode: 409 });
      await client.query("COMMIT");
      return {
        ledgerId: row.id,
        userId: row.user_id,
        entryType: row.entry_type,
        amountMinor: row.amount_minor,
        balanceAfterMinor: row.balance_after_minor,
        currency: row.currency,
        idempotentReplay: true,
      };
    }

    const wallet = await client.query(
      "SELECT balance_minor::text AS balance_minor, currency FROM wallet_accounts WHERE user_id = $1 FOR UPDATE",
      [input.userId],
    );
    if (!wallet.rowCount) throw Object.assign(new Error("Wallet account not found."), { statusCode: 404 });
    if (wallet.rows[0].currency !== input.currency) {
      throw Object.assign(new Error("Transaction currency does not match wallet currency."), { statusCode: 409 });
    }

    const before = BigInt(wallet.rows[0].balance_minor);
    const after = before + input.amountMinor;
    if (after < 0n) throw Object.assign(new Error("Insufficient wallet funds."), { statusCode: 409 });
    if (after > MAX_MINOR) throw Object.assign(new Error("Wallet balance exceeds PostgreSQL BIGINT range."), { statusCode: 422 });

    await client.query(
      "UPDATE wallet_accounts SET balance_minor = $2::bigint, updated_at = NOW() WHERE user_id = $1",
      [input.userId, after.toString()],
    );
    const inserted = await client.query(
      `INSERT INTO wallet_ledger
         (user_id, entry_type, amount_minor, balance_after_minor, currency,
          reference_type, reference_id, idempotency_key, metadata)
       VALUES ($1, $2, $3::bigint, $4::bigint, $5, $6, $7, $8, $9::jsonb)
       RETURNING id`,
      [
        input.userId, input.entryType, input.amountMinor.toString(), after.toString(),
        input.currency, input.referenceType, input.referenceId, input.idempotencyKey,
        JSON.stringify(input.metadata ?? {}),
      ],
    );

    await client.query("COMMIT");
    return {
      ledgerId: inserted.rows[0].id,
      userId: input.userId,
      entryType: input.entryType,
      amountMinor: input.amountMinor.toString(),
      balanceAfterMinor: after.toString(),
      currency: input.currency,
      idempotentReplay: false,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/** Creates a zero-balance wallet once. Existing accounts are not overwritten. */
export async function ensureWalletAccount(
  pool: Pool,
  userId: string,
  currency: string,
): Promise<void> {
  if (!UUID.test(userId)) throw new Error("userId must be a UUID.");
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error("currency must be a 3-letter uppercase code.");
  await pool.query(
    `INSERT INTO wallet_accounts (user_id, currency)
     VALUES ($1, $2)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId, currency],
  );
}

/** Convenience wrappers keep signed ledger amounts consistent. */
export function deposit(pool: Pool, input: Omit<WalletTransactionInput, "entryType">) {
  return postWalletTransaction(pool, { ...input, entryType: "deposit" });
}
export function debit(pool: Pool, input: Omit<WalletTransactionInput, "entryType">) {
  return postWalletTransaction(pool, { ...input, entryType: "wager_debit", amountMinor: -abs(input.amountMinor) });
}
export function credit(pool: Pool, input: Omit<WalletTransactionInput, "entryType">) {
  return postWalletTransaction(pool, { ...input, entryType: "settlement_credit", amountMinor: abs(input.amountMinor) });
}
export function withdraw(pool: Pool, input: Omit<WalletTransactionInput, "entryType">) {
  return postWalletTransaction(pool, { ...input, entryType: "withdrawal", amountMinor: -abs(input.amountMinor) });
}
function abs(value: bigint): bigint {
  return value < 0n ? -value : value;
}

/** Decimal odds are parsed as fixed-point integers; no floating-point money math. */
export function calculateSettlementPayout(
  stakeMinor: bigint,
  decimalOdds: string,
  outcome: "won" | "lost" | "void",
): bigint {
  if (stakeMinor <= 0n || stakeMinor > MAX_MINOR) throw new Error("stakeMinor must be a positive BIGINT.");
  const match = /^(\d+)(?:\.(\d{1,4}))?$/.exec(decimalOdds);
  if (!match) throw new Error("decimalOdds must be a decimal with up to 4 fractional digits.");
  const whole = BigInt(match[1]);
  const fraction = BigInt((match[2] ?? "").padEnd(4, "0") || "0");
  const oddsScaled = whole * 10_000n + fraction;
  if (oddsScaled <= 10_000n) throw new Error("decimalOdds must be greater than 1.0000.");
  if (outcome === "lost") return 0n;
  if (outcome === "void") return stakeMinor;
  const payout = (stakeMinor * oddsScaled + 5_000n) / 10_000n;
  if (payout > MAX_MINOR) throw new Error("Payout exceeds PostgreSQL BIGINT range.");
  return payout;
}
