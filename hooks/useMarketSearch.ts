import { useState, useEffect, useRef } from "react";
import { searchMarkets } from "@/lib/polymarket";
import type { Market } from "@/types/polymarket";

const DEBOUNCE_MS = 300;
const MIN_VOLUME_DEFAULT = 10_000;

export interface UseMarketSearchOptions {
  minVolume?: number;
  enabled?: boolean;
}

export interface UseMarketSearchResult {
  results: Market[];
  isLoading: boolean;
  error: string | null;
  query: string;
  setQuery: (q: string) => void;
}

export function useMarketSearch(options: UseMarketSearchOptions = {}): UseMarketSearchResult {
  const { minVolume = MIN_VOLUME_DEFAULT, enabled = true } = options;

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Market[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track in-flight request so we can cancel stale ones
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled || query.trim().length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    // Clear any pending debounce
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      // Cancel previous in-flight request
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setIsLoading(true);
      setError(null);

      try {
        const markets = await searchMarkets(query);
        // Apply volume gate
        const filtered = minVolume > 0
          ? markets.filter((m) => m.volume_24hr >= minVolume)
          : markets;
        setResults(filtered);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return; // stale request cancelled
        setError("Search failed. Check your connection.");
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, minVolume, enabled]);

  return { results, isLoading, error, query, setQuery };
}
