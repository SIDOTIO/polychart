import { useState, useEffect } from "react";
import { getPopularMarkets } from "@/lib/polymarket";
import type { Market } from "@/types/polymarket";

export function usePopularMarkets() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    getPopularMarkets(20)
      .then((data) => {
        if (!cancelled) { setMarkets(data); setError(null); }
      })
      .catch(() => {
        if (!cancelled) setError("Could not load markets.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return { markets, isLoading, error };
}
