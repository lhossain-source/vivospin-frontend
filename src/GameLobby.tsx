import "./game-lobby.css";

type Game = {
  name: string;
  subtitle: string;
  tag?: "HOT" | "TOP" | "NEW";
  theme: string;
  art: "cards" | "mines" | "dragon" | "patti" | "rocket" | "ludo" | "star";
};

const games: Game[] = [
  { name: "Live Andar Bahar", subtitle: "LIVE TABLE", tag: "HOT", theme: "andar", art: "cards" },
  { name: "Andar Bahar Classic", subtitle: "CLASSIC CARD GAME", theme: "classic", art: "cards" },
  { name: "Mines", subtitle: "FIND THE DIAMONDS", tag: "HOT", theme: "mines", art: "mines" },
  { name: "Dragon vs Tiger", subtitle: "LIVE SHOWDOWN", tag: "TOP", theme: "dragon", art: "dragon" },
  { name: "Teen Patti 3D", subtitle: "3-CARD SHOWDOWN", tag: "TOP", theme: "patti", art: "patti" },
  { name: "Limbo / Crash Rocket", subtitle: "CHASE THE MULTIPLIER", tag: "NEW", theme: "rocket", art: "rocket" },
  { name: "Ludo Bet Turbo", subtitle: "ROLL INTO ACTION", theme: "ludo", art: "ludo" },
  { name: "Bollywood Stars", subtitle: "STAR JACKPOT", tag: "NEW", theme: "bollywood", art: "star" },
];

function Artwork({ kind }: { kind: Game["art"] }) {
  if (kind === "cards") return <svg viewBox="0 0 220 150" aria-hidden="true"><defs><linearGradient id="gold-card" x2="1" y2="1"><stop stopColor="#fff0a6"/><stop offset="1" stopColor="#b76b16"/></linearGradient></defs><ellipse cx="112" cy="128" rx="76" ry="12" fill="#080b12" opacity=".5"/><g transform="translate(45 23) rotate(-17 43 54)"><rect width="70" height="98" rx="8" fill="#fff8e9" stroke="#e5b84f" strokeWidth="3"/><text x="10" y="23" fontSize="20" fill="#b7192d" fontWeight="900">A</text><text x="35" y="67" fontSize="42" fill="#b7192d">♥</text></g><g transform="translate(100 15) rotate(12 35 52)"><rect width="70" height="98" rx="8" fill="#fffdf5" stroke="url(#gold-card)" strokeWidth="3"/><text x="10" y="23" fontSize="20" fill="#18253a" fontWeight="900">K</text><text x="35" y="67" fontSize="42" fill="#18253a">♠</text></g><g fill="#ffd45b" stroke="#8d4e10" strokeWidth="3"><ellipse cx="157" cy="112" rx="24" ry="9"/><path d="M133 102v10c0 6 48 6 48 0v-10" fill="#e5a72d"/><ellipse cx="157" cy="102" rx="24" ry="9"/></g><path d="M157 95v14" stroke="#fff0a0" strokeWidth="3"/></svg>;
  if (kind === "mines") return <svg viewBox="0 0 220 150" aria-hidden="true"><g transform="translate(34 17)"><path d="M57 16l10-12 17 8-4 18" fill="#ff8b39" stroke="#ffd06a" strokeWidth="4"/><circle cx="61" cy="75" r="43" fill="#18263c" stroke="#ff6b3d" strokeWidth="5"/><circle cx="61" cy="75" r="30" fill="#2d4261"/><path d="M43 52l36 46M79 52L43 98" stroke="#ffb44a" strokeWidth="9" strokeLinecap="round"/><path d="M48 59l26 32M74 59L48 91" stroke="#fff0a1" strokeWidth="3" strokeLinecap="round"/></g><g transform="translate(126 57)"><path d="M28 0l25 25-25 42L3 25z" fill="#6df8ff" stroke="#d8ffff" strokeWidth="3"/><path d="M28 0v67L3 25z" fill="#20b8d5"/><path d="M28 0l25 25H3z" fill="#a3ffff"/></g><circle cx="170" cy="25" r="4" fill="#fff"/><circle cx="190" cy="45" r="2" fill="#7cfaff"/></svg>;
  if (kind === "dragon") return <svg viewBox="0 0 220 150" aria-hidden="true"><defs><linearGradient id="dragon-gold" x2="1" y2="1"><stop stopColor="#fff0a0"/><stop offset=".45" stopColor="#ed9a20"/><stop offset="1" stopColor="#8d260b"/></linearGradient></defs><path d="M24 116Q4 75 40 39L68 24 59 47 88 38 75 62 97 75 72 83 64 120z" fill="url(#dragon-gold)" stroke="#ffda67" strokeWidth="3"/><path d="M196 116q20-41-16-77l-28-15 9 23-29-9 13 24-22 13 25 8 8 37z" fill="#dc3f2f" stroke="#ff9b59" strokeWidth="3"/><path d="M55 64l14 7-15 5M166 64l-14 7 15 5" stroke="#fff7d1" strokeWidth="4"/><circle cx="59" cy="66" r="4" fill="#111"/><circle cx="161" cy="66" r="4" fill="#111"/><path d="M95 111l15-22 15 22-15 12z" fill="#f6c84d" stroke="#fff0a2" strokeWidth="2"/></svg>;
  if (kind === "patti") return <svg viewBox="0 0 220 150" aria-hidden="true"><ellipse cx="110" cy="128" rx="78" ry="10" fill="#070b13" opacity=".45"/><g transform="translate(45 25) rotate(-18 36 48)"><rect width="65" height="92" rx="7" fill="#fdf8eb" stroke="#d9aa43" strokeWidth="3"/><text x="10" y="23" fill="#d62f3b" fontSize="18" fontWeight="900">A</text><text x="33" y="65" fill="#d62f3b" fontSize="40">♥</text></g><g transform="translate(88 17)"><rect width="65" height="92" rx="7" fill="#fffdf7" stroke="#d9aa43" strokeWidth="3"/><text x="10" y="23" fill="#16233b" fontSize="18" fontWeight="900">K</text><text x="33" y="65" fill="#16233b" fontSize="40">♠</text></g><g fill="#f5be42" stroke="#8e4d12" strokeWidth="2"><ellipse cx="163" cy="111" rx="25" ry="8"/><path d="M138 102v9c0 7 50 7 50 0v-9" fill="#c98521"/><ellipse cx="163" cy="102" rx="25" ry="8"/><ellipse cx="163" cy="92" rx="25" ry="8"/></g></svg>;
  if (kind === "rocket") return <svg viewBox="0 0 220 150" aria-hidden="true"><path d="M46 119L22 133l9-30M70 126l-4 19 27-24" fill="#ff5d36"/><path d="M60 105Q41 63 105 15q42 46 0 89l-22 15z" fill="#e9f8ff" stroke="#7fdfff" strokeWidth="3"/><path d="M83 89L60 105 47 87l23-17M106 87l17 18 14-20-22-16" fill="#e9473d" stroke="#ffb57b" strokeWidth="3"/><circle cx="103" cy="48" r="13" fill="#2b4b7b" stroke="#a6f5ff" strokeWidth="4"/><path d="M75 112l-4 24 19-14 13-8" fill="#ffb52e"/><path d="M143 43l8-14 8 14 14 8-14 8-8 14-8-14-14-8z" fill="#ffe77c"/><text x="136" y="108" fontSize="24" fill="#fff4a5" fontWeight="900">x25</text></svg>;
  if (kind === "ludo") return <svg viewBox="0 0 220 150" aria-hidden="true"><g transform="translate(28 25) rotate(-10 42 42)"><rect width="84" height="84" rx="15" fill="#fff3d0" stroke="#f7c65b" strokeWidth="4"/><rect x="9" y="9" width="30" height="30" rx="6" fill="#e74a52"/><rect x="45" y="9" width="30" height="30" rx="6" fill="#31b7ed"/><rect x="9" y="45" width="30" height="30" rx="6" fill="#5bd77b"/><rect x="45" y="45" width="30" height="30" rx="6" fill="#f5c842"/><circle cx="24" cy="24" r="5" fill="#fff"/><circle cx="60" cy="24" r="5" fill="#fff"/><circle cx="24" cy="60" r="5" fill="#fff"/><circle cx="60" cy="60" r="5" fill="#fff"/></g><g stroke="#fff3c4" strokeWidth="3"><circle cx="147" cy="46" r="19" fill="#e84152"/><circle cx="181" cy="75" r="19" fill="#36b8ee"/><circle cx="143" cy="105" r="19" fill="#52d47c"/></g><path d="M141 42l6 6 6-6M175 71l6 6 6-6M137 101l6 6 6-6" stroke="#fff" strokeWidth="3" fill="none"/></svg>;
  return <svg viewBox="0 0 220 150" aria-hidden="true"><path d="M110 16l22 45 50 7-36 34 9 31-45-24-45 24 9-31-36-34 50-7z" fill="#ffce52" stroke="#fff0a6" strokeWidth="4" strokeLinejoin="round"/><path d="M110 34l15 31 34 5-25 23 6 21-30-16-30 16 6-21-25-23 34-5z" fill="#f79b26"/><circle cx="110" cy="75" r="20" fill="#fff0a6"/><path d="M110 57l5 13 14 1-11 9 3 14-11-7-11 7 3-14-11-9 14-1z" fill="#a85c19"/></svg>;
}

export default function GameLobby() {
  return <section className="game-lobby" aria-label="Casino game lobby">
    <div className="lobby-heading"><div><span className="lobby-kicker">VIVOSPIN • GAME ZONE</span><h2>Featured Games</h2><p>Choose your next table.</p></div><span className="lobby-live"><i /> LIVE LOBBY</span></div>
    <div className="game-grid">{games.map((game) => <article className={`game-tile theme-${game.theme}`} key={game.name}>
      {game.tag && <span className={`game-tag tag-${game.tag.toLowerCase()}`}>{game.tag}</span>}
      <div className="game-art"><Artwork kind={game.art} /></div>
      <div className="game-info"><div><h3>{game.name}</h3><p>{game.subtitle}</p></div><span className="game-play" aria-hidden="true">›</span></div>
    </article>)}</div>
  </section>;
}
