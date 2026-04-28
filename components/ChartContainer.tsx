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
  const { selectedMarket } = useChartStore();
  const { candles, isLoading, error } = useCandles();
  const { drawings, add, clearAll } = useDrawings();
  const [drawMode, setDrawMode] = useState<"none" | "hline">("none");

  // ESC cancels draw mode
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setDrawMode("none");
      if (e.key === "h" || e.key === "H") setDrawMode((m) => m === "hline" ? "none" : "hline");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleDrawingCreated = useCallback(
    (price: number) => {
      if (drawMode !== "hline") return;
      add(price);
      setDrawMode("none"); // return to normal after placing
    },
    [drawMode, add]
  );

  if (!selectedMarket) {
    return <MarketGrid />;
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
      {/* Toolbar row */}
      <div
        style={{
          height: 36,
          minHeight: 36,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px",
          borderBottom: "1px solid var(--border)",
          gap: 12,
        }}
      >
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
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(13,13,13,0.8)",
              gap: 8,
              color: "var(--text-muted)",
              fontSize: 12,
            }}
          >
            <div
              style={{
                width: 14,
                height: 14,
                border: "2px solid var(--border)",
                borderTopColor: "var(--accent)",
                borderRadius: "50%",
                animation: "spin 0.7s linear infinite",
              }}
            />
            Loading chart data…
          </div>
        )}

        {/* Error state */}
        {error && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--red)",
              fontSize: 12,
            }}
          >
            {error}
          </div>
        )}

        {/* No data state */}
        {!isLoading && !error && candles.length === 0 && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 10,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-muted)",
              gap: 6,
              fontSize: 12,
            }}
          >
            <span>No chart data available for this timeframe.</span>
            <span style={{ fontSize: 11 }}>Try a higher timeframe (1H / 4H).</span>
          </div>
        )}

        <CandlestickChart
          candles={candles}
          drawings={drawings}
          drawMode={drawMode}
          onDrawingCreated={handleDrawingCreated}
          onDrawingRemoved={(id) => {
            // Future: right-click to remove
            console.log("remove drawing", id);
          }}
        />
      </div>

    </div>
  );
}
