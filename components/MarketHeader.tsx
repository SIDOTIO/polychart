"use client";

import { useEffect, useState } from "react";
import { useChartStore } from "@/store/chartStore";
import { getMarket } from "@/lib/polymarket";
import type { Market, Token } from "@/types/polymarket";

function fmt(v: number | string, decimals = 1) {
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (isNaN(n)) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(decimals)}m`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(decimals)}k`;
  return `$${n.toFixed(0)}`;
}

function fmtExpiry(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function PriceBadge({ price, label }: { price: number; label: string }) {
  const pct = price * 100;
  const color = pct >= 60 ? "var(--green)" : pct <= 40 ? "var(--red)" : "var(--text-primary)";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 1 }}>
      <span style={{ color: "var(--text-muted)", fontSize: 10, letterSpacing: "0.04em" }}>{label}</span>
      <span style={{ color, fontSize: 14, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
        {pct.toFixed(1)}%
      </span>
    </div>
  );
}

function Divider() {
  return (
    <div style={{ width: 1, height: 28, background: "var(--border)", flexShrink: 0 }} />
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <span style={{ color: "var(--text-muted)", fontSize: 10, letterSpacing: "0.04em" }}>{label}</span>
      <span style={{ color: "var(--text-primary)", fontSize: 12, fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}

export function MarketHeader() {
  const { selectedMarket, selectedToken, setSelectedMarket } = useChartStore();
  const [liveMarket, setLiveMarket] = useState<Market | null>(selectedMarket);

  // Refresh market data every 30s
  useEffect(() => {
    if (!selectedMarket) return;
    setLiveMarket(selectedMarket);

    const interval = setInterval(async () => {
      try {
        const fresh = await getMarket(selectedMarket.condition_id);
        setLiveMarket(fresh);
        // Update token in store with fresh price
        if (selectedToken) {
          const freshToken = fresh.tokens.find((t) => t.token_id === selectedToken.token_id);
          if (freshToken) setSelectedMarket(fresh, freshToken);
        }
      } catch {
        // silently ignore poll errors
      }
    }, 30_000);

    return () => clearInterval(interval);
  }, [selectedMarket?.condition_id]);

  if (!liveMarket || !selectedToken) {
    return (
      <div
        style={{
          height: 52,
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          color: "var(--text-muted)",
          fontSize: 13,
        }}
      >
        Select a market to start charting
      </div>
    );
  }

  // Find yes/no token prices
  const yesToken = liveMarket.tokens.find((t) => t.token_id === selectedToken.token_id) ?? selectedToken;
  const noPrice = 1 - yesToken.price;
  const outcome = liveMarket.tokens.length > 2 ? selectedToken.outcome : null;

  return (
    <div
      style={{
        height: 52,
        minHeight: 52,
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        padding: "0 14px",
        gap: 14,
        overflow: "hidden",
      }}
    >
      {/* Market title */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            color: "var(--text-primary)",
            fontSize: 13,
            fontWeight: 500,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {outcome ? (
            <span>
              <span style={{ color: "var(--accent)" }}>{outcome}</span>
              {" — "}
              {liveMarket.question}
            </span>
          ) : (
            liveMarket.question
          )}
        </div>
      </div>

      <Divider />

      {/* Yes/No prices */}
      <PriceBadge price={yesToken.price} label="YES" />
      <PriceBadge price={noPrice} label="NO" />

      <Divider />

      {/* Volume + Liquidity + Expiry */}
      <MetaItem label="24H VOL" value={fmt(liveMarket.volume_24hr)} />
      <MetaItem label="LIQUIDITY" value={fmt(liveMarket.liquidity)} />
      <MetaItem label="EXPIRES" value={fmtExpiry(liveMarket.end_date_iso)} />

      <Divider />

      {/* Polymarket link */}
      <a
        href={`https://polymarket.com/event/${liveMarket.market_slug}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          color: "var(--text-muted)",
          fontSize: 11,
          textDecoration: "none",
          padding: "3px 7px",
          border: "1px solid var(--border)",
          borderRadius: 4,
          whiteSpace: "nowrap",
          transition: "all 0.15s",
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.color = "var(--accent)";
          (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--accent)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.color = "var(--text-muted)";
          (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--border)";
        }}
      >
        Polymarket
        <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
          <path d="M1 9L9 1M9 1H3M9 1V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </a>
    </div>
  );
}
