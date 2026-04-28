"use client";

import { useChartStore } from "@/store/chartStore";
import type { Timeframe } from "@/types/polymarket";

const TIMEFRAMES: Timeframe[] = ["1m", "5m", "15m", "1H", "4H"];

export function TimeframeSelector() {
  const { selectedTimeframe, setSelectedTimeframe } = useChartStore();

  return (
    <div style={{ display: "flex", gap: 2 }}>
      {TIMEFRAMES.map((tf) => {
        const isActive = tf === selectedTimeframe;
        return (
          <button
            key={tf}
            onClick={() => setSelectedTimeframe(tf)}
            style={{
              padding: "3px 9px",
              fontSize: 12,
              fontWeight: isActive ? 600 : 400,
              background: isActive ? "var(--bg-elevated)" : "transparent",
              color: isActive ? "var(--accent)" : "var(--text-muted)",
              border: isActive ? "1px solid var(--border)" : "1px solid transparent",
              borderRadius: 4,
              cursor: "pointer",
              transition: "all 0.1s",
              fontVariantNumeric: "tabular-nums",
            }}
            onMouseEnter={(e) => {
              if (!isActive)
                (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              if (!isActive)
                (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
            }}
          >
            {tf}
          </button>
        );
      })}
    </div>
  );
}
