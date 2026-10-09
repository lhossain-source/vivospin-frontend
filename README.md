# VivoSpin — Live Odds, Wallet Ledger & Settlement API

This repository contains a React/TypeScript odds board, a server-side proxy for The Odds API, and a PostgreSQL-backed wallet ledger/settlement API scaffold.

## Live odds

- `api/odds.ts` proxies The Odds API without exposing the provider key in browser code.
- `src/OddsBoard.tsx` loads live soccer odds, refreshes every 60 seconds, and keeps selections synchronized with the Bet Slip.
- The provider's `h2h` market is normalized to 1X2; `totals` is normalized to Over/Under where supplied.

Configure `THE_ODDS_API_KEY` on the server. Provider coverage and quota determine which matches and markets are available.

## Wallet API

### `GET /api/wallet`

Requires `Authorization: Bearer <user-access-token>`. The token must be an HS256 JWT whose `sub` is the user's UUID. If configured, `AUTH_JWT_ISSUER` must match the JWT issuer.

Returns the authenticated user's wallet balance and latest 100 ledger entries. It never accepts a user ID from the request, and it does not let a client directly credit or debit a wallet.

### `POST /api/settlement`

Internal service endpoint. Requires `Authorization: Bearer <SETTLEMENT_SERVICE_TOKEN>` and an `Idempotency-Key` header (8–128 characters).

Example body:

```json
{ "betId": "00000000-0000-4000-8000-000000000000", "outcome": "won" }
```

`outcome` must be `won`, `lost`, or `void`. The referenced bet must already exist in `bets`, be pending, have a matching wallet account, and have a matching `wager_debit` ledger entry. Settlement locks the bet and wallet row, writes an idempotent settlement record, credits the payout/refund when applicable, writes a ledger entry, and updates the bet in one database transaction. A lost bet creates a settlement record but no wallet balance movement.

This endpoint is intended to be called by a trusted settlement worker after independently grading an event. It is not intended for the browser.

## Database setup

1. Provision PostgreSQL.
2. Run `db/migrations/001_wallet_ledger.sql` using a migration/admin role.
3. Set the environment variables in `.env.example` in your server/deployment environment.
4. Ensure your authentication service issues the expected HS256 user tokens and your trusted settlement worker knows the service token.
5. Use your existing bet-placement/payment integration to create wallet accounts, debit stakes, insert the matching immutable `wager_debit` ledger row, and create pending bets atomically before calling settlement.

All money amounts are integer minor units (for example, cents/poisha); the currency is stored per account/bet. Do not use browser-provided balances, odds, payouts, or settlement outcomes as trusted input.

## Important production requirements

- This repository does **not** implement deposits, withdrawals, bet placement, payment-provider verification, account provisioning, or a settlement-result feed.
- No production authentication/database/provider secrets are included. The APIs will not operate until the environment is configured and the migration is applied.
- The settlement API is a backend integration scaffold, not a complete regulated-money product. Add authorization/audit controls, monitoring, backups, reconciliation, rate limits, and independent security review before real-money use.
- The Bet Slip remains display-only and does not submit wagers.
- The Vercel-style `api/*.ts` handlers need to be deployed on a compatible Node serverless platform. Actual deployment requires access to the hosting project and configured secrets/database.

## Development

Install dependencies with `npm install`. Run `npm run typecheck` to check the API and component TypeScript.

## Modular wallet services

The codebase now includes reusable service functions in `server/wallet/`:

- `ensureWalletAccount(pool, userId, currency)` creates a zero-balance account without overwriting an existing one.
- `deposit(pool, input)`, `debit(pool, input)`, and `credit(pool, input)` write a matching balance change and ledger row in one transaction. `debit` records a negative amount; `credit` records a positive amount.
- `postWalletTransaction(pool, input)` is the lower-level API for transaction types including `withdrawal` and `adjustment`. Every request requires a unique idempotency key and a reference.
- `calculateSettlementPayout(stakeMinor, decimalOdds, outcome)` uses fixed-point BigInt arithmetic and returns total payout in minor units: won returns stake × decimal odds, lost returns zero, and void returns the stake.
- `settleBet(pool, input)` performs the bet settlement transaction, including wallet credit/refund, ledger row, settlement record, and bet status update.

Example:

```ts
import { db } from "../db";
import { ensureWalletAccount, deposit, debit } from "./service";
import { settleBet } from "./settlement";

await ensureWalletAccount(db, userId, "BDT");

// Only after your payment provider confirms the deposit:
await deposit(db, {
  userId, amountMinor: 10000n, currency: "BDT",
  referenceType: "payment", referenceId: providerPaymentId,
  idempotencyKey: `deposit:${providerPaymentId}`,
});

// In the same trusted bet-placement workflow, debit the stake before creating
// the pending bet; production bet placement should combine both writes atomically.
await debit(db, {
  userId, amountMinor: 500n, currency: "BDT",
  referenceType: "bet", referenceId: betId,
  idempotencyKey: `wager-debit:${betId}`,
});

// Call only from a trusted result-grading worker:
const result = await settleBet(db, {
  betId, outcome: "won", idempotencyKey: `settle:${betId}`,
});
```

`prisma/schema.prisma` is an optional Prisma model mapping the existing migration tables. The application currently uses `pg` at runtime, so adding the schema does not change the Railway database or install Prisma dependencies. Use `DATABASE_URL` for Railway PostgreSQL. Run the existing SQL migration once with a migration/admin role; do not use `prisma db push` against a live database without reviewing the migration plan.

These helpers are backend-only. Never call deposit/credit based on browser input, and never settle using an outcome supplied by a browser. Payment verification, wallet provisioning, bet creation, and result-feed trust remain responsibilities of their respective backend integrations.
