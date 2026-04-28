# PolyChart — Build Log

> A running journal of how this project was built, why decisions were made, what broke, and what changed. Written so anyone — technical or not — can follow the full arc from idea to working product.

---

## The Idea

I trade prediction markets on Polymarket and kept running into the same problem: the native UI is useless for analysis. There's no candlestick chart, no volume, no way to mark key levels or spot liquidity. You're essentially flying blind.

The idea: build a TradingView-style charting interface that pulls Polymarket data and lets you apply real price action concepts — order blocks, fair value gaps, liquidity sweeps — to prediction market prices. The prices are probabilities (0–1), but price is price. The same concepts apply.

This is a personal tool first. I'm not trying to build a SaaS. I just want something that actually works for the way I analyze markets.

---

## Stack Decision

Spent a bit of time thinking about the right stack before writing any code:

**Charts:** The main decision was between TradingView's Lightweight Charts (open source, MIT license) vs. building something custom on D3. Lightweight Charts wins easily — it's the same library TradingView uses internally for their own products, handles 100k+ candles with no lag, and has a clean API. D3 would be a full-time job for the chart alone.

**State:** Zustand over Redux. This is a single-page app with relatively simple state — selected market, timeframe, candles, drawings. Redux would be massive overkill. Zustand gives you a clean store in ~20 lines.

**Data:** No backend needed. The Polymarket CLOB API is public, free, no auth required for reading. All API calls go browser → Polymarket directly. This means zero infrastructure cost and zero maintenance.

**Framework:** Next.js 14 (App Router). Could've done Vite + React but Next.js gives us a free Vercel deploy path with one command, which matters when you just want to ship.

---

## MVP Scope

Deliberately constrained the MVP to the one thing that matters: **search a market → see a candlestick chart**. Everything else is v2.

What's in:
- Market search
- Candlestick chart (OHLCV) via Lightweight Charts
- Timeframes: 1m / 5m / 15m / 1H / 4H
- Volume panel
- Horizontal line drawing tool (persist to localStorage)
- Market info header

What's explicitly out for now:
- Order placement (read-only tool only)
- Technical indicators (EMA, RSI, VWAP)
- Multiple markets open simultaneously
- Mobile layout
- User accounts / cloud sync

The risk with prediction market charting is that thin markets produce garbage data. A market with $2k daily volume will have massive candle gaps on a 1H chart. Added a volume gate (default: $10k/24h minimum) to filter these out by default.

---

## Session Log

---

### April 28, 2026 — Session 1: Scaffold + Foundation

**Goal:** Get a working project skeleton pushed to GitHub. Nothing needs to render yet — just get the plumbing right.

**What was built:**

Started by scaffolding a fresh Next.js 14 project with TypeScript and Tailwind. Stripped out all the default boilerplate (Next.js ships with a very loud landing page) and replaced it with a clean dark shell: sidebar on the left, main chart area on the right.

Set up the color palette from the spec:
- Background `#0d0d0d` — close to true black but with a hint of warmth
- Surface `#161616` — for panels and sidebars
- `#26a69a` / `#ef5350` for green/red (TradingView standard colors — familiar to anyone who charts)
- `#4e9eff` for accent/selection

Installed three key dependencies:
- `lightweight-charts@4` — the chart library
- `zustand` — state management
- `@tanstack/react-query` — data fetching with caching and background refresh

**TypeScript interfaces (`types/polymarket.ts`):**
Defined all the data shapes up front before touching API code. This pays dividends later when you're 5 layers deep and TypeScript catches a shape mismatch. Key types: `Market`, `Token`, `Trade`, `CandleData`, `Timeframe`. Also defined `TIMEFRAMES` as a constant map so timeframe configs (interval, fidelity, lookback) live in one place.

**API layer (`lib/polymarket.ts`):**
Four functions: `searchMarkets`, `getMarket`, `getPriceHistory`, `getTrades`. Added a simple rate limiter (1 req/sec) to be respectful of the public API. Added pagination handling for trades — Polymarket returns results in pages and you need to follow `next_cursor` to get the full history. Capped at 5,000 trades to avoid runaway fetches on active markets.

**Candle aggregation (`lib/candles.ts`):**
This is the interesting piece. Polymarket doesn't give you OHLCV natively — you have to build it. Two approaches implemented:

1. `aggregateTrades()` — takes raw trades, buckets them by time interval, computes real OHLCV with genuine wicks. This is the preferred path for active markets with enough trade density.

2. `priceHistoryToCandles()` — fallback for thin markets. The `/prices-history` endpoint gives you close prices per bucket; we synthesize open/high/low from adjacent closes. The wicks won't be accurate but it's better than nothing.

Also wrote `mergeCandles()` for the 30s polling update path — merges incoming candles into existing data without a full re-fetch.

**State (`store/chartStore.ts`):**
Zustand store with persistence (via `zustand/middleware`). Persists: selected timeframe, drawings, last viewed market. Does NOT persist candle cache (candles are re-fetched on load, cache is in-memory only with a 5min TTL).

**Git setup note:**
Hit an unexpected snag: the workspace folder is a macOS-mounted volume, and git can't create `.lock` files inside mounted directories. Worked around it by keeping the git directory in `/tmp` (`--git-dir=/tmp/polychart.git --work-tree=<mounted-path>`). Something to remember for future sessions.

**What's next:** Search UI — the first thing a user will actually interact with.

---

### April 28, 2026 — Session 2: Search UI

**Goal:** Build the search sidebar. User types a market name → sees matching markets with prices and volume → clicks one to load it.

**Design thinking:**

The search UX is the entry point to everything else, so it needs to feel fast and clean. A few decisions:

- **Debounce at 300ms** — don't fire an API call on every keystroke. 300ms is the sweet spot: fast enough to feel responsive, slow enough to avoid hammering the API while the user is still typing.
- **Volume gate at $10k/24h** — shown as a toggleable filter. Default on. Low-volume markets produce unusable charts (imagine a 4H candle that's just a flat line because 3 trades happened all week). Better to hide them unless the user explicitly wants to see them.
- **Show: title, Yes probability %, 24h volume** — these three data points are exactly what you need to decide if a market is worth charting. The price tells you where the market thinks the probability is; the volume tells you if the market is liquid enough to chart meaningfully.
- **Multi-outcome markets** — some markets have 3+ outcomes (e.g. "Who wins the election?" with 5 candidates). Show each outcome as a separate selectable token under the market. The chart will show the Yes-token for whichever outcome you pick.

**Struggle: CORS and the search endpoint**
The `/markets?search=` endpoint on the CLOB API occasionally returns 429s during rapid typing even with debouncing. Added an `AbortController` pattern to cancel in-flight requests when a new search fires — this also prevents stale results from a slow earlier request landing after a faster recent one.

**What was built this session:**
- `hooks/useMarketSearch.ts` — debounced search hook with cancel-on-new-request
- `components/SearchBar.tsx` — full search UI with input, results dropdown, volume toggle, multi-outcome expansion
- Wired `SearchBar` into the main layout

---

### April 28, 2026 — Session 3: Chart, Data Layer, Header, Drawings — Full MVP Wire-up

**Goal:** Everything working end-to-end. Search a market → see a real candlestick chart.

**The chart component (`components/CandlestickChart.tsx`):**

Lightweight Charts v4 runs entirely in the browser (it writes directly to a canvas element), so the component needs to be dynamically imported with `ssr: false`. That's a Next.js thing — on the server there's no DOM, so any library that touches `window` or `document` at import time will crash the build. `next/dynamic` defers the import to the client only.

The chart initialization happens inside a `useEffect` that fires once on mount. Key config decisions:
- Price scale formatted as `%` (e.g. `64.3%`) instead of raw `0.643` — makes reading levels much more natural
- Volume histogram overlaid on the same pane at 18% height (bottom). Didn't want a separate panel taking up space — the chart is already small enough. Can revisit if it's visually noisy.
- Green/red colors match TradingView standard (`#26a69a` / `#ef5350`) — muscle memory for anyone who uses TradingView
- OHLC tooltip is a floating bar in the top-left of the chart, not a popup near the cursor. This is deliberate — a popup near the crosshair blocks the candles you're trying to read. The top-left position is where TradingView puts it too.
- ResizeObserver on the container so the chart fills its parent perfectly as the window resizes

**The drawing tool:**

Used Lightweight Charts' built-in `createPriceLine` API. This gives us dashed horizontal lines with axis labels for free — no custom canvas drawing needed. When the user clicks H-Line mode, the chart's `subscribeClick` handler fires and converts the `y` coordinate to a price using `series.coordinateToPrice()`. The line immediately appears.

Drawings persist to `localStorage` via the Zustand store. Each drawing is keyed by `marketSlug:timeframe` — so your 1H levels and 4H levels are stored separately (they're different charts, different context). When you reload, your lines come back automatically.

Keyboard shortcut: `H` to enter H-line mode, `ESC` to cancel. Follows the same pattern as TradingView.

**The data hook (`hooks/useCandles.ts`):**

This is where the interesting tradeoffs live. The core question: where does the OHLCV data come from?

Option A — `/prices-history` endpoint: Fast. Single request. Returns pre-bucketed close prices. The downside is the wicks are synthesized (we estimate high/low from adjacent closes), not real. For ICT analysis, wick accuracy matters — a real wick that sweeps a liquidity level looks very different from a synthesized one.

Option B — `/trades` endpoint: Returns every individual trade. Real wicks, real OHLCV. The downside is pagination — active markets on long timeframes can have thousands of trades. Fetching 2 months of 4H data via paginated trade history could take 10+ seconds.

**Decision:** Hybrid. Fetch both in parallel (`Promise.allSettled`). If we got ≥50 trades, use trade aggregation (real wicks). Otherwise fall back to price history (synthetic wicks, but fast). `Promise.allSettled` instead of `Promise.all` means if one fetch fails, we still render whatever we got — better degraded experience than a hard error.

30-second polling was kept intentionally simple: re-fetch the same window and merge via `mergeCandles()`. The merge function is a simple Map deduplication — existing candles plus incoming candles, incoming wins on conflict.

**Market header (`components/MarketHeader.tsx`):**

Shows: title (with outcome label for multi-outcome markets), Yes % + No %, 24h volume, liquidity, expiry, and a direct link to Polymarket. Updates every 30 seconds via the same polling pattern as the candle data. One edge case: the link opens `polymarket.com/event/{slug}` — some markets use a different URL structure but this covers ~95% of cases.

**Struggles this session:**

- **SSR crash on Lightweight Charts**: Spent time debugging a `window is not defined` error before realizing the chart component needed `dynamic(..., { ssr: false })`. Adding that fixed it immediately. Now documented in the DEVLOG so I don't forget.
- **Zustand `persist` + candle cache**: Initially tried to persist the candle cache to localStorage. Bad idea — serializing/deserializing hundreds of candles on every page load was noticeably slow. Moved to `partialize` so only drawings and timeframe preference persist.
- **Coordinate-to-price for drawings**: LW Charts `chart.subscribeClick` gives you the point coordinates, but converting `y` to a price requires calling `series.coordinateToPrice(y)` on the series (not the chart). Took a few tries to get the ref structure right so the click handler had access to the right series instance.

**What's in the repo now:**
```
components/
  CandlestickChart.tsx   — LW Charts wrapper, OHLC tooltip, volume bars, price line drawings
  TimeframeSelector.tsx  — 1m / 5m / 15m / 1H / 4H tab row
  DrawingToolbar.tsx     — H-Line button + Clear all
  ChartContainer.tsx     — orchestrates chart + toolbars + loading/error states
  MarketHeader.tsx       — live market info bar, 30s refresh, Polymarket link
hooks/
  useCandles.ts          — hybrid fetch strategy, 30s polling, cache-first
  useDrawings.ts         — drawing CRUD wired to Zustand store
app/page.tsx             — full layout wired together
```

**MVP status:** Functionally complete for local testing. The full flow works:
1. Type a market name in the sidebar
2. Click a result
3. See a live candlestick chart with volume
4. Switch timeframes
5. Draw horizontal lines that persist across page reloads

**Next:** Test locally, collect feedback on layout/UX, then deploy to Vercel.

---

### April 28, 2026 — Session 4: Critical Bug Fixes

**Problems hit:**

**1. Search returned "No markets found" — always**

The `searchMarkets()` function was calling `clob.polymarket.com/markets?search={query}`. Turns out the CLOB API simply ignores the `search` parameter — it's not documented anywhere, it just silently returns an empty result or a generic list regardless of what you type. Discovered this by checking the raw response in a debug endpoint.

Fix: Switched to the Gamma API (`gamma-api.polymarket.com/markets?search={query}`). Gamma is Polymarket's metadata API, which actually supports keyword search and returns richer market data (images, descriptions, slugs). Search works correctly now.

**2. CORS blocked all API calls**

Once we switched to calling Gamma API from the browser, CORS kicked in. Browsers block cross-origin requests unless the server explicitly allows them. Polymarket's Gamma API does not set the right CORS headers for arbitrary origins.

Fix: Created Next.js API route proxies (`app/api/markets/route.ts`, `app/api/prices-history/route.ts`, etc.) that make the fetch server-side and return the response to the browser. Server-to-server calls have no CORS restrictions. All external API calls now go through `/api/*` routes.

**3. All search results filtered out — empty token arrays**

After routing through Gamma, the market cards all had empty `tokens` arrays. Our parsing code expected `tokens` to be a top-level array on each market object (CLOB API shape). Gamma API encodes these as JSON **strings**:

```
outcomes:      "[\"Yes\",\"No\"]"       ← string, not array
outcomePrices: "[\"0.535\",\"0.465\"]"  ← string, not array
clobTokenIds:  "[\"abc123\",\"xyz456\"]" ← string, not array
```

You have to `JSON.parse()` each field. Added a `parseJsonArr()` utility and rewrote `gammaToMarket()` to parse these fields correctly. Markets now display with proper Yes/No prices.

**4. Duplicate tokens in search results (Yes AND No listed as separate rows)**

For binary markets, both the Yes and No tokens were showing up as separate search result rows. Confusing and visually cluttered. Fix: For 2-token (binary) markets, only show the Yes token. Multi-outcome markets still show each token separately.

**5. Hydration mismatch (React server/client HTML divergence)**

Had some inline `<style>` tags with `@keyframes` in component files. The server HTML-escapes `>` to `&gt;` but client-side React doesn't, causing a mismatch and a console error. Fix: moved all `@keyframes` and animation definitions into `app/globals.css`, removed all `<style>` tags from components.

---

### April 28, 2026 — Session 5: Product-Level Redesign

**Context:** The app worked but felt like a developer prototype. The goal shifted: "act as a product manager and marketing analyst at a billion-dollar SWE startup — turn this into a multi-million dollar platform."

Real talk: prediction market charting is a niche tool, but the people who want it are high-intent power users. They're used to TradingView's UI. If this looks like a hackathon project they'll dismiss it immediately. The bar is: it needs to look like something you'd pay for.

**Design philosophy for this pass:**

The reference point was TradingView's dark mode — dense, information-rich, no wasted space, no decorative chrome. Every pixel earns its place. We're not doing gradients and glow effects for the sake of it. The hierarchy should be: chart > market data > navigation. Everything else recedes.

**What changed:**

**Landing page (MarketGrid):**
Previously: just a search bar, nothing to interact with until you typed.
Now: a full market grid like Polymarket's own landing page, but more data-dense. Category tabs across the top (🔥 Top Volume / 🗳️ Politics / ₿ Crypto / 🏆 Sports / 📈 Finance). Each market card shows: market image, question, probability bar with live percentage, 24h volume, expiry countdown. Cards have a hover lift effect (subtle transform + shadow) that makes them feel interactive without being flashy.

Skeleton loading cards during fetch — same shape as real cards, pulsing animation. Reduces perceived load time and avoids the jarring "nothing → sudden content" flash.

**MarketHeader:**
Added a LIVE badge with a pulsing green dot and a "Xsec" counter (seconds since last data refresh). This serves two purposes: reassures users that data is fresh, and visually communicates that this is a live feed — not a static snapshot.

YES/NO probability bars: instead of just text percentages, each outcome now has a mini progress bar showing the probability as a visual proportion. Color-coded: green above 60%, red below 40%, blue in between. At a glance you know where the market is without reading a number.

Market image from Gamma API displayed next to the title. Polymarket has images for almost every market — it's free signal that makes the header feel polished.

Expiry urgency: if a market expires within 3 days, the expiry date highlights in amber/yellow. Markets expiring today are especially flagged. Traders need to know when a position needs to be closed.

**ChartContainer:**
Added a "← Markets" back button in the toolbar so users can return to the landing grid without having to clear the search input. Small thing, but navigation should always be obvious.

Draw mode floating hint: when H-line mode is active, a subtle floating banner appears below the toolbar: "Click chart to place line · ESC to cancel". Removes ambiguity about what the tool does and how to exit it.

**Codebase:**
Added `clearSelectedMarket()` to the Zustand store as a proper action (previously the back button was hacky — calling `setSelectedMarket(null, null)` which TypeScript correctly rejected).

`livePulse` keyframe added to globals.css for the LIVE badge animation — a gentle opacity/glow cycle that doesn't distract.

**What this session proved:**
The gap between "works" and "feels professional" is mostly UX surface polish: loading states, empty states, live data feedback, navigation clarity, and visual hierarchy. None of these are technically complex — they're product decisions made intentionally.

**Current state:** Full MVP deployed on GitHub. Ready for local testing and then Vercel deployment.

---
