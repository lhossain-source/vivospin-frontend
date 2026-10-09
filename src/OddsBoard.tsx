import { useCallback, useEffect, useState } from "react";
import "./odds-board.css";

type Outcome = "1" | "X" | "2" | "OVER" | "UNDER";
type MarketType = "1X2" | "OVER_UNDER";
type SportKey =
  | "soccer_epl"
  | "soccer_uefa_champs_league"
  | "soccer_spain_la_liga"
  | "soccer_germany_bundesliga"
  | "soccer_italy_serie_a"
  | "soccer_france_ligue_one";

interface OddsOption {
  outcome: Outcome;
  label: string;
  odds: number;
}

interface OddsMarket {
  id: string;
  type: MarketType;
  title: string;
  options: OddsOption[];
}

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  startTime: string;
  commenceTime: string;
  lastUpdated: string | null;
  markets: OddsMarket[];
}

interface OddsResponse {
  provider: string;
  sport: string;
  fetchedAt: string;
  remainingRequests: string | null;
  matches: Match[];
}

export interface BetSelection {
  id: string;
  matchId: string;
  matchName: string;
  marketId: string;
  marketType: MarketType;
  marketTitle: string;
  outcome: Outcome;
  outcomeLabel: string;
  odds: number;
}

const SPORTS: { value: SportKey; label: string }[] = [
  { value: "soccer_epl", label: "Premier League" },
  { value: "soccer_uefa_champs_league", label: "Champions League" },
  { value: "soccer_spain_la_liga", label: "La Liga" },
  { value: "soccer_germany_bundesliga", label: "Bundesliga" },
  { value: "soccer_italy_serie_a", label: "Serie A" },
  { value: "soccer_france_ligue_one", label: "Ligue 1" },
];

const selectionId = (matchId: string, marketId: string, outcome: Outcome) =>
  `${matchId}:${marketId}:${outcome}`;

const marketKey = (matchId: string, marketId: string) =>
  `${matchId}:${marketId}`;

function formatKickoff(isoTime: string) {
  const date = new Date(isoTime);
  return Number.isNaN(date.getTime())
    ? "Time TBA"
    : new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(date);
}

function OddsButton({
  label,
  odds,
  active,
  onClick,
}: {
  label: string;
  odds: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`odds-button ${active ? "is-active" : ""}`}
      aria-pressed={active}
      onClick={onClick}
    >
      <span>{label}</span>
      <strong>{odds.toFixed(2)}</strong>
    </button>
  );
}

function MatchCard({
  match,
  selections,
  onSelect,
}: {
  match: Match;
  selections: BetSelection[];
  onSelect: (selection: BetSelection) => void;
}) {
  const selectedIds = new Set(selections.map((selection) => selection.id));

  return (
    <article className="match-card">
      <header className="match-header">
        <div>
          <span className="league-name">{match.league}</span>
          <h3>{match.homeTeam} <span>vs</span> {match.awayTeam}</h3>
        </div>
        <time dateTime={match.commenceTime}>{formatKickoff(match.commenceTime)}</time>
      </header>

      {match.markets.map((market) => (
        <section className="market" key={market.id}>
          <h4>{market.title}</h4>
          <div className={market.type === "1X2" ? "odds-grid odds-grid-1x2" : "odds-grid odds-grid-ou"}>
            {market.options.map((option) => {
              const id = selectionId(match.id, market.id, option.outcome);
              return (
                <OddsButton
                  key={id}
                  label={option.label}
                  odds={option.odds}
                  active={selectedIds.has(id)}
                  onClick={() =>
                    onSelect({
                      id,
                      matchId: match.id,
                      matchName: `${match.homeTeam} vs ${match.awayTeam}`,
                      marketId: market.id,
                      marketType: market.type,
                      marketTitle: market.title,
                      outcome: option.outcome,
                      outcomeLabel: option.label,
                      odds: option.odds,
                    })
                  }
                />
              );
            })}
          </div>
        </section>
      ))}
      {match.lastUpdated && (
        <p className="odds-updated">Bookmaker odds updated: {new Date(match.lastUpdated).toLocaleTimeString()}</p>
      )}
    </article>
  );
}

function BetSlip({
  selections,
  onRemove,
  onClear,
}: {
  selections: BetSelection[];
  onRemove: (id: string) => void;
  onClear: () => void;
}) {
  const [stake, setStake] = useState("100");
  const stakeValue = Number(stake);
  const validStake = stake.trim() !== "" && Number.isFinite(stakeValue) && stakeValue > 0;
  const combinedOdds = selections.reduce((total, item) => total * item.odds, 1);
  const potentialReturn = selections.length && validStake ? combinedOdds * stakeValue : 0;

  return (
    <aside className="bet-slip">
      <header className="slip-header">
        <h2>Bet Slip</h2>
        <span className="selection-count">{selections.length}</span>
        {selections.length > 0 && (
          <button type="button" className="text-button" onClick={onClear}>Clear all</button>
        )}
      </header>

      {selections.length === 0 ? (
        <p className="empty-slip">Select live odds from a match to see them here.</p>
      ) : (
        <>
          <div className="slip-selections">
            {selections.map((selection) => (
              <div className="slip-selection" key={selection.id}>
                <div className="slip-selection-details">
                  <strong>{selection.matchName}</strong>
                  <span>{selection.marketTitle}</span>
                  <span>Selected: {selection.outcomeLabel}</span>
                </div>
                <div className="slip-selection-action">
                  <strong>{selection.odds.toFixed(2)}</strong>
                  <button
                    type="button"
                    aria-label={`Remove ${selection.outcomeLabel} from ${selection.matchName}`}
                    onClick={() => onRemove(selection.id)}
                  >×</button>
                </div>
              </div>
            ))}
          </div>
          <div className="slip-summary">
            <label htmlFor="stake">Demo stake</label>
            <input id="stake" type="number" min="0.01" step="any" value={stake}
              onChange={(event) => setStake(event.target.value)} />
            <div className="summary-row"><span>Combined odds</span><strong>{combinedOdds.toFixed(2)}</strong></div>
            <div className="summary-row"><span>Illustrative return</span><strong>{potentialReturn.toFixed(2)}</strong></div>
            <p className="demo-note">Display-only estimate. No wager is submitted, and selected odds may change at the provider.</p>
          </div>
        </>
      )}
    </aside>
  );
}

export default function OddsBoard() {
  const [sport, setSport] = useState<SportKey>("soccer_epl");
  const [matches, setMatches] = useState<Match[]>([]);
  const [selections, setSelections] = useState<BetSelection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [remainingRequests, setRemainingRequests] = useState<string | null>(null);

  const loadOdds = useCallback(async (signal?: AbortSignal) => {
    try {
      setError("");
      const response = await fetch(`/api/odds?sport=${encodeURIComponent(sport)}`, {
        headers: { Accept: "application/json" },
        signal,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || `Could not load odds (HTTP ${response.status}).`);
      const data = payload as OddsResponse;
      setMatches(data.matches);
      setFetchedAt(data.fetchedAt);
      setRemainingRequests(data.remainingRequests);

      // Refresh the displayed price for selections that still exist in the latest feed.
      const latestById = new Map<string, { odds: number; label: string; marketTitle: string }>();
      for (const match of data.matches) {
        for (const market of match.markets) {
          for (const option of market.options) {
            latestById.set(selectionId(match.id, market.id, option.outcome), {
              odds: option.odds,
              label: option.label,
              marketTitle: market.title,
            });
          }
        }
      }
      setSelections((current) => current.map((selection) => {
        const latest = latestById.get(selection.id);
        return latest
          ? { ...selection, odds: latest.odds, outcomeLabel: latest.label, marketTitle: latest.marketTitle }
          : selection;
      }));
    } catch (cause) {
      if (cause instanceof Error && cause.name === "AbortError") return;
      setError(cause instanceof Error ? cause.message : "Unexpected error while loading odds.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [sport]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    void loadOdds(controller.signal);
    const interval = window.setInterval(() => void loadOdds(), 60_000);
    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [loadOdds]);

  function handleSelect(next: BetSelection) {
    setSelections((current) => {
      if (current.some((item) => item.id === next.id)) {
        return current.filter((item) => item.id !== next.id);
      }
      const key = marketKey(next.matchId, next.marketId);
      return [
        ...current.filter((item) => marketKey(item.matchId, item.marketId) !== key),
        next,
      ];
    });
  }

  return (
    <main className="odds-board">
      <section className="matches-column">
        <div className="odds-board-title">
          <div>
            <h1>Live Football Odds</h1>
            <p className="odds-subtitle">Source: The Odds API · Decimal odds</p>
          </div>
          <label className="sport-select-label">
            <span>Competition</span>
            <select value={sport} onChange={(event) => setSport(event.target.value as SportKey)}>
              {SPORTS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
        </div>

        <div className="live-status" role="status">
          <span className={loading ? "status-dot is-loading" : error ? "status-dot is-error" : "status-dot"} />
          {loading ? "Loading live odds…" : error ? error : `${matches.length} matches · refreshed every 60 seconds`}
          {fetchedAt && !loading && <span className="last-fetched">Fetched {new Date(fetchedAt).toLocaleTimeString()}</span>}
          {remainingRequests && <span className="last-fetched">API requests left: {remainingRequests}</span>}
        </div>

        <div className="market-legend"><span>1 = Home</span><span>X = Draw</span><span>2 = Away</span></div>
        {error && matches.length === 0 && (
          <div className="odds-message">
            <strong>Live odds unavailable</strong>
            <p>{error}</p>
            <button type="button" className="text-button" onClick={() => { setLoading(true); void loadOdds(); }}>Try again</button>
          </div>
        )}
        {!error && !loading && matches.length === 0 && (
          <div className="odds-message">No matches with supported odds markets were returned for this competition right now.</div>
        )}
        {matches.map((match) => (
          <MatchCard key={match.id} match={match} selections={selections} onSelect={handleSelect} />
        ))}
      </section>
      <BetSlip
        selections={selections}
        onRemove={(id) => setSelections((current) => current.filter((item) => item.id !== id))}
        onClear={() => setSelections([])}
      />
    </main>
  );
}
