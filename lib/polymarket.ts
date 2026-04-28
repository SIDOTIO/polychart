import type {
  Market,
  Token,
  PriceHistoryResponse,
  PriceHistoryPoint,
  TradesResponse,
  Trade,
} from "@/types/polymarket";

const API = "/api";

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(path, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API error ${res.status}: ${path} — ${body}`);
  }
  return res.json() as Promise<T>;
}

// ─── Gamma API shape ──────────────────────────────────────────────────────────
// Key insight: outcomes, outcomePrices, clobTokenIds are JSON-encoded STRINGS
// e.g. outcomes = "[\"Yes\", \"No\"]"  NOT an array

interface GammaMarket {
  id: string;
  question: string;
  conditionId?: string;
  slug?: string;
  endDateIso?: string;
  liquidity?: string | number;
  volume?: string | number;
  volume24hr?: number;
  active: boolean;
  closed: boolean;
  outcomes?: string;        // JSON string: "[\"Yes\", \"No\"]"
  outcomePrices?: string;   // JSON string: "[\"0.535\", \"0.465\"]"
  clobTokenIds?: string;    // JSON string: "[\"tokenId1\", \"tokenId2\"]"
  image?: string;
  icon?: string;
  description?: string;
  makerBaseFee?: number;
  takerBaseFee?: number;
  negRisk?: boolean;
}

function parseJsonArr<T>(s: string | undefined): T[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function gammaToMarket(g: GammaMarket): Market {
  const outcomeNames = parseJsonArr<string>(g.outcomes);
  const prices       = parseJsonArr<string>(g.outcomePrices);
  const tokenIds     = parseJsonArr<string>(g.clobTokenIds);

  const tokens: Token[] = tokenIds.map((id, i) => ({
    token_id: id,
    outcome:  outcomeNames[i] ?? (i === 0 ? "Yes" : "No"),
    price:    parseFloat(prices[i] ?? "0"),
    winner:   false,
  }));

  return {
    condition_id:           g.conditionId ?? g.id,
    question_id:            g.id,
    question:               g.question,
    description:            g.description ?? "",
    market_slug:            g.slug ?? "",
    end_date_iso:           g.endDateIso ?? "",
    maker_base_fee:         g.makerBaseFee ?? 0,
    taker_base_fee:         g.takerBaseFee ?? 0,
    notifications_enabled:  false,
    neg_risk:               g.negRisk ?? false,
    tokens,
    volume:                 String(g.volume ?? 0),
    volume_24hr:            g.volume24hr ?? 0,
    liquidity:              String(g.liquidity ?? 0),
    active:                 g.active,
    closed:                 g.closed,
    archived:               false,
    accepting_orders:       true,
    minimum_order_size:     5,
    minimum_tick_size:      0.01,
    enable_order_book:      true,
    image:                  g.image,
    icon:                   g.icon,
  };
}

// ─── Search ───────────────────────────────────────────────────────────────────

export async function searchMarkets(query: string): Promise<Market[]> {
  if (!query.trim()) return [];
  const params = new URLSearchParams({
    search: query.trim(),
    active: "true",
    closed: "false",
    limit:  "20",
  });
  const data = await apiFetch<GammaMarket[]>(`${API}/markets?${params}`);
  return (Array.isArray(data) ? data : [])
    .map(gammaToMarket)
    .filter((m) => m.tokens.length >= 2);
}

// ─── Popular ──────────────────────────────────────────────────────────────────

export async function getPopularMarkets(limit = 20): Promise<Market[]> {
  const params = new URLSearchParams({
    active:     "true",
    closed:     "false",
    order:      "volume24hr",
    ascending:  "false",
    limit:      String(limit),
  });
  const data = await apiFetch<GammaMarket[]>(`${API}/markets?${params}`);
  return (Array.isArray(data) ? data : [])
    .map(gammaToMarket)
    .filter((m) => m.tokens.length >= 2 && m.volume_24hr > 1000);
}

// ─── Single market (live header refresh) ─────────────────────────────────────

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
    market:   tokenId,
    startTs:  String(startTs),
    endTs:    String(endTs),
    fidelity: String(fidelity),
  });
  const data = await apiFetch<PriceHistoryResponse>(`${API}/prices-history?${params}`);
  return data.history ?? [];
}

// ─── Trades ───────────────────────────────────────────────────────────────────

export async function getTrades(tokenId: string, since?: number): Promise<Trade[]> {
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
