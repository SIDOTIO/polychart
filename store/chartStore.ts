import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Market, Token, Timeframe, CandleData } from "@/types/polymarket";

export interface Drawing {
  id: string;
  type: "hline";
  price: number;
  label?: string;
  color?: string;
}

interface ChartState {
  // Selected market + token
  selectedMarket: Market | null;
  selectedToken: Token | null;

  // Timeframe
  selectedTimeframe: Timeframe;

  // Candle cache: key = `${tokenId}:${timeframe}`
  candleCache: Record<string, { candles: CandleData[]; fetchedAt: number }>;

  // Drawings: key = `${marketSlug}:${timeframe}`
  drawings: Record<string, Drawing[]>;

  // Actions
  setSelectedMarket: (market: Market, token: Token) => void;
  clearSelectedMarket: () => void;
  setSelectedTimeframe: (tf: Timeframe) => void;
  setCandles: (tokenId: string, timeframe: Timeframe, candles: CandleData[]) => void;
  getCachedCandles: (tokenId: string, timeframe: Timeframe) => CandleData[] | null;
  addDrawing: (marketSlug: string, timeframe: Timeframe, drawing: Drawing) => void;
  updateDrawing: (marketSlug: string, timeframe: Timeframe, id: string, update: Partial<Drawing>) => void;
  removeDrawing: (marketSlug: string, timeframe: Timeframe, id: string) => void;
  getDrawings: (marketSlug: string, timeframe: Timeframe) => Drawing[];
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const useChartStore = create<ChartState>()(
  persist(
    (set, get) => ({
      selectedMarket: null,
      selectedToken: null,
      selectedTimeframe: "1H",
      candleCache: {},
      drawings: {},

      setSelectedMarket: (market, token) =>
        set({ selectedMarket: market, selectedToken: token }),

      clearSelectedMarket: () =>
        set({ selectedMarket: null, selectedToken: null }),

      setSelectedTimeframe: (tf) =>
        set({ selectedTimeframe: tf }),

      setCandles: (tokenId, timeframe, candles) =>
        set((state) => ({
          candleCache: {
            ...state.candleCache,
            [`${tokenId}:${timeframe}`]: { candles, fetchedAt: Date.now() },
          },
        })),

      getCachedCandles: (tokenId, timeframe) => {
        const entry = get().candleCache[`${tokenId}:${timeframe}`];
        if (!entry) return null;
        if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) return null;
        return entry.candles;
      },

      addDrawing: (marketSlug, timeframe, drawing) =>
        set((state) => {
          const key = `${marketSlug}:${timeframe}`;
          return {
            drawings: {
              ...state.drawings,
              [key]: [...(state.drawings[key] ?? []), drawing],
            },
          };
        }),

      updateDrawing: (marketSlug, timeframe, id, update) =>
        set((state) => {
          const key = `${marketSlug}:${timeframe}`;
          return {
            drawings: {
              ...state.drawings,
              [key]: (state.drawings[key] ?? []).map((d) =>
                d.id === id ? { ...d, ...update } : d
              ),
            },
          };
        }),

      removeDrawing: (marketSlug, timeframe, id) =>
        set((state) => {
          const key = `${marketSlug}:${timeframe}`;
          return {
            drawings: {
              ...state.drawings,
              [key]: (state.drawings[key] ?? []).filter((d) => d.id !== id),
            },
          };
        }),

      getDrawings: (marketSlug, timeframe) =>
        get().drawings[`${marketSlug}:${timeframe}`] ?? [],
    }),
    {
      name: "polychart-store",
      // Only persist user preferences + drawings, not candle cache
      partialize: (state) => ({
        selectedTimeframe: state.selectedTimeframe,
        drawings: state.drawings,
        // Persist last market for restore on next visit
        selectedMarket: state.selectedMarket,
        selectedToken: state.selectedToken,
      }),
    }
  )
);
