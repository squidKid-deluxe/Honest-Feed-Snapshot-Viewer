# AGENTS.md (honest_snapshot_viewer)

Static HTML/JS/CSS viewer for HONEST feed snapshots. Three files only: `app.js`, `index.html`, `style.css`.

## How to run

No build step, no `package.json`, no dependencies, no tests, no lint. Open `index.html` in a browser (or serve with any static server). Publishers are fetched live from GitHub, so network access is required.

## Behavior

- On load it calls the GitHub Contents API (`api.github.com/repos/squidKid-deluxe/HONEST-feeds-live`) to list `*.json` publisher files, then fetches each publisher's latest snapshot commit.
- Snapshots are served from `raw.githubusercontent.com/squidKid-deluxe/HONEST-feeds-live/main/<account>.json`.
- `STALE_SECONDS = 7200` (2 hours): a snapshot whose `prices.time.unix` is older than that is marked STALE.
- Tables render FINAL FEED, DEX, FOREX, and CEX, matching the `render_price_logs.py` output in `honest_mpa_price_feeds`.

## Constants to keep in sync

`CURRENCIES` and `EXCHANGES` in `app.js` mirror `render_price_logs.py`'s `dex_table()` and `cex_table()` in `honest_mpa_price_feeds`. If those Python functions change, update these constants to match.

## Verification

Open `index.html` and confirm: publisher list loads, a snapshot renders, stale/fresh age badges appear, and the DEX/CEX/FOREX tables populate. No local test suite exists.
