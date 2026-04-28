"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { CandleData } from "@/types/polymarket";
import type { Drawing } from "@/store/chartStore";
import {
  createChart,
  ColorType,
  CrosshairMode,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type HistogramData,
  type IPriceLine,
  type MouseEventParams,
  type Time,
} from "lightweight-charts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OHLCTooltip {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  time: number;
  x: number;
  y: number;
  visible: boolean;
}

interface CandlestickChartProps {
  candles: CandleData[];
  drawings: Drawing[];
  drawMode: "none" | "hline";
  onDrawingCreated: (price: number) => void;
  onDrawingRemoved: (id: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtPct(p: number) {
  return `${(p * 100).toFixed(2)}%`;
}
function fmtVol(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}m`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}k`;
  return `$${v.toFixed(0)}`;
}
function fmtDate(ts: number) {
  return new Date(ts * 1000).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CandlestickChart({
  candles,
  drawings,
  drawMode,
  onDrawingCreated,
  onDrawingRemoved,
}: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const priceLineRefs = useRef<Map<string, IPriceLine>>(new Map());
  const [tooltip, setTooltip] = useState<OHLCTooltip | null>(null);

  // ── Init chart ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#0d0d0d" },
        textColor: "#666666",
        fontSize: 11,
        fontFamily: "'Inter', -apple-system, sans-serif",
      },
      grid: {
        vertLines: { color: "#1a1a1a" },
        horzLines: { color: "#1a1a1a" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "#444", labelBackgroundColor: "#1e1e1e" },
        horzLine: { color: "#444", labelBackgroundColor: "#1e1e1e" },
      },
      rightPriceScale: {
        borderColor: "#2a2a2a",
        scaleMargins: { top: 0.1, bottom: 0.25 },
      },
      timeScale: {
        borderColor: "#2a2a2a",
        timeVisible: true,
        secondsVisible: false,
        fixLeftEdge: true,
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true },
      handleScale: { mouseWheel: true, pinch: true },
    });

    // Candlestick series
    const candleSeries = chart.addCandlestickSeries({
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderUpColor: "#26a69a",
      borderDownColor: "#ef5350",
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
      priceFormat: {
        type: "custom",
        formatter: (price: number) => `${(price * 100).toFixed(1)}%`,
        minMove: 0.001,
      },
    });

    // Volume histogram — overlays at bottom 20% of chart pane
    const volumeSeries = chart.addHistogramSeries({
      color: "#26a69a",
      priceFormat: { type: "volume" },
      priceScaleId: "",
    });
    chart.priceScale("").applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    // Crosshair tooltip
    chart.subscribeCrosshairMove((param: MouseEventParams) => {
      if (
        !param.point ||
        !param.time ||
        param.point.x < 0 ||
        param.point.y < 0
      ) {
        setTooltip(null);
        return;
      }

      const data = param.seriesData.get(candleSeries) as CandlestickData | undefined;
      const volData = param.seriesData.get(volumeSeries) as HistogramData | undefined;
      if (!data) { setTooltip(null); return; }

      const containerRect = containerRef.current?.getBoundingClientRect();
      if (!containerRect) return;

      setTooltip({
        open: data.open as number,
        high: data.high as number,
        low: data.low as number,
        close: data.close as number,
        volume: (volData?.value as number) ?? 0,
        time: param.time as number,
        x: param.point.x,
        y: param.point.y,
        visible: true,
      });
    });

    // Click handler for drawing tool
    chart.subscribeClick((param: MouseEventParams) => {
      if (!param.point || !candleSeriesRef.current) return;
      const price = candleSeriesRef.current.coordinateToPrice(param.point.y);
      if (price !== null) onDrawingCreated(price);
    });

    // Resize observer
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        chart.applyOptions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Update candle data ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current || candles.length === 0) return;

    // Lightweight Charts requires strictly ascending timestamps with zero duplicates.
    // Deduplicate by timestamp (last write wins), then sort ascending.
    const deduped = Array.from(
      candles.reduce((map, c) => {
        map.set(c.time as number, c);
        return map;
      }, new Map<number, typeof candles[0]>()).values()
    ).sort((a, b) => (a.time as number) - (b.time as number));

    const candleData: CandlestickData[] = deduped.map((c) => ({
      time: c.time as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    const volumeData: HistogramData[] = deduped.map((c) => ({
      time: c.time as Time,
      value: c.value,
      color: c.close >= c.open ? "rgba(38,166,154,0.5)" : "rgba(239,83,80,0.5)",
    }));

    candleSeriesRef.current.setData(candleData);
    volumeSeriesRef.current.setData(volumeData);
    chartRef.current?.timeScale().fitContent();
  }, [candles]);

  // ── Sync drawings (price lines) ────────────────────────────────────────────

  useEffect(() => {
    if (!candleSeriesRef.current) return;
    const series = candleSeriesRef.current;
    const existing = priceLineRefs.current;
    const incomingIds = new Set(drawings.map((d) => d.id));

    // Remove stale lines
    for (const [id, line] of existing) {
      if (!incomingIds.has(id)) {
        series.removePriceLine(line);
        existing.delete(id);
      }
    }

    // Add new lines
    for (const drawing of drawings) {
      if (!existing.has(drawing.id)) {
        const line = series.createPriceLine({
          price: drawing.price,
          color: drawing.color ?? "#4e9eff",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: drawing.label ?? "",
        });
        existing.set(drawing.id, line);
      }
    }
  }, [drawings]);

  // ── Cursor style ───────────────────────────────────────────────────────────

  const cursor = drawMode === "hline" ? "crosshair" : "default";

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div
        ref={containerRef}
        style={{ width: "100%", height: "100%", cursor }}
      />

      {/* OHLC Tooltip */}
      {tooltip && (
        <div
          style={{
            position: "absolute",
            top: 8,
            left: 12,
            pointerEvents: "none",
            display: "flex",
            gap: 12,
            background: "rgba(22,22,22,0.9)",
            border: "1px solid #2a2a2a",
            borderRadius: 4,
            padding: "4px 10px",
            fontSize: 11,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <span style={{ color: "#666" }}>{fmtDate(tooltip.time)}</span>
          <span style={{ color: "#888" }}>O <span style={{ color: "#e8e8e8" }}>{fmtPct(tooltip.open)}</span></span>
          <span style={{ color: "#888" }}>H <span style={{ color: "#26a69a" }}>{fmtPct(tooltip.high)}</span></span>
          <span style={{ color: "#888" }}>L <span style={{ color: "#ef5350" }}>{fmtPct(tooltip.low)}</span></span>
          <span style={{ color: "#888" }}>C <span style={{
            color: tooltip.close >= tooltip.open ? "#26a69a" : "#ef5350",
            fontWeight: 600,
          }}>{fmtPct(tooltip.close)}</span></span>
          {tooltip.volume > 0 && (
            <span style={{ color: "#888" }}>Vol <span style={{ color: "#e8e8e8" }}>{fmtVol(tooltip.volume)}</span></span>
          )}
        </div>
      )}

      {/* Draw mode overlay hint */}
      {drawMode === "hline" && (
        <div
          style={{
            position: "absolute",
            bottom: 8,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(78,158,255,0.15)",
            border: "1px solid rgba(78,158,255,0.4)",
            borderRadius: 4,
            padding: "3px 10px",
            fontSize: 11,
            color: "#4e9eff",
            pointerEvents: "none",
          }}
        >
          Click to place horizontal line · ESC to cancel
        </div>
      )}
    </div>
  );
}
