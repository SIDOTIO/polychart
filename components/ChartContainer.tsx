"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { TimeframeSelector } from "./TimeframeSelector";
import { DrawingToolbar } from "./DrawingToolbar";
import { useCandles } from "@/hooks/useCandles";
import { useDrawings } from "@/hooks/useDrawings";
import { useChartStore } from "@/store/chartStore";
import { MarketGrid } from "./MarketGrid";

// Dynamic import to avoid SSR (Lightweight Charts uses DOM APIs)
const CandlestickChart = dynamic(
  () => import("./CandlestickChart").then((m) => ({ default: m.CandlestickChart })),
  { ssr: false }
);

export function ChartContainer() {
  const { selectedMarket, clearSelectedMarket } = useChartStore();
  const { candles, isLoading, error } = useCandles();
  const { drawings, add, clearAll } = useDrawings();
  const [drawMode, setDrawMode] = useState<"none" | "hline">("none");

  // ESC cancels draw mode; H toggles H-line
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setDrawMode("none");
      if ((e.key === "h" || e.key === "H") && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) {
        setDrawMode((m) => (m === "hline" ? "none" : "hline"));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleDrawingCreated = useCallback(
    (price: number) => {
      if (drawMode !== "hline") return;
      add(price);
      setDrawMode("none");
    },
    [drawMode, add]
  );

  // Landing page — no market selected
  if (!selectedMarket) {
    return <MarketGrid />;
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>

      {/* Toolbar row */}
      <div style={{
        height: 38,
        minHeight: 38,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 10px",
        borderBottom: "1px solid var(--border)",
        gap: 10,
      }}>
        {/* Back to markets */}
        <button
          onClick={() => clearSelectedMarket()}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "3px 9px",
            fontSize: 11,
            background: "transparent",
            color: "var(--text-muted)",
            border: "1px solid var(--border)",
            borderRadius: 4,
            cursor: "pointer",
            transition: "all 0.15s",
            flexShrink: 0,
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-light)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
          }}
        >
          <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
            <path d="M9 5H1M1 5L5 1M1 5L5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Markets
        </button>

        <TimeframeSelector />

        <DrawingToolbar
          drawMode={drawMode}
          onSetDrawMode={setDrawMode}
          drawingCount={drawings.length}
          onClearAll={clearAll}
        />
      </div>

      {/* Chart area */}
      <div style={{ flex: 1, position: "relative", minHeight: 0 }}>

        {/* Loading overlay */}
        {isLoading && candles.length === 0 && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 10,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(10,10,10,0.75)", gap: 8,
            color: "var(--text-muted)", fontSize: 12,
          }}>
            <div style={{
              width: 16, height: 16,
              border: "2px solid var(--border)",
              borderTopColor: "var(--accent)",
              borderRadius: "50%",
              animation: "spin 0.7s linear infinite",
            }} />
            Loading chart…
          </div>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 10,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            <span style={{ fontSize: 22, opacity: 0.6 }}>⚠️</span>
            <span style={{ color: "var(--red)", fontSize: 12 }}>{error}</span>
            <span style={{ color: "var(--text-muted)", fontSize: 11 }}>
              Check your connection or try a different timeframe
            </span>
          </div>
        )}

        {/* No data state */}
        {!isLoading && !error && candles.length === 0 && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 10,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            color: "var(--text-muted)", gap: 6,
          }}>
            <span style={{ fontSize: 26 }}>📉</span>
            <span style={{ fontSize: 13 }}>No chart data for this timeframe</span>
            <span style={{ fontSize: 11 }}>Try 1H or 4H — this market may have thin history</span>
          </div>
        )}

        {/* Draw mode cursor hint */}
        {drawMode === "hline" && (
          <div style={{
            position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)",
            zIndex: 20,
            display: "flex", alignItems: "center", gap: 6,
            background: "rgba(78,158,255,0.12)",
            border: "1px solid rgba(78,158,255,0.35)",
            borderRadius: 6,
            padding: "5px 12px",
            color: "var(--accent)",
            fontSize: 11, fontWeight: 500,
            pointerEvents: "none",
          }}>
            <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
              <line x1="0" y1="4" x2="12" y2="4" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2"/>
              <circle cx="6" cy="4" r="1.8" fill="currentColor"/>
            </svg>
            Click chart to place line · ESC to cancel
          </div>
        )}

        <CandlestickChart
          candles={candles}
          drawings={drawings}
          drawMode={drawMode}
          onDrawingCreated={handleDrawingCreated}
          onDrawingRemoved={(id) => {
            console.log("remove drawing", id);
          }}
        />
      </div>
    </div>
  );
}
