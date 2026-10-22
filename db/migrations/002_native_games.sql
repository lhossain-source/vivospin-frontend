-- Native game engine state and wallet-linked rounds. Apply after 001_wallet_ledger.sql.
CREATE TABLE IF NOT EXISTS game_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES wallet_accounts(user_id),
  game_type TEXT NOT NULL CHECK (game_type IN ('aviator','mines','sweet-bonanza')),
  stake_minor BIGINT NOT NULL CHECK (stake_minor > 0),
  currency CHAR(3) NOT NULL CHECK (currency = upper(currency)),
  status TEXT NOT NULL CHECK (status IN ('active','won','lost','cashed_out')),
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  payout_minor BIGINT NOT NULL DEFAULT 0 CHECK (payout_minor >= 0),
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  settled_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS game_rounds_user_active_idx
  ON game_rounds(user_id, game_type, status, created_at DESC);
CREATE INDEX IF NOT EXISTS game_rounds_created_idx
  ON game_rounds(created_at DESC);

-- Prevent simultaneous active rounds for the same user and game, including concurrent start requests.
DROP INDEX IF EXISTS game_rounds_one_active_per_game_idx;
CREATE UNIQUE INDEX IF NOT EXISTS game_rounds_one_active_per_slot_idx
  ON game_rounds(user_id, game_type, (COALESCE(state->>'slot','default')))
  WHERE status = 'active';
