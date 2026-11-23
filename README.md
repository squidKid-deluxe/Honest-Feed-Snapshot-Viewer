# HONEST Snapshot Viewer

Static HTML/JS/CSS viewer for HONEST price-feed snapshots from [`squidKid-deluxe/HONEST-feeds-live`](https://github.com/squidKid-deluxe/HONEST-feeds-live). Publishers are detected automatically from the repo; snapshots are served straight from `raw.githubusercontent.com`.

## Run it

No build step, no dependencies, no `package.json`, no tests. Open `index.html` in a browser (or serve with any static server). Network access is required to fetch from GitHub.

## What it does

- Lists `*.json` publisher files via the GitHub Contents API
- Loads each publisher's latest snapshot commit
- Renders FINAL FEED, DEX, FOREX, and CEX tables matching `render_price_logs.py` output in [`honest_mpa_price_feeds`](https://github.com/squidKid-deluxe/HONEST-MPA-Price-Feeds)
- Marks snapshots whose `prices.time.unix` is older than `STALE_SECONDS` (7200s = 2h) as stale

## Files

- `index.html` — page shell
- `app.js` — data fetching and table rendering
- `style.css` — styles
- `AGENTS.md` — agent instructions
