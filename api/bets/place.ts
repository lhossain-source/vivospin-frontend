import { createHash } from "node:crypto";
import { db } from "../../server/db";
import { requireUser } from "../../server/auth";

const ALLOWED_SPORTS = new Set([
  "soccer_epl", "soccer_uefa_champs_league", "soccer_spain_la_liga",
  "soccer_germany_bundesliga", "soccer_italy_serie_a", "soccer_france_ligue_one",
]);
type Outcome = "1" | "X" | "2" | "OVER" | "UNDER";
type Selection = {
  matchId: string; matchName: string; marketId: string;
  marketType: "1X2" | "OVER_UNDER"; outcome: Outcome;
  outcomeLabel: string; odds: number; sport: string;
};
const fail = (statusCode: number, message: string) => Object.assign(new Error(message), { statusCode });

function parseStakeMinor(value: unknown): bigint | null {
  const raw = typeof value === "number" && Number.isFinite(value) ? String(value) : value;
  if (typeof raw !== "string" || !/^(?:0|[1-9]\d{0,8})(?:\.\d{1,2})?$/.test(raw)) return null;
  const [whole, decimal = ""] = raw.split(".");
  const amount = BigInt(whole) * 100n + BigInt((decimal + "00").slice(0, 2));
  return amount > 0n ? amount : null;
}
function requestFingerprint(stakeMinor: string, selections: Selection[]) {
  return createHash("sha256").update(JSON.stringify({
    stakeMinor,
    selections: selections.map(s => ({
      matchId: s.matchId, marketId: s.marketId, marketType: s.marketType,
      outcome: s.outcome, odds: s.odds, sport: s.sport,
    })),
  })).digest("hex");
}
async function currentEvents(sport: string, apiKey: string): Promise<any[]> {
  const query = new URLSearchParams({ apiKey, regions: "uk", markets: "h2h,totals", oddsFormat: "decimal", dateFormat: "iso" });
  const response = await fetch("https://api.the-odds-api.com/v4/sports/" + sport + "/odds?" + query, {
    headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw fail(502, "Could not verify current odds with the odds provider.");
  const data = await response.json();
  if (!Array.isArray(data)) throw fail(502, "Odds provider returned an invalid response.");
  return data;
}
function authoritativePrice(event: any, s: Selection): number | null {
  let best: number | null = null;
  for (const bookmaker of event.bookmakers ?? []) for (const market of bookmaker.markets ?? []) {
    for (const outcome of market.outcomes ?? []) {
      if (!Number.isFinite(outcome.price) || outcome.price <= 1) continue;
      let matches = false;
      if (s.marketType === "1X2" && market.key === "h2h" && s.marketId === "h2h") {
        const expected = s.outcome === "1" ? event.home_team : s.outcome === "2" ? event.away_team : "Draw";
        matches = outcome.name === expected || (s.outcome === "X" && outcome.name === "Tie");
      } else if (s.marketType === "OVER_UNDER" && market.key === "totals") {
        const point = /^totals-(\d+(?:\.\d+)?)$/.exec(s.marketId)?.[1];
        matches = !!point && Number(outcome.point) === Number(point) &&
          outcome.name.toLowerCase() === s.outcome.toLowerCase();
      }
      if (matches && (best === null || outcome.price > best)) best = outcome.price;
    }
  }
  return best;
}
export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  let client: any;
  try {
    const userId = await requireUser(req);
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const stakeMinor = parseStakeMinor(body?.stake);
    if (!stakeMinor) return res.status(400).json({ error: "Enter a stake between 0.01 and 999999999.99 (maximum 2 decimal places)." });
    if (!Array.isArray(body?.selections) || body.selections.length < 1 || body.selections.length > 10) {
      return res.status(400).json({ error: "Select between 1 and 10 outcomes." });
    }
    const key = req.headers?.["idempotency-key"];
    if (typeof key !== "string" || key.length < 8 || key.length > 128) {
      return res.status(400).json({ error: "A valid Idempotency-Key header is required." });
    }
    const selections: Selection[] = [];
    const marketKeys = new Set<string>();
    for (const s of body.selections) {
      if (!s || typeof s.matchId !== "string" || s.matchId.length < 1 || s.matchId.length > 128 ||
          typeof s.marketId !== "string" || !["1X2", "OVER_UNDER"].includes(s.marketType) ||
          !["1", "X", "2", "OVER", "UNDER"].includes(s.outcome) ||
          !Number.isFinite(s.odds) || s.odds <= 1 || s.odds > 1000 || !ALLOWED_SPORTS.has(s.sport)) {
        return res.status(400).json({ error: "One or more selections are invalid." });
      }
      if ((s.marketType === "1X2" && s.marketId !== "h2h") ||
          (s.marketType === "OVER_UNDER" && !/^totals-\d+(?:\.\d+)?$/.test(s.marketId))) {
        return res.status(400).json({ error: "Unsupported market." });
      }
      const marketKey = s.matchId + ":" + s.marketId;
      if (marketKeys.has(marketKey)) return res.status(400).json({ error: "Choose only one outcome per match market." });
      marketKeys.add(marketKey);
      selections.push({
        matchId: s.matchId, matchName: String(s.matchName ?? "").slice(0, 240),
        marketId: s.marketId, marketType: s.marketType, outcome: s.outcome,
        outcomeLabel: String(s.outcomeLabel ?? "").slice(0, 100), odds: s.odds, sport: s.sport,
      });
    }
    const fingerprint = requestFingerprint(stakeMinor.toString(), selections);
    client = await db.connect();
    await client.query("BEGIN");
    const prior = await client.query(
      "SELECT user_id, entry_type, amount_minor::text AS amount_minor, balance_after_minor::text AS balance_after_minor, reference_id, metadata->>'requestFingerprint' AS request_fingerprint FROM wallet_ledger WHERE idempotency_key = $1",
      [key],
    );
    if (prior.rowCount) {
      const row = prior.rows[0];
      if (row.user_id !== userId || row.entry_type !== "wager_debit" ||
          row.amount_minor !== (-stakeMinor).toString() || row.request_fingerprint !== fingerprint) {
        await client.query("ROLLBACK");
        return res.status(409).json({ error: "Idempotency key was already used for a different request." });
      }
      const betResult = await client.query(
        "SELECT id, stake_minor::text AS stake_minor, decimal_odds::text AS decimal_odds, currency, status, created_at FROM bets WHERE id = $1",
        [row.reference_id],
      );
      const account = await client.query("SELECT balance_minor::text AS balance_minor, currency FROM wallet_accounts WHERE user_id = $1", [userId]);
      await client.query("COMMIT");
      return res.status(200).json({
        bet: betResult.rows[0],
        wallet: account.rows[0] ? { balanceMinor: account.rows[0].balance_minor, currency: account.rows[0].currency } : null,
        ledger: { entryType: "wager_debit", amountMinor: row.amount_minor, balanceAfterMinor: row.balance_after_minor },
        idempotentReplay: true,
      });
    }
    await client.query("ROLLBACK");
    client.release();
    client = null;

    const apiKey = process.env.THE_ODDS_API_KEY || process.env.ODDS_API_KEY;
    if (!apiKey) throw fail(503, "Live odds verification is unavailable: configure THE_ODDS_API_KEY or ODDS_API_KEY with a valid provider key. No bet was placed.");
    const eventsById = new Map<string, any>();
    for (const sport of new Set(selections.map(s => s.sport))) {
      for (const event of await currentEvents(sport, apiKey)) eventsById.set(sport + ":" + event.id, event);
    }
    let combinedOdds = 1;
    const verified: Array<Selection & { commenceTime: string }> = [];
    for (const s of selections) {
      const event = eventsById.get(s.sport + ":" + s.matchId);
      if (!event || !event.commence_time || Date.parse(event.commence_time) <= Date.now()) {
        throw fail(409, "A selected match has started or is unavailable. Refresh odds and try again.");
      }
      const price = authoritativePrice(event, s);
      if (price === null) throw fail(409, "A selected outcome is no longer available. Refresh odds and try again.");
      if (Math.abs(price - s.odds) > 0.01) throw fail(409, "Odds changed for " + event.home_team + " vs " + event.away_team + ". Refresh the odds before betting.");
      combinedOdds *= price;
      verified.push({ ...s, odds: price, matchName: event.home_team + " vs " + event.away_team, commenceTime: event.commence_time });
    }
    if (!Number.isFinite(combinedOdds) || combinedOdds <= 1 || combinedOdds >= 100000000) {
      throw fail(422, "Combined odds are outside the supported range.");
    }

    client = await db.connect();
    await client.query("BEGIN");
    const priorAgain = await client.query("SELECT user_id, entry_type, amount_minor::text AS amount_minor, balance_after_minor::text AS balance_after_minor, reference_id, metadata->>'requestFingerprint' AS request_fingerprint FROM wallet_ledger WHERE idempotency_key = $1", [key]);
    if (priorAgain.rowCount) {
      const row = priorAgain.rows[0];
      if (row.user_id !== userId || row.entry_type !== "wager_debit" || row.amount_minor !== (-stakeMinor).toString() || row.request_fingerprint !== fingerprint) {
        await client.query("ROLLBACK");
        return res.status(409).json({ error: "Idempotency key was already used for a different request." });
      }
      const bet = await client.query("SELECT id, stake_minor::text AS stake_minor, decimal_odds::text AS decimal_odds, currency, status, created_at FROM bets WHERE id = $1", [row.reference_id]);
      const account = await client.query("SELECT balance_minor::text AS balance_minor, currency FROM wallet_accounts WHERE user_id = $1", [userId]);
      await client.query("COMMIT");
      return res.status(200).json({ bet: bet.rows[0], wallet: { balanceMinor: account.rows[0].balance_minor, currency: account.rows[0].currency }, ledger: { entryType: "wager_debit", amountMinor: row.amount_minor, balanceAfterMinor: row.balance_after_minor }, idempotentReplay: true });
    }
    const account = await client.query("SELECT balance_minor::text AS balance_minor, currency FROM wallet_accounts WHERE user_id = $1 FOR UPDATE", [userId]);
    if (!account.rowCount) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Wallet is not initialized for this account. No bet was placed." });
    }
    const wallet = account.rows[0];
    const before = BigInt(wallet.balance_minor);
    if (before < stakeMinor) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Insufficient wallet balance." });
    }
    const after = before - stakeMinor;
    const eventId = verified.length === 1 ? verified[0].matchId : "accumulator";
    const marketId = verified.length === 1 ? verified[0].marketId : "accumulator";
    const selectionKey = JSON.stringify(verified.map(s => ({
      eventId: s.matchId, matchName: s.matchName, marketId: s.marketId, marketType: s.marketType,
      outcome: s.outcome, outcomeLabel: s.outcomeLabel, decimalOdds: s.odds, sport: s.sport, commenceTime: s.commenceTime,
    })));
    const betResult = await client.query(
      "INSERT INTO bets (user_id, event_id, market_id, selection_key, stake_minor, decimal_odds, currency) VALUES ($1, $2, $3, $4, $5::bigint, $6::numeric, $7) RETURNING id, stake_minor::text AS stake_minor, decimal_odds::text AS decimal_odds, currency, status, created_at",
      [userId, eventId, marketId, selectionKey, stakeMinor.toString(), combinedOdds.toFixed(4), wallet.currency],
    );
    const bet = betResult.rows[0];
    await client.query("UPDATE wallet_accounts SET balance_minor = $2::bigint, updated_at = NOW() WHERE user_id = $1", [userId, after.toString()]);
    await client.query(
      "INSERT INTO wallet_ledger (user_id, entry_type, amount_minor, balance_after_minor, currency, reference_type, reference_id, idempotency_key, metadata) VALUES ($1, 'wager_debit', $2::bigint, $3::bigint, $4, 'bet', $5, $6, $7::jsonb)",
      [userId, (-stakeMinor).toString(), after.toString(), wallet.currency, bet.id, key, JSON.stringify({ requestFingerprint: fingerprint, selectionCount: verified.length, combinedOdds: combinedOdds.toFixed(4) })],
    );
    await client.query("COMMIT");
    return res.status(201).json({
      bet, wallet: { balanceMinor: after.toString(), currency: wallet.currency },
      ledger: { entryType: "wager_debit", amountMinor: (-stakeMinor).toString(), balanceAfterMinor: after.toString() },
      combinedOdds: combinedOdds.toFixed(4), idempotentReplay: false,
    });
  } catch (error) {
    if (client) try { await client.query("ROLLBACK"); } catch {}
    const status = Number((error as any)?.statusCode) || 500;
    if (status >= 500) console.error("bet placement API error", error);
    return res.status(status).json({ error: status === 500 ? "Unable to place bet." : (error as Error).message });
  } finally {
    client?.release();
  }
}
