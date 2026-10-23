import { useState } from "react";

type GameCard = { slug: string; name: string; eyebrow: string; description: string; art: "aviator" | "mines" | "sweet"; accent: string; icon: string };
const games: GameCard[] = [
  { slug: "aviator", name: "Aviator", eyebrow: "CRASH · TIMING", description: "Watch the multiplier climb and cash out before the flight ends.", art: "aviator", accent: "#ff4564", icon: "✈" },
  { slug: "mines", name: "Mines", eyebrow: "PICK · MULTIPLY", description: "Reveal safe gems, build your multiplier, and choose when to stop.", art: "mines", accent: "#36c8ff", icon: "◆" },
  { slug: "sweet-bonanza", name: "Sweet Bonanza", eyebrow: "CASCADE · SLOTS", description: "A playful candy world with colorful symbols and cascading wins.", art: "sweet", accent: "#ef64d7", icon: "🍭" },
];
function Art({ game }: { game: GameCard }) {
  if (game.art === "aviator") return <div className="vcl-art vcl-aviator" aria-hidden="true"><div className="vcl-sun" /><div className="vcl-flightpath" /><div className="vcl-plane">✈</div><div className="vcl-art-word">FLY HIGHER</div></div>;
  if (game.art === "mines") return <div className="vcl-art vcl-mines" aria-hidden="true"><div className="vcl-gem-grid">{Array.from({length:9},(_,i)=><i key={i} className={i===1||i===7?"vcl-mine-tile":""}>{i===1||i===7?"✹":"◆"}</i>)}</div><div className="vcl-art-word">FIND YOUR PATH</div></div>;
  return <div className="vcl-art vcl-sweet" aria-hidden="true"><div className="vcl-candy c1">🍓</div><div className="vcl-candy c2">🍬</div><div className="vcl-candy c3">🍇</div><div className="vcl-candy c4">🍭</div><div className="vcl-candy c5">🍊</div><div className="vcl-art-word">SWEET CASCADE</div></div>;
}
export default function CasinoLounge() {
  const [notice, setNotice] = useState("");
  const openGame = (slug: string) => { window.history.pushState({}, "", "/games/" + slug); window.dispatchEvent(new PopStateEvent("popstate")); };
  return <main className="vcl">
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap');
      .vcl{min-height:100vh;background:radial-gradient(ellipse at 50% -12%,#163047 0,transparent 43%),#060a12;color:#f5f8ff;font-family:'DM Sans',sans-serif;padding:0 0 36px}
      .vcl *{box-sizing:border-box}.vcl-wrap{max-width:1180px;margin:auto;padding:0 24px}
      .vcl-nav{height:76px;border-bottom:1px solid #ffffff12;display:flex;align-items:center;justify-content:space-between;gap:20px}
      .vcl-logo{font:700 23px 'Space Grotesk',sans-serif;letter-spacing:-1px}.vcl-logo b{color:#ffd84d}.vcl-live{display:flex;align-items:center;gap:8px;color:#9baac0;font-size:11px;letter-spacing:1.5px}.vcl-live i{width:7px;height:7px;border-radius:50%;background:#58e0b5;box-shadow:0 0 12px #58e0b5}
      .vcl-hero{position:relative;overflow:hidden;margin:28px 0 24px;padding:clamp(28px,5vw,58px);border:1px solid #304052;border-radius:25px;background:linear-gradient(115deg,#111b29,#0c1421 55%,#1c1021);box-shadow:0 25px 70px #0003}
      .vcl-hero:after{content:"";position:absolute;width:350px;height:350px;border:1px solid #ffffff12;border-radius:50%;right:-100px;top:-180px;box-shadow:0 0 0 35px #ffffff05,0 0 0 75px #ffffff04}
      .vcl-kicker{color:#71e5c7;font-size:10px;font-weight:800;letter-spacing:2.5px}.vcl-hero h1{position:relative;z-index:1;max-width:720px;font:700 clamp(38px,6vw,68px)/.98 'Space Grotesk',sans-serif;letter-spacing:-3px;margin:18px 0}
      .vcl-hero h1 span{background:linear-gradient(90deg,#6ce8c4,#82b9ff,#ff91c4);color:transparent;background-clip:text}.vcl-hero p{max-width:550px;color:#aab7c9;font-size:14px;line-height:1.8;margin:0}
      .vcl-pills{display:flex;gap:9px;flex-wrap:wrap;margin-top:25px}.vcl-pills span{border:1px solid #ffffff17;background:#ffffff06;border-radius:30px;padding:8px 12px;font-size:10px;color:#bdc8d8}
      .vcl-section-head{display:flex;align-items:end;justify-content:space-between;gap:16px;margin:28px 0 15px}.vcl-section-head h2{font:600 22px 'Space Grotesk',sans-serif;letter-spacing:-.6px;margin:0}.vcl-section-head p{font-size:12px;color:#8392a8;margin:7px 0 0}
      .vcl-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.vcl-card{--accent:#fff;overflow:hidden;border:1px solid #273648;border-radius:20px;background:linear-gradient(160deg,#111a27,#0b111b);transition:transform .2s,border-color .2s,box-shadow .2s}
      .vcl-card:hover{transform:translateY(-4px);border-color:var(--accent);box-shadow:0 16px 36px #0005}.vcl-card:focus-within{border-color:var(--accent);box-shadow:0 0 0 2px color-mix(in srgb,var(--accent) 28%,transparent)}.vcl-art{height:220px;position:relative;overflow:hidden;isolation:isolate}.vcl-art:before{content:"";position:absolute;inset:14px;border:1px solid #ffffff1b;border-radius:13px;z-index:-1}
      .vcl-aviator{background:radial-gradient(ellipse at 30% 70%,#ff456444,transparent 44%),linear-gradient(140deg,#30131f,#0b111a)}
      .vcl-sun{position:absolute;width:155px;height:155px;border-radius:50%;right:15%;top:3%;background:linear-gradient(#ffb45c,#ff4c5e);opacity:.22;filter:blur(2px)}
      .vcl-flightpath{position:absolute;width:130%;height:3px;left:-10%;top:67%;transform:rotate(-24deg);transform-origin:left center;background:linear-gradient(90deg,transparent,#ff4564 20%,#ffc0a0 90%);box-shadow:0 0 16px #ff4564;animation:vcl-trail 3.5s ease-in-out infinite alternate}.vcl-flightpath:after{content:"";position:absolute;right:12%;top:-4px;width:10px;height:10px;border-radius:50%;background:#ffd6b8;box-shadow:0 0 18px 6px #ff456488}
      .vcl-plane{position:absolute;left:43%;top:27%;font-size:62px;color:#ff7184;transform:rotate(-19deg);filter:drop-shadow(0 0 18px #ff456477);animation:vcl-fly 3.5s ease-in-out infinite alternate}
      .vcl-mines{background:radial-gradient(ellipse at 50% 40%,#164a5a,#0a111a 70%)}
      .vcl-gem-grid{position:absolute;left:50%;top:43%;transform:translate(-50%,-50%) rotate(-4deg);width:164px;display:grid;grid-template-columns:repeat(3,1fr);gap:7px}
      .vcl-gem-grid i{height:44px;display:grid;place-items:center;border:1px solid #43d8ff77;border-radius:9px;background:linear-gradient(145deg,#167da2,#12304a);color:#a7f2ff;font-style:normal;font-size:23px;text-shadow:0 0 12px #42d9ff;animation:vcl-gem-pulse 2.2s ease-in-out infinite alternate}.vcl-gem-grid i:nth-child(3n){animation-delay:-.8s}.vcl-gem-grid i:nth-child(2n){animation-delay:-1.3s}
      .vcl-gem-grid i.vcl-mine-tile{background:linear-gradient(145deg,#313b4c,#151d29);color:#ffbe72;border-color:#eabf6b66}
      .vcl-sweet{background:radial-gradient(ellipse at center,#61285e,#191127 72%)}
      .vcl-candy{position:absolute;display:grid;place-items:center;width:65px;height:65px;border:1px solid #ffffff4a;border-radius:19px;background:linear-gradient(145deg,#ffffff26,#ffffff06);box-shadow:0 9px 28px #0004;font-size:34px;animation:vcl-bob 3s ease-in-out infinite alternate;backdrop-filter:blur(5px)}.vcl-sweet:after{content:"";position:absolute;inset:20% 12%;border:1px solid #ffb8f833;border-radius:50%;transform:rotate(-25deg);box-shadow:0 0 45px #ed6bd51c;pointer-events:none}
      .vcl-c1{left:10%;top:20%}.vcl-c2{left:37%;top:12%;animation-delay:-1s}.vcl-c3{right:12%;top:20%;animation-delay:-.5s}.vcl-c4{left:22%;top:49%;animation-delay:-1.4s}.vcl-c5{right:23%;top:50%;animation-delay:-.8s}
      .vcl-art-word{position:absolute;left:0;right:0;bottom:15px;text-align:center;font:700 12px 'Space Grotesk',sans-serif;letter-spacing:3px;color:#ffffffc9;text-shadow:0 2px 12px #000}
      .vcl-card-body{padding:19px}.vcl-eyebrow{font-size:9px;font-weight:800;letter-spacing:1.7px;color:var(--accent)}.vcl-card h3{font:700 24px 'Space Grotesk',sans-serif;letter-spacing:-.8px;margin:10px 0}.vcl-card p{min-height:48px;font-size:12px;line-height:1.7;color:#94a3b7;margin:0 0 17px}
      .vcl-cta{width:100%;min-height:46px;border:1px solid color-mix(in srgb,var(--accent) 60%,transparent);border-radius:12px;background:color-mix(in srgb,var(--accent) 13%,#111a27);color:var(--accent);font-weight:800;font-size:12px;cursor:pointer;transition:filter .15s,transform .15s}
      .vcl-cta:hover{filter:brightness(1.25);transform:translateY(-1px)}.vcl-cta:focus-visible{outline:2px solid #fff;outline-offset:3px}
      .vcl-note{margin-top:22px;border:1px solid #ffffff12;background:#ffffff04;border-radius:14px;padding:15px 17px;color:#8291a6;font-size:11px;line-height:1.7}.vcl-note strong{color:#bdc8d8}
      @keyframes vcl-fly{from{transform:translate(-4px,8px) rotate(-23deg)}to{transform:translate(10px,-9px) rotate(-15deg)}}@keyframes vcl-trail{from{transform:rotate(-29deg) scaleX(.78);opacity:.65}to{transform:rotate(-18deg) scaleX(1);opacity:1}}@keyframes vcl-gem-pulse{from{filter:brightness(.85);transform:translateY(0)}to{filter:brightness(1.28);transform:translateY(-2px)}}@keyframes vcl-bob{from{transform:translateY(0) rotate(-7deg)}to{transform:translateY(-9px) rotate(7deg)}}
      @media(max-width:780px){.vcl-wrap{padding:0 15px}.vcl-nav{height:62px}.vcl-grid{grid-template-columns:1fr;gap:14px}.vcl-art{height:190px}.vcl-hero{margin-top:17px;padding:27px 21px;border-radius:20px}.vcl-hero h1{letter-spacing:-1.8px}.vcl-section-head h2{font-size:20px}.vcl-card p{min-height:0}.vcl-live{font-size:9px;letter-spacing:.8px}}
      @media(prefers-reduced-motion:reduce){.vcl *{animation:none!important;transition:none!important}}
    `}</style>
    <div className="vcl-wrap">
      <header className="vcl-nav"><div className="vcl-logo">Vivo<span style={{color:"#fff"}}>Spin</span><b> ✦</b></div><div className="vcl-live"><i /> ORIGINALS LOUNGE <span>· 3 GAMES</span></div></header>
      <section className="vcl-hero"><div className="vcl-kicker">THE VIVOSPIN ORIGINALS</div><h1>Three games.<br/><span>One epic lounge.</span></h1><p>A focused home for Aviator, Mines, and Sweet Bonanza—built around bold artwork, quick controls, and a responsive mobile-first experience.</p><div className="vcl-pills"><span>✦ Custom game artwork</span><span>↗ Mobile-first layout</span><span>◈ Three dedicated games</span></div></section>
      <div className="vcl-section-head"><div><h2>Choose your game</h2><p>Pick a title to open its dedicated game screen.</p></div></div>
      <section className="vcl-grid" aria-label="VivoSpin original games">{games.map(game=><article className="vcl-card" key={game.slug} style={{"--accent":game.accent} as React.CSSProperties}><Art game={game}/><div className="vcl-card-body"><div className="vcl-eyebrow">{game.eyebrow}</div><h3>{game.name}</h3><p>{game.description}</p><button className="vcl-cta" onClick={()=>openGame(game.slug)} aria-label={"Open "+game.name}>Play {game.name} <span aria-hidden="true"> ↗</span></button></div></article>)}</section>
      <div className="vcl-note"><strong>Game integrity:</strong> round outcomes and wallet changes must be confirmed by the server. This lounge is a game-selection interface; the production-grade RNG, fairness verification, and end-to-end wallet behavior must be validated in the connected game screens before real-money launch.</div>
    </div>
  </main>;
}
