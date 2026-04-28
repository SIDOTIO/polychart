import type { Trade, CandleData, PriceHistoryPoint } from "@/types/polymarket";

// ─── Aggregate raw trades into OHLCV candles ──────────────────────────────────

export function aggregateTrades(
  trades: Trade[],
  intervalMinutes: number
): CandleData[] {
  if (trades.length === 0) return [];

  const intervalMs = intervalMinutes * 60 * 1000;

  // Sort trades oldest → newest
  const sorted = [...trades].sort(
    (a, b) => new Date(a.match_time).getTime() - new Date(b.match_time).getTime()
  );

  // Bucket by interval
  const buckets = new Map<number, { prices: number[]; volumes: number[] }>();

  for (const trade of sorted) {
    const ts = new Date(trade.match_time).getTime();
    const bucketTs = Math.floor(ts / intervalMs) * intervalMs;
    const price = parseFloat(trade.price);
    const volume = parseFloat(trade.size);

    if (!buckets.has(bucketTs)) {
      buckets.set(bucketTs, { prices: [], volumes: [] });
    }
    const bucket = buckets.get(bucketTs)!;
    bucket.prices.push(price);
    bucket.volumes.push(volume);
  }

  // Convert buckets → CandleData
  const candles: CandleData[] = [];
  for (const [bucketTs, { prices, volumes }] of buckets) {
    if (prices.length === 0) continue;
    candles.push({
      time: Math.floor(bucketTs / 1000) as unknown as number, // seconds for LW Charts
      open: prices[0],
      high: Math.max(...prices),
      low: Math.min(...prices),
      close: prices[prices.length - 1],
      value: volumes.reduce((a, b) => a + b, 0),
    });
  }

  // Deduplicate and sort — use Number() to guard against string-typed timestamps from JSON
  const deduped = new Map<number, CandleData>();
  for (const c of candles) deduped.set(Number(c.time), { ...c, time: Number(c.time) });
  return Array.from(deduped.values()).sort((a, b) => Number(a.time) - Number(b.time));
}

// ─── Convert price history points to candles ──────────────────────────────────
// Used as a fallback when trade data is sparse. Price history gives us
// close prices per bucket; we synthesize OHLC from adjacent closes.

export function priceHistoryToCandles(
  points: PriceHistoryPoint[],
  intervalMinutes: number
): CandleData[] {
  if (points.length === 0) return [];

  // Deduplicate points by timestamp before processing
  const seen = new Map<number, PriceHistoryPoint>();
  for (const p of points) seen.set(p.t, p);
  const sorted = Array.from(seen.values()).sort((a, b) => a.t - b.t);
  const candles: CandleData[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const curr = sorted[i];
    const prev = sorted[i - 1];
    const next = sorted[i + 1];

    const open = prev ? prev.p : curr.p;
    const close = curr.p;
    const high = Math.max(open, close, next?.p ?? close);
    const low = Math.min(open, close, next?.p ?? close);

    candles.push({
      time: curr.t as unknown as number,
      open,
      high,
      low,
      close,
      value: 0, // no volume info from price history
    });
  }

  return candles;
}

// ─── Merge new candles into existing dataset ──────────────────────────────────
// Used for the 30s polling update — merge fresh candles without full re-fetch.

export function mergeCandles(
  existing: CandleData[],
  incoming: CandleData[]
): CandleData[] {
  const map = new Map<number, CandleData>();

  for (const c of existing) map.set(Number(c.time), { ...c, time: Number(c.time) });
  for (const c of incoming) map.set(Number(c.time), { ...c, time: Number(c.time) }); // incoming overwrites

  return Array.from(map.values()).sort((a, b) => Number(a.time) - Number(b.time));
}
