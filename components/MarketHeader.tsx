"use client";

import { useEffect, useState } from "react";
import { useChartStore } from "@/store/chartStore";
import { getMarket } from "@/lib/polymarket";
import type { Market } from "@/types/polymarket";

function fmt(v: number | string, decimals = 1) {
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (isNaN(n) || n === 0) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(decimals)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(decimals)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtExpiry(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days < 0)  return "Expired";
  if (days === 0) return "Today";
  if (days === 1) return "1d left";
  if (days <= 30) return `${days}d left`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function ProbBar({ price, label }: { price: number; label: string }) {
  const pct = price * 100;
  const isYes = label === "YES";
  const color = pct >= 60 ? "var(--green)" : pct <= 40 ? "var(--red)" : "var(--accent)";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.05em",
        color: isYes ? "var(--green)" : "var(--red)",
        minWidth: 22,
      }}>{label}</span>
      <div style={{
        width: 44,
        height: 3,
        background: "var(--border)",
        borderRadius: 2,
        overflow: "hidden",
      }}>
        <div style={{
          height: "100%",
          width: `${pct}%`,
          background: color,
          borderRadius: 2,
          transition: "width 0.4s ease",
        }} />
      </div>
      <span style={{
        color,
        fontSize: 13,
        fontWeight: 700,
        fontVariantNumeric: "tabular-nums",
        minWidth: 40,
      }}>
        {pct.toFixed(1)}%
      </span>
    </div>
  );
}

function MetaChip({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      gap: 2,
      padding: "3px 10px",
      borderLeft: "1px solid var(--border)",
    }}>
      <span style={{ color: "var(--text-muted)", fontSize: 9.5, letterSpacing: "0.07em", fontWeight: 500 }}>
        {label}
      </span>
      <span style={{
        color: highlight ? "var(--yellow)" : "var(--text-primary)",
        fontSize: 12,
        fontWeight: highlight ? 600 : 400,
        fontVariantNumeric: "tabular-nums",
      }}>
        {value}
      </span>
    </div>
  );
}

function LiveBadge({ lastRefresh }: { lastRefresh: number }) {
  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    const tick = () => setSecondsAgo(Math.floor((Date.now() - lastRefresh) / 1000));
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [lastRefresh]);

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 5,
      padding: "2px 7px",
      border: "1px solid rgba(38,166,154,0.3)",
      borderRadius: 4,
      background: "rgba(38,166,154,0.06)",
    }}>
      <div style={{
        width: 5, height: 5, borderRadius: "50%",
        background: "var(--green)",
        boxShadow: "0 0 4px var(--green)",
        animation: "livePulse 2s ease-in-out infinite",
      }} />
      <span style={{ color: "var(--green)", fontSize: 10, fontWeight: 600, letterSpacing: "0.04em" }}>
        LIVE
      </span>
      {secondsAgo > 0 && (
        <span style={{ color: "var(--text-muted)", fontSize: 10 }}>
          {secondsAgo}s
        </span>
      )}
    </div>
  );
}

export function MarketHeader() {
  const { selectedMarket, selectedToken, setSelectedMarket } = useChartStore();
  const [liveMarket, setLiveMarket] = useState<Market | null>(selectedMarket);
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  useEffect(() => {
    if (!selectedMarket) return;
    setLiveMarket(selectedMarket);
    setLastRefresh(Date.now());

    const interval = setInterval(async () => {
      try {
        const fresh = await getMarket(selectedMarket.condition_id);
        setLiveMarket(fresh);
        setLastRefresh(Date.now());
        if (selectedToken) {
          const freshToken = fresh.tokens.find((t) => t.token_id === selectedToken.token_id);
          if (freshToken) setSelectedMarket(fresh, freshToken);
        }
      } catch {
        // silently ignore poll errors
      }
    }, 30_000);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMarket?.condition_id]);

  if (!liveMarket || !selectedToken) {
    return (
      <div style={{
        height: 52, minHeight: 52,
        borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center",
        padding: "0 16px", gap: 8,
      }}>
        <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
          Select a market to open its chart
        </span>
      </div>
    );
  }

  const token = liveMarket.tokens.find((t) => t.token_id === selectedToken.token_id) ?? selectedToken;
  const yesPct  = token.price;
  const noPct   = 1 - token.price;
  const isMulti = liveMarket.tokens.length > 2;
  const expiry  = fmtExpiry(liveMarket.end_date_iso);
  const isExpiringSoon = expiry.includes("d left") && parseInt(expiry) <= 3;

  return (
    <div style={{
      height: 52, minHeight: 52,
      borderBottom: "1px solid var(--border)",
      display: "flex", alignItems: "center",
      padding: "0 14px", gap: 0,
      overflow: "hidden",
    }}>
      {/* Market image */}
      {liveMarket.image && (
        <div style={{ marginRight: 10, flexShrink: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={liveMarket.image}
            alt=""
            width={28}
            height={28}
            style={{ borderRadius: 6, objectFit: "cover", display: "block" }}
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        </div>
      )}

      {/* Title */}
      <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
        {isMulti && (
          <div style={{ color: "var(--accent)", fontSize: 10, fontWeight: 600, letterSpacing: "0.05em", marginBottom: 1 }}>
            {selectedToken.outcome.toUpperCase()}
          </div>
        )}
        <div style={{
          color: "var(--text-primary)",
          fontSize: 13, fontWeight: 500,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {liveMarket.question}
        </div>
      </div>

      {/* YES/NO probability bars */}
      <div style={{
        display: "flex", flexDirection: "column", gap: 3,
        padding: "0 12px", borderLeft: "1px solid var(--border)",
        flexShrink: 0,
      }}>
        <ProbBar price={yesPct} label="YES" />
        <ProbBar price={noPct}  label="NO" />
      </div>

      {/* Meta chips */}
      <MetaChip label="24H VOL"   value={fmt(liveMarket.volume_24hr)} />
      <MetaChip label="LIQUIDITY" value={fmt(liveMarket.liquidity)} />
      <MetaChip
        label="EXPIRES"
        value={expiry}
        highlight={isExpiringSoon || expiry === "Today"}
      />

      {/* Live badge */}
      <div style={{ padding: "0 12px", borderLeft: "1px solid var(--border)", flexShrink: 0 }}>
        <LiveBadge lastRefresh={lastRefresh} />
      </div>

      {/* Polymarket link */}
      <a
        href={`https://polymarket.com/event/${liveMarket.market_slug}`}
        target="_blank"
        rel="noopener noreferrer"
        className="pm-link"
        style={{
          display: "flex", alignItems: "center", gap: 4,
          color: "var(--text-muted)", fontSize: 11,
          textDecoration: "none",
          padding: "4px 8px",
          border: "1px solid var(--border)",
          borderRadius: 5,
          whiteSpace: "nowrap",
          transition: "all 0.15s",
          flexShrink: 0,
          marginLeft: 8,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.color = "var(--accent)";
          (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--accent)";
          (e.currentTarget as HTMLAnchorElement).style.background = "var(--accent-dim)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.color = "var(--text-muted)";
          (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--border)";
          (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
        }}
      >
        Trade on Polymarket
        <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
          <path d="M1 9L9 1M9 1H3M9 1V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </a>
    </div>
  );
}
