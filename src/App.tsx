import { useEffect, useState } from "react";
import OddsBoard from "./OddsBoard";
import GamesHub from "./games/GamesHub";
import CasinoLounge from "./games/CasinoLounge";
import CasinoGame from "./games/CasinoGame";

export default function App() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  const casinoGame = path.match(/^\/casino\/(aviator|mines|sweet-bonanza)\/?$/)?.[1];
  return casinoGame
    ? <CasinoGame game={casinoGame as "aviator" | "mines" | "sweet-bonanza"} />
    : path === "/casino" || path === "/casino/"
      ? <CasinoLounge />
      : path === "/games" || path.startsWith("/games/")
        ? <GamesHub />
        : <OddsBoard />;
}
