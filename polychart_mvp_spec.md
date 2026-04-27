# PolyChart — MVP Spec
**Version:** 1.0 (Charting Only)  
**Stack:** Next.js · TypeScript · Lightweight Charts (TradingView) · Polymarket CLOB API  
**Scope:** Read-only charting frontend for ICT/price action analysis on Polymarket prediction markets. No order placement, no wallet connection, no auth.

---

## 1. What This Is

A clean, TradingView-style charting interface for Polymarket markets. You search for a market, pick your timeframe (1m/5m/15m/1H/4H), and get a professional candlestick chart with volume. The purpose is to apply ICT concepts (FVGs, order blocks, liquidity sweeps, BOS/CHOCH) and price action levels to prediction market data — something Polymarket's native UI is completely useless for.

Trades are still executed manually on Polymarket's web/app. This tool is purely for analysis and planning.

---

## 2. Core Feature List (MVP v1)

### 2.1 Market Search & Selection
- Search bar — type a market name (e.g. "Lakers", "Fed rate", "Trump") → returns matching active markets from Polymarket CLOB API
- Each result shows: market title, current Yes probability, 24h volume, expiry date
- **Volume gate (optional but recommended):** Only show markets with >$10,000 24h volume. Low-volume markets produce gappy, unusable candles. Can be a toggle.
- Click a market to load its chart
- Support multi-outcome markets (e.g. "Who wins the 2026 election?" with multiple candidates) — show each outcome as a selectable token

### 2.2 Candlestick Chart
- Library: **TradingView Lightweight Charts v4** (open source, MIT, no approval needed)
- Chart type: Candlestick (OHLC)
- Price axis: 0–1 (probability, displayed as 0%–100% on right axis)
- Time axis: UTC timestamps, formatted to local time
- **Timeframes:** 1m, 5m, 15m, 1H, 4H — switchable via toolbar buttons
- Candle data is **aggregated on the client** from raw trade history (see Section 4)
- Crosshair with OHLC tooltip on hover
- Dark theme by default (matches TradingView aesthetic)

### 2.3 Volume Bars
- Sub-panel below the main chart
- Bars colored green/red matching candle direction
- Shows total USDC traded per candle

### 2.4 Charting Tools (Drawing)
Lightweight Charts has limited native drawing tools. MVP includes:
- **Horizontal line** — click to place, drag to move (for key levels, liquidity, etc.)
- **Price label** — annotate a horizontal line with text
- These are stored in `localStorage` per market slug so they persist across sessions

### 2.5 Market Info Bar
- Displayed above the chart
- Shows: market title, current Yes/No prices, 24h volume, total liquidity, expiry date, Polymarket link
- Updates every 30 seconds via polling

### 2.6 Timeframe Persistence
- Last selected timeframe saved to `localStorage`
- Last viewed market saved to `localStorage` (restores on next visit)

---

## 3. What's NOT in MVP v1

These are explicitly deferred to v2:

- ❌ Order placement / paper trading
- ❌ Order book visualization
- ❌ Multiple markets open simultaneously (tabs)
- ❌ Technical indicators (EMA, RSI, VWAP, etc.)
- ❌ Alert system
- ❌ User accounts / cloud sync of drawings
- ❌ Mobile-optimized layout (desktop first)
- ❌ No-outcome charting (just Yes token in MVP)

---

## 4. Data Architecture

### 4.1 Polymarket CLOB API (Public, Free, No Auth Required for Reading)

Base URL: `https://clob.polymarket.com`

**Key endpoints you'll use:**

| Endpoint | Purpose |
|---|---|
| `GET /markets?search={query}` | Search markets by keyword |
| `GET /markets/{condition_id}` | Get single market details |
| `GET /prices-history?market={token_id}&startTs={ts}&endTs={ts}&fidelity={n}` | Price history (OHLC-ish, see below) |
| `GET /trades?market={token_id}` | Raw trade history |

**The OHLC problem — how to solve it:**

Polymarket's `/prices-history` endpoint returns pre-bucketed price data with a `fidelity` parameter (resolution in minutes). This actually gives you close prices per bucket. Use this as your primary data source — it's OHLC-lite (you get open/close, derive high/low from adjacent buckets).

For true OHLC with real wicks (important for ICT), supplement with `/trades` for raw prints, then aggregate client-side:

```
For each candle bucket (e.g. 5min):
  open  = first trade price in bucket
  high  = max trade price in bucket
  low   = min trade price in bucket
  close = last trade price in bucket
  volume = sum of USDC size of all trades in bucket
```

**Fidelity mapping:**

| Timeframe | API fidelity param | Lookback to request |
|---|---|---|
| 1m | 1 | Last 6 hours (360 candles) |
| 5m | 5 | Last 24 hours (288 candles) |
| 15m | 15 | Last 3 days (288 candles) |
| 1H | 60 | Last 2 weeks (336 candles) |
| 4H | 240 | Last 2 months (360 candles) |

**Rate limits:** No documented public rate limit, but throttle to max 1 request/second per endpoint to be safe.

### 4.2 Data Freshness
- On timeframe change → full re-fetch for that timeframe
- Every 30 seconds → fetch latest 20 candles and merge into existing dataset (live candle update)
- No WebSocket available on CLOB API → polling only

### 4.3 Caching
- Cache fetched candle data in memory (React state / Zustand store) per market+timeframe combination
- Cache TTL: 5 minutes for historical, always refresh last candle
- This avoids re-fetching 2 months of 4H data every time you switch between timeframes

---

## 5. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 14 (App Router) | Fast setup, Vercel deploy in one command |
| Language | TypeScript | Catch API shape issues early |
| Charts | Lightweight Charts v4 | Free, open source, fast, real TradingView quality |
| State | Zustand | Simple, no boilerplate, good for chart state |
| Styling | Tailwind CSS | Fast to build dark UI |
| HTTP | Native fetch + React Query | Caching, background refetch built in |
| Storage | localStorage | Persist drawings and last-viewed market |
| Hosting | Vercel (free tier) | Zero-config, deploy from GitHub push |

**No backend needed for MVP v1.** All API calls go directly from the browser to `clob.polymarket.com`. CLOB API has CORS enabled for public endpoints.

---

## 6. Component Tree

```
App
├── SearchBar
│   ├── SearchInput
│   └── SearchResults (market list with volume/price)
├── MarketHeader
│   ├── MarketTitle
│   ├── PriceBadge (Yes/No current prices)
│   ├── VolumeDisplay
│   └── ExpiryBadge
├── ChartContainer
│   ├── TimeframeSelector (1m | 5m | 15m | 1H | 4H)
│   ├── DrawingToolbar (H-line, Label)
│   ├── CandlestickChart (Lightweight Charts)
│   └── VolumePanel (sub-chart)
└── MarketFooter
    └── PolymarketLink (opens native market in new tab)
```

---

## 7. File Structure

```
polychart/
├── app/
│   ├── layout.tsx          # Dark theme, fonts
│   ├── page.tsx            # Main page (search → chart)
│   └── globals.css
├── components/
│   ├── SearchBar.tsx
│   ├── MarketHeader.tsx
│   ├── ChartContainer.tsx
│   ├── CandlestickChart.tsx  # Lightweight Charts wrapper
│   ├── VolumePanel.tsx
│   ├── TimeframeSelector.tsx
│   └── DrawingToolbar.tsx
├── lib/
│   ├── polymarket.ts       # All CLOB API calls
│   ├── candles.ts          # Trade → OHLCV aggregation logic
│   └── storage.ts          # localStorage helpers
├── store/
│   └── chartStore.ts       # Zustand: selected market, timeframe, drawings
├── types/
│   └── polymarket.ts       # Market, Trade, Candle interfaces
└── hooks/
    ├── useMarketSearch.ts
    ├── useCandles.ts
    └── useDrawings.ts
```

---

## 8. UI Design Direction

**Theme:** Dark, dense, terminal-like. Think TradingView's dark mode but tighter. Not crypto-bro flashy — clean and focused.

**Color palette:**
```
Background:    #0d0d0d
Surface:       #161616
Border:        #2a2a2a
Text primary:  #e8e8e8
Text muted:    #666666
Green (up):    #26a69a  (TradingView standard)
Red (down):    #ef5350  (TradingView standard)
Accent:        #4e9eff  (selection, active state)
```

**Layout:**
- Left sidebar: search + results (240px, collapsible)
- Main area: market header + chart (fills remaining width)
- Chart takes 80% height, volume panel 20%
- Timeframe selector sits above chart as tab row

---

## 9. Build Order (Claude Code Sequence)

Hand these to Claude Code one at a time, in order. Don't move to the next until the current one works in browser.

**Step 1 — Project scaffold**
```
Create a Next.js 14 TypeScript project with Tailwind and Zustand. Dark background (#0d0d0d). Install lightweight-charts@4 and react-query. Set up the folder structure from the spec.
```

**Step 2 — Polymarket API layer**
```
Build lib/polymarket.ts with functions: searchMarkets(query), getMarket(conditionId), getPriceHistory(tokenId, fidelity, startTs, endTs), getTrades(tokenId, since). Use native fetch with TypeScript interfaces from types/polymarket.ts. Log raw responses to console.
```

**Step 3 — Candle aggregation**
```
Build lib/candles.ts. Function aggregateTrades(trades, intervalMinutes) → CandleData[]. Each candle: time, open, high, low, close, value (volume in USDC). Sort trades by timestamp, bucket by interval, compute OHLCV per bucket.
```

**Step 4 — Search UI**
```
Build SearchBar component. Input triggers searchMarkets() on each keystroke (debounced 300ms). Show results as a dropdown list: market title, current yes price as %, 24h volume formatted as $XXk/$XXm. Click a result → sets selectedMarket in Zustand store.
```

**Step 5 — Chart component**
```
Build CandlestickChart.tsx using lightweight-charts v4. Create chart with dark background. Add candlestick series with green/red colors from spec. Add volume histogram series as separate pane. Subscribe to crosshairMove for OHLC tooltip. Accept candles prop as CandleData[].
```

**Step 6 — Wire it together**
```
Build useCandles hook: watches selectedMarket + selectedTimeframe from store, fetches+aggregates candles, passes to CandlestickChart. Add TimeframeSelector buttons (1m/5m/15m/1H/4H) that update store. Add 30s polling to refresh last candle.
```

**Step 7 — Market header + drawings**
```
Build MarketHeader with current yes/no prices, 24h volume, expiry, link to Polymarket. Build DrawingToolbar with horizontal line tool. Store drawings in localStorage keyed by market slug + timeframe.
```

**Step 8 — Polish + deploy**
```
Add loading skeletons for chart and search. Add empty state when no market selected. Add error boundary for API failures. Deploy to Vercel.
```

---

## 10. Known Limitations & Gotchas

**Thin markets will look ugly.** Markets with <$5k daily volume may have 1H or 4H candles with massive gaps or just flat lines. The volume gate (Section 2.1) is important — default it to $10k minimum, let yourself toggle it off.

**Polymarket US restriction.** The CLOB API is accessible from the US for data. Trading on Polymarket isn't legal for US residents. Since this tool is read-only and you're not executing via the API, you're in a gray area for personal use. Just don't make this a public SaaS.

**No WebSocket = slight lag.** The newest candle will be up to 30 seconds stale. Fine for 1H/4H trading; barely matters. For 1m charts it's annoying but acceptable for the MVP.

**Lightweight Charts drawing tools are basic.** The library has no native trendline or Fibonacci tool. If you want those later, you'll need to build custom drawing logic on top of the canvas (substantial work — leave for v2+).

**4H candle lookback.** Polymarket markets often don't have 2 months of history. The chart will just show whatever history exists — handle the empty-candles case gracefully (don't crash).

---

## 11. v2 Scope (Don't Build Now)

- Paper trading: enter/exit prices manually, track P&L
- Order book heatmap panel
- Indicator library: EMA, VWAP, RSI
- No-outcome token charting
- Multi-market tabs
- Trendlines, Fibonacci, ICT draw tools
- Mobile layout
- Cloud sync for drawings (requires auth → Supabase)

---

## 12. Cost (Running This for Yourself)

| Service | Cost |
|---|---|
| Vercel (hosting) | Free |
| Polymarket CLOB API | Free (public, no key) |
| Domain (optional) | ~$12/yr |
| **Total** | **$0–$12/yr** |

No backend, no database, no API keys. The entire app is a static Next.js frontend hitting a public API.
