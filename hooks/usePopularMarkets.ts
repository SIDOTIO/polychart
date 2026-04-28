import { useState, useEffect, useCallback } from "react";
import { getPopularMarkets, searchMarkets } from "@/lib/polymarket";
import type { Market } from "@/types/polymarket";

export type Category = "top" | "politics" | "crypto" | "sports" | "finance";

const CATEGORY_QUERIES: Record<Category, string | null> = {
  top:      null,
  politics: "election president trump congress senate",
  crypto:   "bitcoin ethereum crypto BTC ETH",
  sports:   "nba nfl mlb nhl champions cup",
  finance:  "fed rate inflation GDP recession",
};

export function usePopularMarkets(category: Category = "top") {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let data: Market[];
      const query = CATEGORY_QUERIES[category];
      if (query) {
        data = await searchMarkets(query);
        // Supplement with popular if not enough results
        if (data.length < 8) {
          const popular = await getPopularMarkets(20);
          const existingIds = new Set(data.map(m => m.condition_id));
          data = [...data, ...popular.filter(m => !existingIds.has(m.condition_id))];
        }
      } else {
        data = await getPopularMarkets(24);
      }
      setMarkets(data);
    } catch {
      setError("Could not load markets. Check your connection.");
    } finally {
      setIsLoading(false);
    }
  }, [category]);

  useEffect(() => { fetch(); }, [fetch]);

  return { markets, isLoading, error, refetch: fetch };
}
