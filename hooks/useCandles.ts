import { useState, useEffect, useRef, useCallback } from "react";
import { useChartStore } from "@/store/chartStore";
import { getPriceHistory, getTrades } from "@/lib/polymarket";
import { aggregateTrades, priceHistoryToCandles, mergeCandles } from "@/lib/candles";
import { TIMEFRAMES } from "@/types/polymarket";
import type { CandleData } from "@/types/polymarket";

const POLL_INTERVAL_MS = 30_000;
const MIN_TRADES_FOR_OHLCV = 50;

export function useCandles(): { candles: CandleData[]; isLoading: boolean; error: string | null } {
  const {
    selectedToken,
    selectedTimeframe,
    setCandles,
    getCachedCandles,
  } = useChartStore();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candles, setLocalCandles] = useState<CandleData[]>([]);

  const candlesRef = useRef<CandleData[]>([]);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeTokenRef = useRef<string | null>(null);

  const fetchCandles = useCallback(
    async (tokenId: string, isRefresh = false) => {
      const config = TIMEFRAMES[selectedTimeframe];
      const now = Date.now();
      const startTs = Math.floor((now - config.lookbackMs) / 1000);
      const endTs   = Math.floor(now / 1000);

      if (!isRefresh) setIsLoading(true);

      try {
        const [historyResult, tradesResult] = await Promise.allSettled([
          getPriceHistory(tokenId, config.fidelity, startTs, endTs),
          getTrades(tokenId, startTs),
        ]);

        // Bail early if a different token was selected while fetching
        if (activeTokenRef.current !== tokenId) return;

        const historyPoints = historyResult.status === "fulfilled" ? historyResult.value : [];
        const tradeList     = tradesResult.status  === "fulfilled" ? tradesResult.value  : [];

        let newCandles: CandleData[] = [];

        if (tradeList.length >= MIN_TRADES_FOR_OHLCV) {
          newCandles = aggregateTrades(tradeList, config.intervalMinutes);
        } else if (historyPoints.length > 0) {
          newCandles = priceHistoryToCandles(historyPoints, config.intervalMinutes);
        }

        if (isRefresh && candlesRef.current.length > 0) {
          newCandles = mergeCandles(candlesRef.current, newCandles);
        }

        if (newCandles.length > 0) {
          candlesRef.current = newCandles;
          setCandles(tokenId, selectedTimeframe, newCandles);
          setLocalCandles(newCandles);
          setError(null);
        }
      } catch (err) {
        console.error("[useCandles] fetch error:", err);
        if (!isRefresh) setError("Failed to load chart data.");
      } finally {
        if (!isRefresh) setIsLoading(false);
      }
    },
    [selectedTimeframe, setCandles]
  );

  useEffect(() => {
    if (!selectedToken) {
      setLocalCandles([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    const tokenId = selectedToken.token_id;
    activeTokenRef.current = tokenId;

    // Clear previous state when switching markets/timeframes
    setLocalCandles([]);
    setError(null);
    candlesRef.current = [];

    // Clear any existing poll
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }

    // Check store cache first
    const cached = getCachedCandles(tokenId, selectedTimeframe);
    if (cached && cached.length > 0) {
      candlesRef.current = cached;
      setLocalCandles(cached);
    } else {
      // Initial fetch
      fetchCandles(tokenId, false);
    }

    // Poll every 30s to refresh the latest candle
    pollTimerRef.current = setInterval(() => {
      fetchCandles(tokenId, true);
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedToken?.token_id, selectedTimeframe]);

  return { candles, isLoading, error };
}
