import { useState } from "react";
import "./odds-board.css";

type Outcome = "1" | "X" | "2" | "OVER" | "UNDER";
type MarketType = "1X2" | "OVER_UNDER";

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
  markets: OddsMarket[];
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

const demoMatches: Match[] = [
  {
    id: "match-101",
    homeTeam: "Arsenal",
    awayTeam: "Chelsea",
    league: "Premier League",
    startTime: "20:00",
    markets: [
      {
        id: "1x2",
        type: "1X2",
        title: "Match Result",
        options: [
          { outcome: "1", label: "1", odds: 2.1 },
          { outcome: "X", label: "X", odds: 3.4 },
          { outcome: "2", label: "2", odds: 3.2 },
        ],
      },
      {
        id: "ou-2.5",
        type: "OVER_UNDER",
        title: "Over/Under 2.5",
        options: [
          { outcome: "OVER", label: "Over 2.5", odds: 1.85 },
          { outcome: "UNDER", label: "Under 2.5", odds: 1.95 },
        ],
      },
    ],
  },
  {
    id: "match-102",
    homeTeam: "Liverpool",
    awayTeam: "Tottenham",
    league: "Premier League",
    startTime: "22:30",
    markets: [
      {
        id: "1x2",
        type: "1X2",
        title: "Match Result",
        options: [
          { outcome: "1", label: "1", odds: 1.75 },
          { outcome: "X", label: "X", odds: 3.8 },
          { outcome: "2", label: "2", odds: 4.1 },
        ],
      },
      {
        id: "ou-2.5",
        type: "OVER_UNDER",
        title: "Over/Under 2.5",
        options: [
          { outcome: "OVER", label: "Over 2.5", odds: 1.7 },
          { outcome: "UNDER", label: "Under 2.5", odds: 2.1 },
        ],
      },
    ],
  },
];

const selectionId = (matchId: string, marketId: string, outcome: Outcome) =>
  `${matchId}:${marketId}:${outcome}`;

const marketKey = (matchId: string, marketId: string) =>
  `${matchId}:${marketId}`;

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
        <time>{match.startTime}</time>
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
        <p className="empty-slip">Select odds from a match to see them here.</p>
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
            <p className="demo-note">UI demonstration only. No wager is submitted.</p>
          </div>
        </>
      )}
    </aside>
  );
}

export default function OddsBoard() {
  const [selections, setSelections] = useState<BetSelection[]>([]);

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
        <h1>Football Markets</h1>
        <div className="market-legend"><span>1 = Home</span><span>X = Draw</span><span>2 = Away</span></div>
        {demoMatches.map((match) => (
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
