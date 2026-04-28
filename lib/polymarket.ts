import type {
  Market,
  Token,
  PriceHistoryResponse,
  PriceHistoryPoint,
  TradesResponse,
  Trade,
} from "@/types/polymarket";

const CLOB_URL = "https://clob.polymarket.com";
const GAMMA_URL = "https://gamma-api.polymarket.com";

// ─── Rate limiter (CLOB only — 1 req/sec) ────────────────────────────────────

let lastClobRequest = 0;
async function clobRateLimit() {
  const now = Date.now();
  const wait = 1000 - (now - lastClobRequest);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastClobRequest = Date.now();
}

async function clobFetch<T>(path: string): Promise<T> {
  await clobRateLimit();
  const url = `${CLOB_URL}${path}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`CLOB error ${res.status}: ${url}`);
  return res.json() as Promise<T>;
}

async function gammaFetch<T>(path: string): Promise<T> {
  const url = `${GAMMA_URL}${path}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Gamma error ${res.status}: ${url}`);
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
  liquidity: string | number;
  volume: string | number;
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

// ─── Search Markets (Gamma API — supports keyword search) ─────────────────────

export async function searchMarkets(query: string): Promise<Market[]> {
  if (!query.trim()) return [];
  const encoded = encodeURIComponent(query.trim());
  const data = await gammaFetch<GammaMarket[]>(
    `/markets?search=${encoded}&active=true&closed=false&limit=20`
  );
  return (Array.isArray(data) ? data : [])
    .map(gammaToMarket)
    .filter((m) => m.tokens.length >= 2);
}

// ─── Popular Markets (Gamma API — sorted by 24h volume) ───────────────────────

export async function getPopularMarkets(limit = 20): Promise<Market[]> {
  const data = await gammaFetch<GammaMarket[]>(
    `/markets?active=true&closed=false&order=volume24hr&ascending=false&limit=${limit}`
  );
  return (Array.isArray(data) ? data : [])
    .map(gammaToMarket)
    .filter((m) => m.tokens.length >= 2 && m.volume_24hr > 1000);
}

// ─── Get Single Market (CLOB — needed for live price refresh) ─────────────────

export async function getMarket(conditionId: string): Promise<Market> {
  return clobFetch<Market>(`/markets/${conditionId}`);
}

// ─── Price History ────────────────────────────────────────────────────────────

export async function getPriceHistory(
  tokenId: string,
  fidelity: number,
  startTs: number,
  endTs: number
): Promise<PriceHistoryPoint[]> {
  const data = await clobFetch<PriceHistoryResponse>(
    `/prices-history?market=${tokenId}&startTs=${startTs}&endTs=${endTs}&fidelity=${fidelity}`
  );
  return data.history ?? [];
}

// ─── Trades ───────────────────────────────────────────────────────────────────

export async function getTrades(
  tokenId: string,
  since?: number
): Promise<Trade[]> {
  let path = `/trades?market=${tokenId}&limit=500`;
  if (since) path += `&after=${since}`;

  const trades: Trade[] = [];
  let cursor: string | undefined;

  while (true) {
    const url = cursor ? `${path}&next_cursor=${cursor}` : path;
    const data = await clobFetch<TradesResponse>(url);
    trades.push(...(data.data ?? []));
    if (!data.next_cursor || data.next_cursor === "LTE=" || data.data.length === 0) break;
    cursor = data.next_cursor;
    if (trades.length > 5000) break;
  }

  return trades;
}
