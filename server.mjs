import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const here = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 8080);

// Resolve common Odds API variable aliases before importing the route module.
// Never log or hard-code the secret value.
const oddsApiKey = [
  process.env.ODDS_API_KEY,
  process.env.THE_ODDS_API_KEY,
  process.env.ODDS_API_KEY_V4,
].map((value) => value?.trim()).find(Boolean);

if (oddsApiKey) {
  for (const name of ["ODDS_API_KEY", "THE_ODDS_API_KEY", "ODDS_API_KEY_V4"]) {
    if (!process.env[name]?.trim()) process.env[name] = oddsApiKey;
  }
}

/* Safe startup diagnostic: log presence only, never secret values. */
console.info("Odds API runtime configuration", {
  service: process.env.RAILWAY_SERVICE_NAME ?? "unknown",
  environment: process.env.RAILWAY_ENVIRONMENT_NAME ?? "unknown",
  deploymentId: process.env.RAILWAY_DEPLOYMENT_ID ?? "unknown",
  oddsApiKeyPresent: Boolean(process.env.ODDS_API_KEY?.trim()),
  theOddsApiKeyPresent: Boolean(process.env.THE_ODDS_API_KEY?.trim()),
  oddsApiKeyV4Present: Boolean(process.env.ODDS_API_KEY_V4?.trim()),
});

// Import after environment alias mapping so route-level config sees the resolved key.
const { default: oddsHandler } = await import("./api/odds.ts");

app.disable("x-powered-by");
app.use(express.json({ limit: "32kb" }));

app.get("/health", (_req, res) => res.status(200).json({ ok: true }));

app.all("/api/odds", (req, res) => Promise.resolve(oddsHandler(req, res)).catch((error) => {
  console.error("odds API error", error);
  if (!res.headersSent) res.status(500).json({ error: "Internal server error" });
}));

app.all("/api/bets/place", async (req, res) => {
  try {
    const { default: handler } = await import("./api/bets/place.ts");
    await handler(req, res);
  } catch (error) {
    console.error("bet placement API unavailable", error);
    if (!res.headersSent) res.status(500).json({ error: "Bet placement API unavailable; check server and database configuration." });
  }
});

app.all("/api/wallet", async (req, res) => {
  try {
    const { default: handler } = await import("./api/wallet.ts");
    await handler(req, res);
  } catch (error) {
    console.error("wallet API unavailable", error);
    if (!res.headersSent) res.status(500).json({ error: "Wallet API unavailable; check database configuration." });
  }
});

app.all("/api/settlement", async (req, res) => {
  try {
    const { default: handler } = await import("./api/settlement.ts");
    await handler(req, res);
  } catch (error) {
    console.error("settlement API unavailable", error);
    if (!res.headersSent) res.status(500).json({ error: "Settlement API unavailable; check database configuration." });
  }
});

const staticDir = path.join(here, "dist");
app.use(express.static(staticDir));
app.get("*path", (_req, res) => res.sendFile(path.join(staticDir, "index.html")));

app.listen(port, "0.0.0.0", () => {
  console.log(`VivoSpin server listening on port ${port}`);
});
