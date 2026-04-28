"use client";

import { useState } from "react";
import { usePopularMarkets, type Category } from "@/hooks/usePopularMarkets";
import { useChartStore } from "@/store/chartStore";
import type { Market, Token } from "@/types/polymarket";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtVol(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function fmtExpiry(iso: string) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days < 0) return null;
  if (days === 0) return "Ends today";
  if (days === 1) return "1d left";
  if (days <= 30) return `${days}d left`;
  const months = Math.ceil(days / 30);
  return `${months}mo left`;
}

function getProbabilityColor(pct: number) {
  if (pct >= 70) return "var(--green)";
  if (pct <= 30) return "var(--red)";
  return "var(--accent)";
}

// ─── Category tabs config ──────────────────────────────────────────────────────

const CATEGORIES: { id: Category; label: string; emoji: string }[] = [
  { id: "top",      label: "Top Volume", emoji: "🔥" },
  { id: "politics", label: "Politics",   emoji: "🗳️" },
  { id: "crypto",   label: "Crypto",     emoji: "₿"  },
  { id: "sports",   label: "Sports",     emoji: "🏆" },
  { id: "finance",  label: "Finance",    emoji: "📈" },
];

// ─── Market Card ──────────────────────────────────────────────────────────────

function MarketCard({ market, onSelect }: { market: Market; onSelect: (m: Market, t: Token) => void }) {
  const [hovered, setHovered] = useState(false);

  const yesToken = market.tokens.find(t => t.outcome === "Yes") ?? market.tokens[0];
  const isMulti  = market.tokens.length > 2;
  const yesPct   = (yesToken?.price ?? 0) * 100;
  const topTokens = isMulti
    ? [...market.tokens].sort((a, b) => b.price - a.price).slice(0, 3)
    : null;
  const expiry   = fmtExpiry(market.end_date_iso);
  const probColor = getProbabilityColor(yesPct);

  return (
    <button
      onClick={() => onSelect(market, yesToken)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="fade-in"
      style={{
        background: hovered ? "var(--bg-elevated)" : "var(--bg-surface)",
        border: `1px solid ${hovered ? "var(--border-light)" : "var(--border)"}`,
        borderRadius: 10,
        padding: "14px 16px",
        textAlign: "left",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        transition: "all 0.15s ease",
        cursor: "pointer",
        width: "100%",
        transform: hovered ? "translateY(-1px)" : "none",
        boxShadow: hovered ? "0 4px 16px rgba(0,0,0,0.3)" : "none",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        {market.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={market.image}
            alt=""
            width={36}
            height={36}
            style={{ borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: "var(--bg-hover)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, color: "var(--text-muted)", fontSize: 16,
          }}>?</div>
        )}
        <span style={{
          color: "var(--text-primary)",
          fontSize: 12.5,
          fontWeight: 500,
          lineHeight: 1.45,
          flex: 1,
        }} className="truncate-2">
          {market.question}
        </span>
      </div>

      {/* Probability */}
      {isMulti && topTokens ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {topTokens.map(t => (
            <div key={t.token_id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{
                color: "var(--text-secondary)", fontSize: 11,
                flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{t.outcome}</span>
              <div style={{ width: 60, height: 3, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{
                  height: "100%", width: `${t.price * 100}%`,
                  background: getProbabilityColor(t.price * 100), borderRadius: 2,
                }} />
              </div>
              <span style={{
                color: getProbabilityColor(t.price * 100),
                fontSize: 12, fontWeight: 700, fontVariantNumeric: "tabular-nums",
                minWidth: 36, textAlign: "right",
              }}>{(t.price * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            flex: 1, height: 5, background: "var(--border)",
            borderRadius: 3, overflow: "hidden",
          }}>
            <div style={{
              height: "100%", width: `${yesPct}%`,
              background: probColor, borderRadius: 3,
              transition: "width 0.4s ease",
            }} />
          </div>
          <span style={{
            color: probColor, fontSize: 15,
            fontWeight: 800, fontVariantNumeric: "tabular-nums",
            minWidth: 44, textAlign: "right",
          }}>
            {yesPct.toFixed(0)}%
          </span>
        </div>
      )}

      {/* Footer */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        paddingTop: 4, borderTop: "1px solid var(--border)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" opacity="0.5">
            <circle cx="5" cy="5" r="4" stroke="var(--text-muted)" strokeWidth="1.5"/>
            <path d="M5 3v2l1.5 1" stroke="var(--text-muted)" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          <span style={{ color: "var(--text-muted)", fontSize: 11 }}>
            {fmtVol(market.volume_24hr)} vol
          </span>
        </div>
        {expiry && (
          <span style={{
            color: expiry.includes("today") ? "var(--yellow)" : "var(--text-muted)",
            fontSize: 11,
            fontWeight: expiry.includes("today") ? 600 : 400,
          }}>
            {expiry}
          </span>
        )}
      </div>
    </button>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div style={{
      background: "var(--bg-surface)",
      border: "1px solid var(--border)",
      borderRadius: 10, padding: "14px 16px",
      display: "flex", flexDirection: "column", gap: 12,
    }}>
      <div style={{ display: "flex", gap: 10 }}>
        <div className="skeleton-pulse" style={{ width: 36, height: 36, borderRadius: 8, background: "var(--bg-elevated)", flexShrink: 0 }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
          <div className="skeleton-pulse" style={{ height: 12, borderRadius: 3, background: "var(--bg-elevated)", width: "88%" }} />
          <div className="skeleton-pulse" style={{ height: 12, borderRadius: 3, background: "var(--bg-elevated)", width: "60%" }} />
        </div>
      </div>
      <div className="skeleton-pulse" style={{ height: 5, borderRadius: 3, background: "var(--bg-elevated)" }} />
      <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 4, borderTop: "1px solid var(--border)" }}>
        <div className="skeleton-pulse" style={{ height: 11, width: 60, borderRadius: 3, background: "var(--bg-elevated)" }} />
        <div className="skeleton-pulse" style={{ height: 11, width: 48, borderRadius: 3, background: "var(--bg-elevated)" }} />
      </div>
    </div>
  );
}

// ─── Main MarketGrid ──────────────────────────────────────────────────────────

export function MarketGrid() {
  const [category, setCategory] = useState<Category>("top");
  const { markets, isLoading, error } = usePopularMarkets(category);
  const { setSelectedMarket } = useChartStore();

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* Category tabs */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "12px 20px 0",
        borderBottom: "1px solid var(--border)",
        overflowX: "auto",
      }}>
        {CATEGORIES.map(cat => {
          const active = cat.id === category;
          return (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "7px 12px",
                borderRadius: "6px 6px 0 0",
                border: "none",
                borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
                background: active ? "var(--accent-dim)" : "transparent",
                color: active ? "var(--accent)" : "var(--text-muted)",
                fontSize: 12,
                fontWeight: active ? 600 : 400,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s",
                marginBottom: -1,
              }}
              onMouseEnter={e => {
                if (!active) (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)";
              }}
              onMouseLeave={e => {
                if (!active) (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
              }}
            >
              <span style={{ fontSize: 13 }}>{cat.emoji}</span>
              {cat.label}
            </button>
          );
        })}

        <div style={{ marginLeft: "auto", paddingBottom: 1, color: "var(--text-muted)", fontSize: 11, whiteSpace: "nowrap" }}>
          {!isLoading && `${markets.length} markets`}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          margin: "20px",
          padding: "12px 16px",
          background: "var(--red-dim)",
          border: "1px solid var(--red)",
          borderRadius: 8,
          color: "var(--red)",
          fontSize: 12,
        }}>
          {error}
        </div>
      )}

      {/* Grid */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 20px" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 10,
        }}>
          {isLoading
            ? Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)
            : markets.map(market => (
                <MarketCard
                  key={market.condition_id}
                  market={market}
                  onSelect={(m, t) => setSelectedMarket(m, t)}
                />
              ))
          }
        </div>

        {!isLoading && markets.length === 0 && !error && (
          <div style={{
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            height: 200, gap: 8, color: "var(--text-muted)",
          }}>
            <span style={{ fontSize: 28 }}>📭</span>
            <span style={{ fontSize: 13 }}>No markets found</span>
          </div>
        )}
      </div>
    </div>
  );
}
