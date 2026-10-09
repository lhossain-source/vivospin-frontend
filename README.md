# VivoSpin Frontend — Live Sports Odds

React + TypeScript odds board using The Odds API through a server-side proxy.

## Features

- Live soccer fixtures and decimal odds from The Odds API.
- 1X2 (provider `h2h`) and Over/Under (provider `totals`) markets when available.
- Best available price across returned bookmakers for each outcome.
- Competition selector, loading/error/empty states, and automatic refresh every 60 seconds.
- Bet Slip stays connected to the live feed and refreshes selected prices when the same selection remains available.
- Responsive UI with no provider API key exposed to browser code.

## Files

- `api/odds.ts` — Vercel serverless proxy to The Odds API.
- `src/OddsBoard.tsx` — live odds UI and Bet Slip state.
- `src/odds-board.css` — responsive styling.
- `.env.example` — environment variable template.

## Configure the provider

1. Create an API key at [The Odds API](https://the-odds-api.com/).
2. In your deployment provider's server-side environment settings, add `THE_ODDS_API_KEY` with your key. For local development, copy `.env.example` to `.env.local` and fill in the key.
3. Deploy the project to Vercel (the `api/odds.ts` handler uses Vercel's Node serverless function convention), or adapt the handler to your existing backend runtime.
4. Ensure the frontend and `/api/odds` endpoint are served from the same origin.
5. Run your React app as usual. The board calls `GET /api/odds?sport=soccer_epl` and never receives the API key.

Supported competition keys are allowlisted in `api/odds.ts`. The server defaults to the UK bookmaker region; adjust the `regions` query or server default to match your provider plan and intended market.

## Important limitations

- Real odds require a valid provider key, available quota, and provider coverage for the selected competition/markets. Some fixtures may have no odds or only one of the requested markets.
- The feed returns bookmaker prices, not an official wager acceptance endpoint. Prices can change between refreshes and placement.
- Bet Slip is display-only: it estimates combined decimal odds and return but does not place bets or connect to a sportsbook account.
- This is an integration scaffold. Configure your actual deployment, API key, and provider plan before expecting live data in production.
