import { useEffect, useState } from "react";
import OddsBoard from "./OddsBoard";
import GamesHub from "./games/GamesHub";

export default function App() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  return path === "/games" || path.startsWith("/games/")
    ? <GamesHub />
    : <OddsBoard />;
}
