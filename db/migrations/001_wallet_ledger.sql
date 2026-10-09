-- PostgreSQL migration for wallet read API and idempotent bet settlement.
-- Run with a migration role; the runtime app role should not have DDL privileges.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS wallet_accounts (
  user_id UUID PRIMARY KEY,
  currency CHAR(3) NOT NULL CHECK (currency = upper(currency)),
  balance_minor BIGINT NOT NULL DEFAULT 0 CHECK (balance_minor >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallet_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES wallet_accounts(user_id),
  entry_type TEXT NOT NULL CHECK (entry_type IN ('deposit', 'withdrawal', 'wager_debit', 'settlement_credit', 'refund', 'adjustment')),
  amount_minor BIGINT NOT NULL CHECK (amount_minor <> 0),
  balance_after_minor BIGINT NOT NULL CHECK (balance_after_minor >= 0),
  currency CHAR(3) NOT NULL CHECK (currency = upper(currency)),
  reference_type TEXT NOT NULL,
  reference_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS wallet_ledger_user_created_idx
  ON wallet_ledger(user_id, created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES wallet_accounts(user_id),
  event_id TEXT NOT NULL,
  market_id TEXT NOT NULL,
  selection_key TEXT NOT NULL,
  stake_minor BIGINT NOT NULL CHECK (stake_minor > 0),
  decimal_odds NUMERIC(12,4) NOT NULL CHECK (decimal_odds > 1),
  currency CHAR(3) NOT NULL CHECK (currency = upper(currency)),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'won', 'lost', 'void')),
  payout_minor BIGINT NOT NULL DEFAULT 0 CHECK (payout_minor >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  settled_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS bets_user_created_idx ON bets(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS settlement_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bet_id UUID NOT NULL UNIQUE REFERENCES bets(id),
  user_id UUID NOT NULL REFERENCES wallet_accounts(user_id),
  outcome TEXT NOT NULL CHECK (outcome IN ('won', 'lost', 'void')),
  payout_minor BIGINT NOT NULL CHECK (payout_minor >= 0),
  currency CHAR(3) NOT NULL CHECK (currency = upper(currency)),
  idempotency_key TEXT NOT NULL UNIQUE,
  settled_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS settlements_user_settled_idx
  ON settlement_transactions(user_id, settled_at DESC);
