import type {
  Market,
  PriceHistoryResponse,
  PriceHistoryPoint,
  TradesResponse,
  Trade,
} from "@/types/polymarket";

const BASE_URL = "https://clob.polymarket.com";

// Simple rate limiter — max 1 req/sec per "slot"
let lastRequestTime = 0;
async function rateLimit() {
  const now = Date.now();
  const wait = 1000 - (now - lastRequestTime);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestTime = Date.now();
}

async function apiFetch<T>(path: string): Promise<T> {
  await rateLimit();
  const url = `${BASE_URL}${path}`;
  console.log("[polymarket] GET", url);
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Polymarket API error ${res.status}: ${res.statusText} — ${url}`);
  }
  return res.json() as Promise<T>;
}

// ─── Search Markets ───────────────────────────────────────────────────────────

export async function searchMarkets(query: string): Promise<Market[]> {
  if (!query.trim()) return [];
  const encoded = encodeURIComponent(query.trim());
  const data = await apiFetch<{ data: Market[]; limit: number; count: number; next_cursor?: string }>(
    `/markets?search=${encoded}&active=true&closed=false&limit=20`
  );
  // Filter to markets with at least some volume
  return (data.data ?? []).filter((m) => m.volume_24hr > 0);
}

// ─── Get Single Market ────────────────────────────────────────────────────────

export async function getMarket(conditionId: string): Promise<Market> {
  return apiFetch<Market>(`/markets/${conditionId}`);
}

// ─── Price History ────────────────────────────────────────────────────────────

export async function getPriceHistory(
  tokenId: string,
  fidelity: number,
  startTs: number,
  endTs: number
): Promise<PriceHistoryPoint[]> {
  const data = await apiFetch<PriceHistoryResponse>(
    `/prices-history?market=${tokenId}&startTs=${startTs}&endTs=${endTs}&fidelity=${fidelity}`
  );
  return data.history ?? [];
}

// ─── Trades ───────────────────────────────────────────────────────────────────

export async function getTrades(
  tokenId: string,
  since?: number // Unix timestamp in seconds
): Promise<Trade[]> {
  let path = `/trades?market=${tokenId}&limit=500`;
  if (since) path += `&after=${since}`;

  const trades: Trade[] = [];
  let cursor: string | undefined;

  // Paginate through all results
  while (true) {
    const url = cursor ? `${path}&next_cursor=${cursor}` : path;
    const data = await apiFetch<TradesResponse>(url);
    trades.push(...(data.data ?? []));

    if (!data.next_cursor || data.next_cursor === "LTE=" || data.data.length === 0) break;
    cursor = data.next_cursor;

    // Safety cap — don't paginate more than 10 pages
    if (trades.length > 5000) break;
  }

  return trades;
}
