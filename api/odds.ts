type ApiOutcome = { name: string; price: number; point?: number };
type ApiMarket = { key: string; outcomes?: ApiOutcome[] };
type ApiBookmaker = { key: string; title: string; last_update?: string; markets?: ApiMarket[] };
type ApiEvent = {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers?: ApiBookmaker[];
};

type NormalizedOption = { outcome: "1" | "X" | "2" | "OVER" | "UNDER"; label: string; odds: number };
type NormalizedMarket = { id: string; type: "1X2" | "OVER_UNDER"; title: string; options: NormalizedOption[] };
type NormalizedMatch = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  startTime: string;
  commenceTime: string;
  markets: NormalizedMarket[];
  lastUpdated: string | null;
};

const ALLOWED_SPORTS = new Set([
  "soccer_epl",
  "soccer_uefa_champs_league",
  "soccer_spain_la_liga",
  "soccer_germany_bundesliga",
  "soccer_italy_serie_a",
  "soccer_france_ligue_one",
]);

function bestPrice(
  current: { price: number; bookmaker: string } | undefined,
  price: number,
  bookmaker: string,
) {
  return !current || price > current.price ? { price, bookmaker } : current;
}

function normalizeEvent(event: ApiEvent): NormalizedMatch {
  const h2h = new Map<string, { price: number; bookmaker: string }>();
  const totals = new Map<number, Map<"OVER" | "UNDER", { price: number; bookmaker: string }>>();
  let lastUpdated: string | null = null;

  for (const bookmaker of event.bookmakers ?? []) {
    for (const market of bookmaker.markets ?? []) {
      if (bookmaker.last_update && (!lastUpdated || bookmaker.last_update > lastUpdated)) {
        lastUpdated = bookmaker.last_update;
      }
      for (const outcome of market.outcomes ?? []) {
        if (!Number.isFinite(outcome.price) || outcome.price <= 1) continue;
        if (market.key === "h2h") {
          h2h.set(outcome.name, bestPrice(h2h.get(outcome.name), outcome.price, bookmaker.title));
        } else if (market.key === "totals" && typeof outcome.point === "number") {
          const label = outcome.name.toLowerCase();
          if (label !== "over" && label !== "under") continue;
          const key = label.toUpperCase() as "OVER" | "UNDER";
          const pointMarkets = totals.get(outcome.point) ?? new Map();
          pointMarkets.set(key, bestPrice(pointMarkets.get(key), outcome.price, bookmaker.title));
          totals.set(outcome.point, pointMarkets);
        }
      }
    }
  }

  const resultOptions: NormalizedOption[] = [];
  const home = h2h.get(event.home_team);
  const draw = h2h.get("Draw") ?? h2h.get("Tie");
  const away = h2h.get(event.away_team);
  if (home) resultOptions.push({ outcome: "1", label: "1", odds: home.price });
  if (draw) resultOptions.push({ outcome: "X", label: "X", odds: draw.price });
  if (away) resultOptions.push({ outcome: "2", label: "2", odds: away.price });

  const markets: NormalizedMarket[] = [];
  if (resultOptions.length) {
    markets.push({ id: "h2h", type: "1X2", title: "Match Result", options: resultOptions });
  }

  for (const [point, prices] of [...totals.entries()].sort((a, b) => a[0] - b[0])) {
    const options: NormalizedOption[] = [];
    const over = prices.get("OVER");
    const under = prices.get("UNDER");
    if (over) options.push({ outcome: "OVER", label: `Over ${point}`, odds: over.price });
    if (under) options.push({ outcome: "UNDER", label: `Under ${point}`, odds: under.price });
    if (options.length) {
      markets.push({
        id: `totals-${point}`,
        type: "OVER_UNDER",
        title: `Over/Under ${point}`,
        options,
      });
    }
  }

  return {
    id: event.id,
    homeTeam: event.home_team,
    awayTeam: event.away_team,
    league: event.sport_title,
    startTime: new Date(event.commence_time).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
      timeZoneName: "short",
    }),
    commenceTime: event.commence_time,
    markets,
    lastUpdated,
  };
}

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "s-maxage=45, stale-while-revalidate=15");
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.THE_ODDS_API_KEY || process.env.ODDS_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: "Live odds are not configured. Set THE_ODDS_API_KEY or ODDS_API_KEY in your server environment.",
    });
  }

  const requestedSport = typeof req.query?.sport === "string" ? req.query.sport : "soccer_epl";
  const sport = ALLOWED_SPORTS.has(requestedSport) ? requestedSport : "soccer_epl";
  const regions = typeof req.query?.regions === "string" && /^[a-z,]+$/.test(req.query.regions)
    ? req.query.regions
    : "uk";

  const params = new URLSearchParams({
    apiKey,
    regions,
    markets: "h2h,totals",
    oddsFormat: "decimal",
    dateFormat: "iso",
  });

  try {
    const upstream = await fetch(
      `https://api.the-odds-api.com/v4/sports/${sport}/odds?${params.toString()}`,
      { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8000) },
    );

    if (!upstream.ok) {
      const status = upstream.status === 401 || upstream.status === 403 ? 502 : upstream.status;
      return res.status(status).json({
        error: upstream.status === 401 || upstream.status === 403
          ? "The odds provider rejected the API key or plan."
          : `The odds provider returned HTTP ${upstream.status}.`,
      });
    }

    const payload = await upstream.json();
    if (!Array.isArray(payload)) {
      return res.status(502).json({ error: "The odds provider returned an unexpected response." });
    }

    const matches = (payload as ApiEvent[])
      .map(normalizeEvent)
      .filter((match) => match.markets.length > 0)
      .sort((a, b) => Date.parse(a.commenceTime) - Date.parse(b.commenceTime));

    return res.status(200).json({
      provider: "The Odds API",
      sport,
      fetchedAt: new Date().toISOString(),
      remainingRequests: upstream.headers.get("x-requests-remaining"),
      matches,
    });
  } catch {
    return res.status(502).json({ error: "Could not reach the live odds provider." });
  }
}
