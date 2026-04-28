import type {
  Market,
  Token,
  PriceHistoryResponse,
  PriceHistoryPoint,
  TradesResponse,
  Trade,
} from "@/types/polymarket";

// All requests go through our own Next.js API routes (server-side proxies)
// so there are zero CORS issues regardless of environment.
const API = "/api";

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(path, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API error ${res.status}: ${path} — ${body}`);
  }
  return res.json() as Promise<T>;
}

// ─── Gamma API shape → our Market type ───────────────────────────────────────

interface GammaMarket {
  id: string;
  question: string;
  conditionId?: string;
  condition_id?: string;
  slug?: string;
  market_slug?: string;
  endDateIso?: string;
  end_date_iso?: string;
  liquidity?: string | number;
  volume?: string | number;
  volume24hr?: number;
  volume_24hr?: number;
  active: boolean;
  closed: boolean;
  tokens: Token[];
  image?: string;
  icon?: string;
  description?: string;
  makerBaseFee?: number;
  takerBaseFee?: number;
  maker_base_fee?: number;
  taker_base_fee?: number;
  negRisk?: boolean;
  neg_risk?: boolean;
}

function gammaToMarket(g: GammaMarket): Market {
  return {
    condition_id: g.conditionId ?? g.condition_id ?? g.id,
    question_id: g.id,
    question: g.question,
    description: g.description ?? "",
    market_slug: g.slug ?? g.market_slug ?? "",
    end_date_iso: g.endDateIso ?? g.end_date_iso ?? "",
    maker_base_fee: g.makerBaseFee ?? g.maker_base_fee ?? 0,
    taker_base_fee: g.takerBaseFee ?? g.taker_base_fee ?? 0,
    notifications_enabled: false,
    neg_risk: g.negRisk ?? g.neg_risk ?? false,
    tokens: g.tokens ?? [],
    volume: String(g.volume ?? 0),
    volume_24hr: g.volume24hr ?? g.volume_24hr ?? 0,
    liquidity: String(g.liquidity ?? 0),
    active: g.active,
    closed: g.closed,
    archived: false,
    accepting_orders: true,
    minimum_order_size: 5,
    minimum_tick_size: 0.01,
    enable_order_book: true,
    image: g.image,
    icon: g.icon,
  };
}

// ─── Search Markets ───────────────────────────────────────────────────────────

export async function searchMarkets(query: string): Promise<Market[]> {
  if (!query.trim()) return [];
  const params = new URLSearchParams({
    search: query.trim(),
    active: "true",
    closed: "false",
    limit: "20",
  });
  const data = await apiFetch<GammaMarket[]>(`${API}/markets?${params}`);
  return (Array.isArray(data) ? data : [])
    .map(gammaToMarket)
    .filter((m) => m.tokens.length >= 2);
}

// ─── Popular Markets ──────────────────────────────────────────────────────────

export async function getPopularMarkets(limit = 20): Promise<Market[]> {
  const params = new URLSearchParams({
    active: "true",
    closed: "false",
    order: "volume24hr",
    ascending: "false",
    limit: String(limit),
  });
  const data = await apiFetch<GammaMarket[]>(`${API}/markets?${params}`);
  return (Array.isArray(data) ? data : [])
    .map(gammaToMarket)
    .filter((m) => m.tokens.length >= 2 && m.volume_24hr > 1000);
}

// ─── Get Single Market (for live header refresh) ──────────────────────────────

export async function getMarket(conditionId: string): Promise<Market> {
  return apiFetch<Market>(`${API}/clob-market?id=${encodeURIComponent(conditionId)}`);
}

// ─── Price History ────────────────────────────────────────────────────────────

export async function getPriceHistory(
  tokenId: string,
  fidelity: number,
  startTs: number,
  endTs: number
): Promise<PriceHistoryPoint[]> {
  const params = new URLSearchParams({
    market: tokenId,
    startTs: String(startTs),
    endTs: String(endTs),
    fidelity: String(fidelity),
  });
  const data = await apiFetch<PriceHistoryResponse>(`${API}/prices-history?${params}`);
  return data.history ?? [];
}

// ─── Trades ───────────────────────────────────────────────────────────────────

export async function getTrades(
  tokenId: string,
  since?: number
): Promise<Trade[]> {
  const params = new URLSearchParams({ market: tokenId, limit: "500" });
  if (since) params.set("after", String(since));

  const trades: Trade[] = [];
  let cursor: string | undefined;

  while (true) {
    if (cursor) params.set("next_cursor", cursor);
    const data = await apiFetch<TradesResponse>(`${API}/trades?${params}`);
    trades.push(...(data.data ?? []));
    if (!data.next_cursor || data.next_cursor === "LTE=" || data.data.length === 0) break;
    cursor = data.next_cursor;
    if (trades.length > 5000) break;
  }

  return trades;
}
