# VivoSpin Frontend — Dynamic Odds Board

A reusable React + TypeScript football odds grid with synchronized Bet Slip selection.

## Added components

- `src/OddsBoard.tsx` — 1X2 and Over/Under markets, active odds selection, shared selection state, and Bet Slip.
- `src/odds-board.css` — responsive dark-theme styles.
- `src/App.tsx` — example app component that renders the odds board.

## Integration

Import `App` from your existing React entry point, or render `<OddsBoard />` directly from `src/OddsBoard.tsx`.

The match and odds data is demo data. Replace it with your API-fed match data before production use. This component is UI-only; it does not submit wagers or connect to a bookmaker API.
