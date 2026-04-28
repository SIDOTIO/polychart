import { useEffect, useRef, useCallback } from "react";
import { useChartStore } from "@/store/chartStore";
import { getPriceHistory, getTrades } from "@/lib/polymarket";
import { aggregateTrades, priceHistoryToCandles, mergeCandles } from "@/lib/candles";
import { TIMEFRAMES } from "@/types/polymarket";
import type { CandleData } from "@/types/polymarket";

const POLL_INTERVAL_MS = 30_000;
// Minimum trades to prefer trade aggregation over price history
const MIN_TRADES_FOR_OHLCV = 50;

export function useCandles(): { candles: CandleData[]; isLoading: boolean; error: string | null } {
  const {
    selectedToken,
    selectedTimeframe,
    setCandles,
    getCachedCandles,
  } = useChartStore();

  const loadingRef = useRef(false);
  const errorRef = useRef<string | null>(null);
  const candlesRef = useRef<CandleData[]>([]);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // We use a forceUpdate trick to re-render without extra state
  const storeCandles = selectedToken
    ? getCachedCandles(selectedToken.token_id, selectedTimeframe)
    : null;
  const candles = storeCandles ?? [];

  const fetchCandles = useCallback(
    async (tokenId: string, isRefresh = false) => {
      if (loadingRef.current && !isRefresh) return;
      loadingRef.current = true;

      const config = TIMEFRAMES[selectedTimeframe];
      const now = Date.now();
      const startTs = Math.floor((now - config.lookbackMs) / 1000);
      const endTs = Math.floor(now / 1000);

      try {
        // Strategy:
        // 1. Always fetch price history (fast, reliable, no pagination)
        // 2. Also fetch trades for the lookback window
        // 3. If we got enough trades, use trade aggregation (real wicks)
        //    Otherwise fall back to price history candles

        const [history, trades] = await Promise.allSettled([
          getPriceHistory(tokenId, config.fidelity, startTs, endTs),
          getTrades(tokenId, startTs),
        ]);

        let newCandles: CandleData[] = [];

        const historyPoints = history.status === "fulfilled" ? history.value : [];
        const tradeList = trades.status === "fulfilled" ? trades.value : [];

        if (tradeList.length >= MIN_TRADES_FOR_OHLCV) {
          // Use real OHLCV from trades
          newCandles = aggregateTrades(tradeList, config.intervalMinutes);
        } else if (historyPoints.length > 0) {
          // Fall back to price history synthetic candles
          newCandles = priceHistoryToCandles(historyPoints, config.intervalMinutes);
        }

        if (isRefresh && candlesRef.current.length > 0) {
          newCandles = mergeCandles(candlesRef.current, newCandles);
        }

        if (newCandles.length > 0) {
          candlesRef.current = newCandles;
          setCandles(tokenId, selectedTimeframe, newCandles);
          errorRef.current = null;
        }
      } catch (err) {
        console.error("[useCandles] fetch error:", err);
        errorRef.current = "Failed to load chart data.";
      } finally {
        loadingRef.current = false;
      }
    },
    [selectedTimeframe, setCandles]
  );

  // Full fetch when token or timeframe changes
  useEffect(() => {
    if (!selectedToken) return;

    const tokenId = selectedToken.token_id;

    // Check cache first
    const cached = getCachedCandles(tokenId, selectedTimeframe);
    if (cached) {
      candlesRef.current = cached;
      return; // Already have fresh data
    }

    fetchCandles(tokenId, false);

    // Set up 30s polling
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    pollTimerRef.current = setInterval(() => {
      fetchCandles(tokenId, true);
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [selectedToken?.token_id, selectedTimeframe, fetchCandles, getCachedCandles]);

  return {
    candles,
    isLoading: loadingRef.current,
    error: errorRef.current,
  };
}
