import { useEffect, useMemo, useState, type CSSProperties } from "react";

type GameKind = "crash" | "space" | "mines" | "plinko" | "dice" | "slots";
type Game = { slug: string; name: string; family: string; kind: GameKind; accent: string; description: string };
const GAMES: Game[] = [
  { slug: "aviator", name: "Aviator", family: "Crash", kind: "crash", accent: "#ff4b67", description: "Ride the flight and choose when to cash out." },
  { slug: "jetx", name: "JetX", family: "Crash", kind: "crash", accent: "#ff9d3d", description: "A fast-paced rocket multiplier experience." },
  { slug: "zeppelin", name: "Zeppelin", family: "Crash", kind: "crash", accent: "#5ad6ff", description: "Follow the flight path as the multiplier climbs." },
  { slug: "crash-rocket", name: "Crash Rocket", family: "Crash", kind: "crash", accent: "#b68aff", description: "Time your cashout before the flight ends." },
  { slug: "spaceman", name: "Spaceman", family: "Space", kind: "space", accent: "#73b7ff", description: "A cosmic multiplier challenge." },
  { slug: "limbo", name: "Limbo", family: "Instant multiplier", kind: "space", accent: "#c0a0ff", description: "Choose a target multiplier for an instant round." },
  { slug: "turbo-mines", name: "Turbo Mines", family: "Mines", kind: "mines", accent: "#65e8c2", description: "Reveal safe tiles and decide when to stop." },
  { slug: "mines", name: "Mines", family: "Mines", kind: "mines", accent: "#ffcc63", description: "A 5×5 strategy grid with hidden hazards." },
  { slug: "plinko", name: "Plinko", family: "Physics", kind: "plinko", accent: "#f58cff", description: "Drop a ball through the pegs into a multiplier slot." },
  { slug: "lucky-dice", name: "Lucky Dice", family: "Dice", kind: "dice", accent: "#ffcf69", description: "Predict the dice result and check the round." },
  { slug: "ludo-bet-turbo", name: "Ludo Bet Turbo", family: "Dice & board", kind: "dice", accent: "#ff7fa6", description: "A quick dice prediction game." },
  { slug: "sweet-bonanza", name: "Sweet Bonanza", family: "Cascade slots", kind: "slots", accent: "#ff8fbd", description: "Candy-colored cascade game layout." },
  { slug: "sugar-rush", name: "Sugar Rush", family: "Cascade slots", kind: "slots", accent: "#7de2ff", description: "Colorful symbols and cascading grid effects." },
  { slug: "gates-of-olympus", name: "Gates of Olympus", family: "Cascade slots", kind: "slots", accent: "#ffc36b", description: "A mythic-inspired multiplier grid." },
];

const EXCLUDED = ["Live Andar Bahar", "Dragon vs Tiger", "Teen Patti Gold"];
const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function usePath() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const pop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);
  const go = (next: string) => { window.history.pushState({}, "", next); setPath(next); window.scrollTo(0, 0); };
  return { path, go };
}

export default function GamesHub() {
  const { path, go } = usePath();
  const slug = path.match(/^\/games\/([^/]+)/)?.[1];
  const game = GAMES.find(g => g.slug === slug);
  const [filter, setFilter] = useState("All games");
  const visible = GAMES.filter(g => filter === "All games" || g.family === filter);
  return (
    <main className="vs-shell">
      <style>{styles}</style>
      <header className="vs-header">
        <button className="vs-brand" onClick={() => go("/games")} aria-label="Vivospin games home"><span className="vs-mark">V</span><span>VIVO<span className="vs-brand-light">SPIN</span></span></button>
        <div className="vs-header-right"><span className="vs-live-dot" /> NATIVE GAME STUDIO <a href="/" className="vs-back">Odds board ↗</a></div>
      </header>
      {game ? <GameScreen key={game.slug} game={game} go={go} /> : (
        <>
          <section className="vs-hero">
            <div className="vs-eyebrow"><span className="vs-live-dot" /> VIVOSPIN ORIGINALS · GAME LOUNGE</div>
            <h1>Pick your <span>next game.</span></h1>
            <p>Native game routes with a shared responsive interface. Choose a title to open its dedicated play screen.</p>
            <div className="vs-hero-foot"><span>14 GAME SCREENS</span><span>·</span><span>6 GAME ENGINES</span><span>·</span><span>MOBILE FIRST</span></div>
          </section>
          <nav className="vs-filters" aria-label="Filter games">
            {["All games", "Crash", "Space", "Mines", "Physics", "Dice", "Cascade slots"].map(item =>
              <button key={item} onClick={() => setFilter(item)} className={filter === item ? "active" : ""}>{item}</button>
            )}
          </nav>
          <section className="vs-grid">
            {visible.map((item, i) => <button className="vs-game-card" key={item.slug} onClick={() => go("/games/" + item.slug)} style={{ "--accent": item.accent } as CSSProperties}>
              <div className={"vs-art vs-art-" + item.kind}>
                <span className="vs-art-orbit orbit-one" /><span className="vs-art-orbit orbit-two" />
                {item.kind === "crash" && <div className="vs-rocket">➤</div>}
                {item.kind === "space" && <div className="vs-planet"><span /></div>}
                {item.kind === "mines" && <div className="vs-mini-grid">{Array.from({ length: 9 }, (_, j) => <i key={j}>{[1, 4, 7].includes(j) ? "✦" : ""}</i>)}</div>}
                {item.kind === "plinko" && <div className="vs-peg-art">{Array.from({ length: 18 }, (_, j) => <i key={j} />)}</div>}
                {item.kind === "dice" && <div className="vs-dice-art"><b>⚄</b><b>⚂</b></div>}
                {item.kind === "slots" && <div className="vs-slot-art"><b>✦</b><b>🍬</b><b>7</b><b>✿</b><b>◆</b><b>🍋</b></div>}
                <span className="vs-art-number">{String(i + 1).padStart(2, "0")}</span>
              </div>
              <div className="vs-card-info"><div><span className="vs-category">{item.family}</span><h2>{item.name}</h2><p>{item.description}</p></div><span className="vs-play">↗</span></div>
            </button>)}
          </section>
          <footer className="vs-footer">EXCLUDED / LEFT UNCHANGED: {EXCLUDED.join(" · ")}</footer>
        </>
      )}
    </main>
  );
}

function GameScreen({ game, go }: { game: Game; go: (path: string) => void }) {
  const [stake, setStake] = useState("10");
  const [mines, setMines] = useState(3);
  const [rows, setRows] = useState(12);
  const [risk, setRisk] = useState("Medium");
  const [target, setTarget] = useState("2.00");
  const [autoCashout, setAutoCashout] = useState("2.00");
  const [selected, setSelected] = useState<number[]>([]);
  const [roundState, setRoundState] = useState<"idle" | "sending" | "started">("idle");
  const [message, setMessage] = useState("Connect the server game endpoint to enable wallet-backed play.");
  const [balance, setBalance] = useState<number | null>(null);
  const [isPortrait, setIsPortrait] = useState(() => window.matchMedia("(orientation: portrait)").matches);
  useEffect(() => {
    const updateOrientation = () => setIsPortrait(window.matchMedia("(orientation: portrait)").matches);
    window.addEventListener("resize", updateOrientation);
    window.addEventListener("orientationchange", updateOrientation);
    const orientation = window.screen?.orientation;
    if (orientation && typeof orientation.lock === "function") orientation.lock("landscape").catch(() => {});
    return () => {
      window.removeEventListener("resize", updateOrientation);
      window.removeEventListener("orientationchange", updateOrientation);
      try { orientation?.unlock?.(); } catch {}
    };
  }, []);
  const [history, setHistory] = useState<string[]>(["1.42×", "2.16×", "1.08×", "4.75×", "1.31×"]);
  const stakeValue = Number(stake);
  const canSubmit = Number.isFinite(stakeValue) && stakeValue > 0 && roundState !== "sending";
  const isMines = game.kind === "mines";
  const isCrash = game.kind === "crash";
  const isSpace = game.kind === "space";
  const isPlinko = game.kind === "plinko";
  const isDice = game.kind === "dice";
  const isSlots = game.kind === "slots";
  const multiplier = useMemo(() => (1 + selected.length * 0.22).toFixed(2), [selected.length]);

  async function play(action: string) {
    if (!canSubmit) return;
    setRoundState("sending");
    setMessage("Sending request to the server…");
    try {
      const response = await fetch("/api/bets/place", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          gameId: game.slug,
          action,
          stake: stakeValue,
          currency: "BDT",
          options: { mines, rows, risk, targetMultiplier: Number(target), autoCashout: Number(autoCashout), selectedTiles: selected }
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "The server did not accept this game action.");
      if (typeof payload.balance === "number") setBalance(payload.balance);
      if (typeof payload.multiplier === "number") setHistory(old => [payload.multiplier.toFixed(2) + "×", ...old].slice(0, 8));
      setRoundState("started");
      setMessage(payload.message || "Server accepted the action. Displayed balance and result must come from the server response.");
    } catch (error) {
      setRoundState("idle");
      setMessage(error instanceof Error ? error.message : "Unable to reach the game server. No client-side payout was applied.");
    }
  }

  return <section className="vs-game-screen">
    <div className="vs-game-top"><button className="vs-crumb" onClick={() => go("/games")}>← All games</button><span className="vs-category">{game.family}</span></div>
    {isPortrait && <div className="vs-rotate-overlay" role="status" aria-live="polite">
      <div className="vs-rotate-card"><span className="vs-rotate-icon">↻</span><strong>Rotate your device</strong><p>Rotate your device to Landscape Mode for the best gaming experience.</p><span className="vs-rotate-hint">LANDSCAPE MODE RECOMMENDED</span></div>
    </div>}
    <div className={"vs-play-layout" + (isCrash ? " crash-layout" : "") + (isMines ? " mines-layout" : "") + (isSlots ? " slots-layout" : "")}>
      {isCrash && <aside className="vs-crash-stats">
        <div className="vs-side-label">ROUND STATUS</div><strong className="vs-stat-live"><i /> WAITING FOR SERVER ROUND</strong>
        <div className="vs-stat-row"><span>Auto cashout</span><b>{autoCashout}×</b></div>
        <div className="vs-side-label vs-side-history">RECENT ROUNDS</div>
        <div className="vs-crash-history">{history.slice(0, 6).map((item, i) => <b key={i} className={i === 0 ? "fresh" : ""}>{item}</b>)}</div>
        <div className="vs-side-label">BET SLOTS</div>
        <div className="vs-dual-bets vs-dual-bets-side"><button onClick={() => play("place-primary")} disabled={!canSubmit}>BET SLOT 1</button><button onClick={() => play("place-secondary")} disabled={!canSubmit}>BET SLOT 2</button></div>
        <p className="vs-side-note">Live round results appear only when supplied by the game server.</p>
      </aside>}
      <section className="vs-stage" style={{ "--accent": game.accent } as CSSProperties}>
        <div className="vs-stage-head"><div><span className="vs-category">VIVOSPIN GAME</span><h1>{game.name}</h1></div><span className="vs-stage-pill"><i /> SERVER-SETTLED</span></div>
        <div className={"vs-stage-art vs-stage-" + game.kind}>
          {isCrash && <><div className="vs-flight-line" /><div className="vs-flight-rocket">➤</div><div className="vs-multiplier">1.00<span>×</span></div><div className="vs-stage-caption">FLIGHT READY</div></>}
          {isSpace && <><div className="vs-space-stars">✦　·　✧　 ·　✦　　·　✧</div><div className="vs-space-planet" /><div className="vs-space-person">♙</div><div className="vs-multiplier">{target}<span>×</span></div><div className="vs-stage-caption">TARGET MULTIPLIER</div></>}
          {isMines && <div className="vs-tile-board">{Array.from({ length: 25 }, (_, i) => <button key={i} className={selected.includes(i) ? "picked" : ""} onClick={() => setSelected(old => old.includes(i) ? old.filter(n => n !== i) : [...old, i])} aria-label={"Select tile " + (i + 1)}>{selected.includes(i) ? "✦" : <span>＋</span>}</button>)}</div>}
          {isPlinko && <div className="vs-plinko-board">{Array.from({ length: rows }, (_, r) => <div key={r} className="vs-peg-row">{Array.from({ length: r + 3 }, (_, c) => <i key={c} />)}</div>)}<div className="vs-plinko-slots">{["0.5×", "0.8×", "1.2×", "2×", "5×", "2×", "1.2×", "0.8×", "0.5×"].map((v, i) => <span key={i}>{v}</span>)}</div></div>}
          {isDice && <div className="vs-dice-scene"><div className="vs-die">⚄</div><div className="vs-die die-two">⚂</div><p>MAKE YOUR PREDICTION</p></div>}
          {isSlots && <div className="vs-reel-grid">{Array.from({ length: 30 }, (_, i) => <div key={i} className={"vs-reel-symbol sym-" + (i % 6)}>{["✦", "🍬", "7", "✿", "◆", "🍋"][(i * 7 + Math.floor(i / 3)) % 6]}</div>)}</div>}
        </div>
        <div className="vs-history"><span>ROUND HISTORY</span><div>{history.map((item, i) => <b key={i} className={i === 0 ? "fresh" : ""}>{item}</b>)}</div></div>
      </section>
      <aside className="vs-controls">
        <div className="vs-control-heading"><h2>Place your bet</h2><span className="vs-wallet-label">WALLET</span></div>
        <label className="vs-field-label" htmlFor="vs-stake">Bet amount (BDT)</label>
        <div className="vs-stake-control"><input id="vs-stake" inputMode="decimal" value={stake} onChange={e => setStake(e.target.value)} /><div><button onClick={() => setStake(String(Math.max(1, stakeValue / 2)))}>½</button><button onClick={() => setStake(String(stakeValue * 2))}>2×</button></div></div>
        {isMines && <><label className="vs-field-label" htmlFor="vs-mines">Number of mines: {mines}</label><input className="vs-range" id="vs-mines" type="range" min="1" max="24" value={mines} onChange={e => setMines(Number(e.target.value))} /><p className="vs-helper">Tiles selected: {selected.length} · Display multiplier: {multiplier}× (preview only)</p></>}
        {isPlinko && <><label className="vs-field-label">Risk level</label><div className="vs-segment">{["Low", "Medium", "High"].map(x => <button className={risk === x ? "active" : ""} key={x} onClick={() => setRisk(x)}>{x}</button>)}</div><label className="vs-field-label" htmlFor="vs-rows">Pin rows: {rows}</label><input id="vs-rows" className="vs-range" type="range" min="8" max="16" value={rows} onChange={e => setRows(Number(e.target.value))} /></>}
        {isSpace && <><label className="vs-field-label" htmlFor="vs-target">Target multiplier</label><input className="vs-text-input" id="vs-target" type="number" min="1.01" step=".01" value={target} onChange={e => setTarget(e.target.value)} /></>}
        {isCrash && <><label className="vs-field-label" htmlFor="vs-auto">Auto cashout (×)</label><input className="vs-text-input" id="vs-auto" type="number" min="1.01" step=".01" value={autoCashout} onChange={e => setAutoCashout(e.target.value)} /><label className="vs-check"><input type="checkbox" defaultChecked /> Enable auto cashout</label></>}
        {isDice && <><label className="vs-field-label">Prediction</label><div className="vs-segment">{["Under 7", "Exactly 7", "Over 7"].map(x => <button key={x} onClick={() => setTarget(x)} className={target === x ? "active" : ""}>{x}</button>)}</div></>}
        {isSlots && <><label className="vs-field-label">Spin settings</label><div className="vs-segment"><button className="active">Single spin</button><button onClick={() => setMessage("Auto-spin requires server-side limits and stop conditions before it can be enabled.")}>Auto-spin</button></div></>}
        {!isCrash && <button className="vs-primary" disabled={!canSubmit} onClick={() => play(isMines ? "start-round" : isPlinko ? "drop-ball" : isDice ? "roll-dice" : isSlots ? "spin" : "play-round")}>{roundState === "sending" ? "CONNECTING…" : isMines ? "START ROUND" : isPlinko ? "DROP BALL" : isDice ? "ROLL DICE" : isSlots ? "SPIN" : "PLAY ROUND"}</button>}
        <button className="vs-secondary" disabled={!canSubmit} onClick={() => play("cashout")}>CASH OUT / COLLECT</button>
        <div className="vs-message" role="status">{message}</div>
        <div className="vs-balance"><span>Server balance</span><strong>{balance === null ? "—" : "৳" + fmt(balance)}</strong></div>
        <p className="vs-safety-note">No browser-generated win or payout is trusted. Bet actions require a compatible server endpoint, authenticated session, and server-side wallet settlement.</p>
      </aside>
    </div>
  </section>;
}

const styles = `
/* Local system-font stack: no external font or game-service requests. */
.vs-shell{min-height:100vh;background:#080c12;color:#edf2fb;font-family:Manrope,system-ui,sans-serif;padding:0 clamp(16px,4vw,56px) 38px;box-sizing:border-box}.vs-shell *{box-sizing:border-box}.vs-header{height:74px;border-bottom:1px solid #202835;display:flex;align-items:center;justify-content:space-between;gap:16px}.vs-brand{display:flex;align-items:center;gap:10px;border:0;background:none;color:#f4f7fc;font-weight:800;letter-spacing:.12em;font-size:15px;cursor:pointer}.vs-brand-light{color:#66e3c4}.vs-mark{display:grid;place-items:center;background:#67e6c5;color:#08120f;width:30px;height:30px;border-radius:9px;font-weight:900;font-size:18px}.vs-header-right{display:flex;align-items:center;gap:9px;color:#8e9aaa;font:10px 'DM Mono',monospace;letter-spacing:.08em}.vs-live-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#66e6c5;box-shadow:0 0 12px #66e6c577}.vs-back{color:#c2ccda;text-decoration:none;border:1px solid #2a3442;padding:8px 10px;border-radius:9px;margin-left:8px;font:11px Manrope,sans-serif;letter-spacing:0}.vs-hero{padding:clamp(36px,7vw,78px) 0 30px;max-width:760px}.vs-eyebrow,.vs-category{font:10px 'DM Mono',monospace;letter-spacing:.13em;color:#8e9aaa;text-transform:uppercase}.vs-eyebrow{display:flex;align-items:center;gap:9px}.vs-hero h1{font-size:clamp(38px,7vw,68px);line-height:1.02;letter-spacing:-.06em;margin:18px 0 12px;font-weight:800}.vs-hero h1 span{color:#69e5c6}.vs-hero p{color:#9da9b9;font-size:14px;line-height:1.8;max-width:520px;margin:0}.vs-hero-foot{display:flex;gap:12px;align-items:center;margin-top:24px;color:#718092;font:10px 'DM Mono',monospace;letter-spacing:.1em}.vs-filters{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 22px}.vs-filters button,.vs-segment button{border:1px solid #273140;background:#101721;color:#aeb8c7;border-radius:10px;padding:10px 14px;font:11px Manrope,sans-serif;cursor:pointer}.vs-filters button.active,.vs-segment button.active{background:#17352f;border-color:#397f6c;color:#83f2d2}.vs-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.vs-game-card{text-align:left;min-width:0;border:1px solid #202b38;background:#0d131c;color:inherit;padding:0;border-radius:15px;overflow:hidden;cursor:pointer;transition:transform .18s,border-color .18s}.vs-game-card:hover{transform:translateY(-3px);border-color:#47566a}.vs-art{height:150px;position:relative;overflow:hidden;display:grid;place-items:center;background:radial-gradient(ellipse at 50% 80%,color-mix(in srgb,var(--accent) 20%,transparent),transparent 60%),linear-gradient(140deg,#111a27,#0b1018)}.vs-art:before{content:'';position:absolute;inset:0;background-image:linear-gradient(#9eafc30a 1px,transparent 1px),linear-gradient(90deg,#9eafc30a 1px,transparent 1px);background-size:22px 22px;mask-image:linear-gradient(transparent,#000)}.vs-art-orbit{position:absolute;border:1px solid color-mix(in srgb,var(--accent) 45%,transparent);border-radius:50%;width:130px;height:130px;transform:rotate(-28deg) scaleY(.42)}.orbit-two{width:180px;height:180px;transform:rotate(32deg) scaleY(.36);opacity:.45}.vs-rocket{font-size:45px;color:var(--accent);text-shadow:0 0 28px var(--accent);transform:rotate(-35deg);z-index:1}.vs-planet{width:82px;height:82px;border-radius:50%;background:radial-gradient(circle at 30% 25%,#e1d5ff,var(--accent) 30%,#20204a 72%);box-shadow:0 0 35px color-mix(in srgb,var(--accent) 55%,transparent);z-index:1}.vs-planet span{position:absolute;border:2px solid #ffffff88;width:112px;height:30px;border-radius:50%;transform:rotate(-25deg);left:calc(50% - 56px);top:calc(50% - 15px)}.vs-mini-grid{display:grid;grid-template-columns:repeat(3,26px);gap:4px;transform:rotate(-7deg);z-index:1}.vs-mini-grid i{height:26px;border:1px solid #65e8c266;background:#162a2a;border-radius:5px;display:grid;place-items:center;color:#65e8c2}.vs-peg-art{display:flex;gap:6px;flex-wrap:wrap;width:112px;justify-content:center;z-index:1}.vs-peg-art i{width:5px;height:5px;border-radius:50%;background:var(--accent);box-shadow:0 0 7px var(--accent)}.vs-dice-art{display:flex;gap:10px;z-index:1;transform:rotate(-8deg)}.vs-dice-art b{font-size:38px;background:#182334;border:1px solid #ffffff26;border-radius:9px;padding:8px;color:var(--accent);box-shadow:0 8px 25px #0008}.vs-slot-art{display:grid;grid-template-columns:repeat(3,34px);gap:4px;transform:rotate(-5deg);z-index:1}.vs-slot-art b{height:37px;display:grid;place-items:center;background:#202a39;border:1px solid color-mix(in srgb,var(--accent) 45%,transparent);border-radius:5px;color:var(--accent);font-size:19px}.vs-art-number{position:absolute;right:12px;top:10px;color:#738093;font:10px 'DM Mono',monospace}.vs-card-info{padding:14px;display:flex;justify-content:space-between;gap:10px;align-items:center}.vs-card-info h2{font-size:16px;letter-spacing:-.03em;margin:5px 0 5px}.vs-card-info p{font-size:11px;line-height:1.6;color:#8491a2;margin:0}.vs-play{display:grid;place-items:center;flex-shrink:0;width:30px;height:30px;border-radius:9px;border:1px solid #2d3b4b;color:#b5c4d5}.vs-footer{border-top:1px solid #1c2632;margin-top:30px;padding-top:16px;color:#647183;font:10px 'DM Mono',monospace;letter-spacing:.07em}.vs-game-screen{padding:24px 0}.vs-game-top{display:flex;align-items:center;gap:15px;margin-bottom:18px}.vs-crumb{border:0;background:none;color:#a5b1c1;cursor:pointer;font:12px Manrope,sans-serif;padding:8px 0}.vs-play-layout{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(280px,.8fr);gap:16px}.vs-stage,.vs-controls{border:1px solid #202b38;background:#0d131c;border-radius:16px;overflow:hidden;min-width:0}.vs-stage{padding:clamp(14px,2.5vw,24px)}.vs-stage-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.vs-stage-head h1{font-size:clamp(22px,3vw,32px);margin:6px 0 0;letter-spacing:-.05em}.vs-stage-pill{display:flex;align-items:center;gap:6px;border:1px solid #275448;border-radius:20px;padding:7px 9px;color:#7fe9c8;font:9px 'DM Mono',monospace;white-space:nowrap}.vs-stage-pill i{width:5px;height:5px;border-radius:50%;background:#65e8c2}.vs-stage-art{height:clamp(290px,45vw,490px);margin-top:18px;border:1px solid #202c3b;border-radius:13px;position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center;background:radial-gradient(ellipse at 50% 55%,color-mix(in srgb,var(--accent) 14%,transparent),transparent 55%),#090f17}.vs-stage-art:before{content:'';position:absolute;inset:0;background-image:linear-gradient(#8ca0b70a 1px,transparent 1px),linear-gradient(90deg,#8ca0b70a 1px,transparent 1px);background-size:28px 28px}.vs-flight-line{position:absolute;width:110%;height:70%;border-top:3px solid var(--accent);border-radius:50%;transform:rotate(-24deg) translateY(65px);filter:drop-shadow(0 0 9px var(--accent));opacity:.8;left:-5%;top:40%}.vs-flight-rocket{position:absolute;left:58%;top:34%;font-size:32px;transform:rotate(-35deg);color:var(--accent);filter:drop-shadow(0 0 13px var(--accent));animation:vs-float 2.2s ease-in-out infinite}.vs-multiplier{position:relative;z-index:1;font:800 clamp(48px,8vw,84px) 'DM Mono',monospace;letter-spacing:-.08em;text-shadow:0 0 25px color-mix(in srgb,var(--accent) 25%,transparent)}.vs-multiplier span{font-size:.5em;color:var(--accent);margin-left:5px}.vs-stage-caption{position:absolute;bottom:22px;color:#718093;font:10px 'DM Mono',monospace;letter-spacing:.15em}.vs-space-stars{position:absolute;inset:20px;color:#9eafff;font-size:24px;letter-spacing:10px;opacity:.5}.vs-space-planet{position:absolute;width:150px;height:150px;border-radius:50%;background:radial-gradient(circle at 30% 25%,#e7dbff,var(--accent) 28%,#211c52 72%);box-shadow:0 0 60px color-mix(in srgb,var(--accent) 45%,transparent)}.vs-space-person{position:absolute;right:23%;top:25%;font-size:64px;color:#f1f6ff;text-shadow:0 0 24px var(--accent);animation:vs-float 3s infinite}.vs-tile-board{z-index:1;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:clamp(4px,1vw,9px);width:min(100%,440px);padding:10px}.vs-tile-board button{aspect-ratio:1;border:1px solid #344656;border-radius:9px;background:linear-gradient(145deg,#1a2b3a,#111c28);color:#8debd0;font-size:20px;cursor:pointer;box-shadow:inset 0 1px #ffffff0a,0 3px 0 #080c11}.vs-tile-board button.picked{background:linear-gradient(145deg,#174d45,#18352f);border-color:#60d9b8;box-shadow:0 0 15px #65e8c233}.vs-tile-board button span{color:#506174}.vs-plinko-board{z-index:1;width:100%;padding:10px 8px 18px;display:flex;flex-direction:column;align-items:center;gap:7px;overflow:hidden}.vs-peg-row{display:flex;justify-content:center;gap:clamp(7px,1.5vw,16px)}.vs-peg-row i{width:5px;height:5px;border-radius:50%;background:#a6b7ce;box-shadow:0 0 6px #9ebfff55}.vs-plinko-slots{display:flex;gap:2px;width:100%;justify-content:center;margin-top:8px}.vs-plinko-slots span{flex:1;text-align:center;background:#2a2140;border:1px solid #65508d;border-radius:3px;padding:5px 0;color:#e5baff;font:8px 'DM Mono',monospace}.vs-dice-scene{z-index:1;text-align:center}.vs-die{display:inline-grid;place-items:center;width:95px;height:95px;background:linear-gradient(145deg,#fff,#b8c8dc);border-radius:18px;color:#172233;font-size:55px;margin:10px;box-shadow:0 15px 25px #0007;transform:rotate(-10deg)}.die-two{transform:rotate(9deg) translateY(15px);background:linear-gradient(145deg,#fff0dc,#d2a97e)}.vs-dice-scene p{color:#8190a2;font:10px 'DM Mono',monospace;letter-spacing:.15em;margin-top:30px}.vs-reel-grid{z-index:1;width:min(100%,470px);display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:5px;padding:12px}.vs-reel-symbol{aspect-ratio:1;display:grid;place-items:center;border-radius:8px;background:linear-gradient(145deg,#29364a,#141e2d);border:1px solid #435067;font-size:clamp(17px,3vw,28px);box-shadow:inset 0 1px #ffffff18}.sym-1,.sym-4{background:linear-gradient(145deg,#48304b,#21192e)}.sym-2{color:#ffe28a}.vs-history{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-top:18px}.vs-history>span{color:#718093;font:9px 'DM Mono',monospace;letter-spacing:.12em;padding-top:8px;white-space:nowrap}.vs-history>div{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:6px}.vs-history b{background:#1b2733;border:1px solid #2a3948;border-radius:7px;padding:6px 8px;color:#aebccd;font:10px 'DM Mono',monospace}.vs-history b.fresh{color:#82edcb;border-color:#316d5e}.vs-controls{padding:20px;height:fit-content}.vs-control-heading{display:flex;justify-content:space-between;align-items:center;margin-bottom:22px}.vs-control-heading h2{margin:0;font-size:17px;letter-spacing:-.04em}.vs-wallet-label{font:9px 'DM Mono',monospace;color:#7c8b9c;letter-spacing:.1em}.vs-field-label{display:block;color:#aab6c6;font-size:11px;margin:16px 0 8px}.vs-stake-control{display:flex;align-items:center;gap:6px;border:1px solid #2b3746;border-radius:10px;background:#090f17;padding:5px}.vs-stake-control input,.vs-text-input{width:100%;min-width:0;border:0;outline:0;background:transparent;color:#f3f6fc;padding:9px;font:15px 'DM Mono',monospace}.vs-stake-control div{display:flex;gap:4px}.vs-stake-control button{border:1px solid #303d4e;background:#17212d;color:#b9c5d4;padding:7px 9px;border-radius:7px;cursor:pointer}.vs-text-input{border:1px solid #2b3746;border-radius:9px;background:#090f17}.vs-range{width:100%;accent-color:#65e8c2}.vs-helper{font-size:10px;line-height:1.6;color:#78899b}.vs-check{display:flex;align-items:center;gap:8px;color:#9eabba;font-size:11px;margin:14px 0}.vs-check input{accent-color:#65e8c2}.vs-segment{display:flex;gap:5px}.vs-segment button{flex:1;padding:9px 4px;font-size:10px}.vs-primary,.vs-secondary,.vs-dual-bets button{width:100%;border:0;border-radius:10px;padding:14px 12px;font:800 11px Manrope,sans-serif;letter-spacing:.08em;cursor:pointer}.vs-primary,.vs-dual-bets button{background:#65e8c2;color:#07120f;margin-top:20px}.vs-primary:disabled,.vs-secondary:disabled{opacity:.5;cursor:not-allowed}.vs-secondary{background:#1a2532;color:#d0d9e5;border:1px solid #303e4e;margin-top:8px}.vs-dual-bets{display:grid;grid-template-columns:1fr 1fr;gap:8px}.vs-dual-bets button{padding:12px 4px;font-size:10px}.vs-dual-bets button+button{background:#ff9a61}.vs-message{margin-top:14px;border:1px solid #293747;background:#111a25;border-radius:9px;padding:10px;color:#94a4b7;font-size:10px;line-height:1.6;overflow-wrap:anywhere}.vs-balance{display:flex;justify-content:space-between;align-items:center;border-top:1px solid #27313f;margin-top:16px;padding-top:15px;color:#91a0b2;font-size:11px}.vs-balance strong{font:600 14px 'DM Mono',monospace;color:#7ceacb}.vs-safety-note{font-size:9px;line-height:1.7;color:#687789;margin:13px 0 0}.vs-shell button:focus-visible,.vs-shell input:focus-visible{outline:2px solid #65e8c2;outline-offset:2px}@keyframes vs-float{0%,100%{transform:translateY(0) rotate(-35deg)}50%{transform:translateY(-9px) rotate(-35deg)}}@media(max-width:1050px){.vs-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.vs-play-layout{grid-template-columns:minmax(0,1.35fr) minmax(265px,.8fr)}}@media(max-width:760px){.vs-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.vs-art{height:125px}.vs-card-info{padding:11px}.vs-card-info h2{font-size:14px}.vs-card-info p{font-size:10px}.vs-play-layout{grid-template-columns:1fr}.vs-stage-art{height:360px}.vs-header-right{font-size:8px}.vs-back{padding:7px}.vs-stage-head h1{font-size:26px}}@media(max-width:420px){.vs-grid{grid-template-columns:1fr 1fr}.vs-art{height:112px}.vs-card-info{padding:9px}.vs-play{width:25px;height:25px}.vs-header-right{letter-spacing:0}.vs-hero-foot{font-size:8px;gap:7px}.vs-stage-pill{font-size:8px}.vs-stage-art{height:300px}.vs-tile-board{gap:4px;padding:3px}.vs-tile-board button{border-radius:6px}.vs-history{display:block}.vs-history>div{justify-content:flex-start;margin-top:8px}}
.vs-rotate-overlay{display:none}
@media (orientation:portrait) and (max-width:900px){.vs-rotate-overlay{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:24px;background:rgba(5,9,15,.97);backdrop-filter:blur(14px)}.vs-rotate-card{width:min(100%,360px);padding:28px 24px;text-align:center;border:1px solid #304153;border-radius:20px;background:#101923;box-shadow:0 20px 70px #0009}.vs-rotate-icon{display:block;font-size:48px;color:#65e8c2;line-height:1.2;transform:rotate(-90deg);margin-bottom:16px}.vs-rotate-card strong{display:block;font-size:22px;letter-spacing:-.04em}.vs-rotate-card p{color:#a7b4c4;font-size:13px;line-height:1.7}.vs-rotate-hint{display:inline-block;margin-top:8px;color:#65e8c2;font:9px "DM Mono",monospace;letter-spacing:.12em}}
@media (orientation:landscape) and (max-width:900px){.vs-shell{padding:0 12px 12px}.vs-header{height:48px}.vs-game-screen{padding:10px 0}.vs-game-top{margin-bottom:8px}.vs-play-layout{grid-template-columns:minmax(0,1fr) minmax(205px,29vw);gap:10px;align-items:stretch}.vs-stage{padding:10px}.vs-stage-head h1{font-size:20px}.vs-stage-art{height:calc(100dvh - 190px);min-height:190px;max-height:420px;margin-top:8px}.vs-history{margin-top:8px}.vs-controls{padding:12px}.vs-control-heading{margin-bottom:10px}.vs-field-label{margin:9px 0 5px}.vs-primary,.vs-secondary,.vs-dual-bets button{margin-top:10px;padding:12px 8px;min-height:44px}.vs-tile-board{width:min(100%,min(54vh,430px));gap:5px;padding:5px}.vs-tile-board button{font-size:16px}.vs-reel-grid{width:min(100%,min(72vh,570px));gap:4px;padding:6px}.vs-reel-symbol{font-size:clamp(15px,3vh,24px);border-radius:6px}}
@media (orientation:landscape) and (max-height:520px){.vs-stage-art{height:calc(100dvh - 160px);min-height:150px}.vs-controls{padding:8px}.vs-control-heading h2{font-size:14px}.vs-field-label{font-size:10px}.vs-safety-note{display:none}.vs-message{padding:7px;margin-top:7px}}
@media (orientation:landscape) and (max-width:900px){
.vs-crash-stats{display:block;border:1px solid #202b38;border-radius:12px;background:#0d131c;padding:12px;min-width:0}
.vs-play-layout.crash-layout{grid-template-columns:minmax(135px,.58fr) minmax(0,1.5fr) minmax(190px,.78fr)}
.vs-crash-stats .vs-side-label{display:block;color:#718093;font:8px "DM Mono",monospace;letter-spacing:.1em;margin:4px 0 10px}
.vs-stat-live{display:block;color:#d6e0ec;font:700 10px "DM Mono",monospace;margin-bottom:18px;overflow-wrap:anywhere}.vs-stat-live i{display:inline-block;width:7px;height:7px;background:#e7bd62;border-radius:50%;margin-right:5px}
.vs-stat-row{display:flex;justify-content:space-between;gap:6px;margin:10px 0;color:#8493a5;font-size:9px}.vs-stat-row b{color:#d6e0ec;font-family:"DM Mono",monospace}
.vs-side-history{margin-top:20px!important}.vs-crash-history{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:18px}.vs-crash-history b{padding:4px 5px;background:#1b2733;border-radius:5px;color:#aebccd;font:8px "DM Mono",monospace}.vs-crash-history b.fresh{color:#82edcb;border:1px solid #316d5e}
.vs-dual-bets-side{display:grid;grid-template-columns:1fr;gap:5px}.vs-dual-bets-side button{margin:0;min-height:44px}.vs-dual-bets-side button+button{background:#ff9a61}.vs-side-note{font-size:9px;color:#687789;line-height:1.6}
.vs-play-layout.mines-layout{grid-template-columns:minmax(0,1fr) minmax(210px,29vw)}.vs-mines-cashout{min-height:58px;font-size:13px;letter-spacing:.1em;background:#65e8c2;color:#07120f;border:0}
.vs-play-layout.slots-layout{grid-template-columns:minmax(205px,27vw) minmax(0,1fr)}.vs-play-layout.slots-layout .vs-controls{order:0}.vs-play-layout.slots-layout .vs-stage{order:1}.vs-play-layout.slots-layout .vs-reel-grid{width:min(100%,min(72vh,570px))}
}
@media (orientation:landscape) and (max-width:620px){.vs-play-layout.crash-layout{grid-template-columns:105px minmax(0,1fr) 175px}.vs-crash-stats{padding:8px}.vs-play-layout.mines-layout{grid-template-columns:minmax(0,1fr) 190px}.vs-play-layout.slots-layout{grid-template-columns:175px minmax(0,1fr)}}
`;
