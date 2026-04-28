// ─── Market ──────────────────────────────────────────────────────────────────

export interface Market {
  condition_id: string;
  question_id: string;
  question: string;
  description: string;
  market_slug: string;
  end_date_iso: string;
  game_start_time?: string;
  seconds_delay?: number;
  fpmm?: string;
  maker_base_fee: number;
  taker_base_fee: number;
  notifications_enabled: boolean;
  neg_risk: boolean;
  neg_risk_market_id?: string;
  neg_risk_request_id?: string;
  icon?: string;
  image?: string;
  tokens: Token[];
  tags?: Tag[];
  rewards?: Rewards;
  volume: string;
  volume_24hr: number;
  liquidity: string;
  active: boolean;
  closed: boolean;
  archived: boolean;
  accepting_orders: boolean;
  accepting_order_timestamp?: string;
  minimum_order_size: number;
  minimum_tick_size: number;
  enable_order_book: boolean;
}

export interface Token {
  token_id: string;
  outcome: string;
  price: number;
  winner: boolean;
}

export interface Tag {
  id: string;
  label: string;
  slug: string;
}

export interface Rewards {
  rates?: RewardRate[];
  min_size: number;
  max_spread: number;
}

export interface RewardRate {
  asset_address: string;
  rewards_daily_rate: number;
}

// ─── Price History ────────────────────────────────────────────────────────────

export interface PriceHistoryPoint {
  t: number;   // Unix timestamp (seconds)
  p: number;   // Price (0–1)
}

export interface PriceHistoryResponse {
  history: PriceHistoryPoint[];
}

// ─── Trade ───────────────────────────────────────────────────────────────────

export interface Trade {
  id: string;
  taker_order_id: string;
  market: string;
  asset_id: string;
  side: "BUY" | "SELL";
  size: string;       // USDC amount
  fee_rate_bps: string;
  price: string;      // 0–1
  status: string;
  match_time: string; // ISO timestamp
  last_update: string;
  outcome: string;
  bucket_index: number;
  owner: string;
  maker_orders: MakerOrder[];
  type: string;
}

export interface MakerOrder {
  order_id: string;
  maker_address: string;
  matched_amount: string;
  fee_rate_bps: string;
}

export interface TradesResponse {
  data: Trade[];
  limit: number;
  count: number;
  next_cursor?: string;
}

// ─── Candle ───────────────────────────────────────────────────────────────────

export interface CandleData {
  time: number;   // Unix timestamp (seconds) — required by Lightweight Charts
  open: number;
  high: number;
  low: number;
  close: number;
  value: number;  // volume in USDC
}

// ─── Timeframe ────────────────────────────────────────────────────────────────

export type Timeframe = "1m" | "5m" | "15m" | "1H" | "4H";

export interface TimeframeConfig {
  label: Timeframe;
  intervalMinutes: number;
  fidelity: number;        // API fidelity param (minutes per bucket)
  lookbackMs: number;      // How far back to fetch
}

export const TIMEFRAMES: Record<Timeframe, TimeframeConfig> = {
  "1m":  { label: "1m",  intervalMinutes: 1,   fidelity: 1,   lookbackMs: 6 * 60 * 60 * 1000 },
  "5m":  { label: "5m",  intervalMinutes: 5,   fidelity: 5,   lookbackMs: 24 * 60 * 60 * 1000 },
  "15m": { label: "15m", intervalMinutes: 15,  fidelity: 15,  lookbackMs: 3 * 24 * 60 * 60 * 1000 },
  "1H":  { label: "1H",  intervalMinutes: 60,  fidelity: 60,  lookbackMs: 14 * 24 * 60 * 60 * 1000 },
  "4H":  { label: "4H",  intervalMinutes: 240, fidelity: 240, lookbackMs: 60 * 24 * 60 * 60 * 1000 },
};

// ─── Search Result ────────────────────────────────────────────────────────────

export interface MarketSearchResult {
  market: Market;
  yesToken: Token;
  noToken?: Token;
}
