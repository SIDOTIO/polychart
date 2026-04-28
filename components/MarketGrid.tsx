"use client";

import { usePopularMarkets } from "@/hooks/usePopularMarkets";
import { useChartStore } from "@/store/chartStore";
import type { Market, Token } from "@/types/polymarket";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtVol(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}m`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}k`;
  return `$${v.toFixed(0)}`;
}

function fmtExpiry(iso: string) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ─── Single market card ───────────────────────────────────────────────────────

function MarketCard({ market, onSelect }: { market: Market; onSelect: (m: Market, t: Token) => void }) {
  const yesToken = market.tokens.find((t) => t.outcome === "Yes") ?? market.tokens[0];
  const noToken = market.tokens.find((t) => t.outcome === "No") ?? market.tokens[1];

  const yesPct = ((yesToken?.price ?? 0) * 100);
  const isMulti = market.tokens.length > 2;

  // For multi-outcome, show top 2 tokens by price
  const topTokens = isMulti
    ? [...market.tokens].sort((a, b) => b.price - a.price).slice(0, 2)
    : null;

  const expiry = fmtExpiry(market.end_date_iso);

  return (
    <button
      onClick={() => onSelect(market, yesToken)}
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "12px 14px",
        textAlign: "left",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        transition: "border-color 0.15s, background 0.15s",
        width: "100%",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.borderColor = "var(--accent)";
        el.style.background = "var(--bg-elevated)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.borderColor = "var(--border)";
        el.style.background = "var(--bg-surface)";
      }}
    >
      {/* Header: icon + title */}
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        {market.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={market.image}
            alt=""
            width={32}
            height={32}
            style={{ borderRadius: 6, objectFit: "cover", flexShrink: 0, marginTop: 1 }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        )}
        <span
          style={{
            color: "var(--text-primary)",
            fontSize: 12,
            fontWeight: 500,
            lineHeight: 1.4,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {market.question}
        </span>
      </div>

      {/* Probability display */}
      {isMulti && topTokens ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {topTokens.map((t) => (
            <div key={t.token_id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "var(--text-muted)", fontSize: 11, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {t.outcome}
              </span>
              <span style={{ color: "var(--text-primary)", fontSize: 12, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                {(t.price * 100).toFixed(0)}%
              </span>
              <div style={{ display: "flex", gap: 3 }}>
                <span style={{ background: "rgba(38,166,154,0.2)", color: "var(--green)", fontSize: 10, padding: "1px 5px", borderRadius: 3, fontWeight: 600 }}>Yes</span>
                <span style={{ background: "rgba(239,83,80,0.2)", color: "var(--red)", fontSize: 10, padding: "1px 5px", borderRadius: 3, fontWeight: 600 }}>No</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Probability bar */}
          <div style={{ flex: 1, height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${yesPct}%`,
                background: yesPct >= 60 ? "var(--green)" : yesPct <= 40 ? "var(--red)" : "var(--accent)",
                borderRadius: 2,
                transition: "width 0.3s",
              }}
            />
          </div>
          <span style={{
            color: yesPct >= 60 ? "var(--green)" : yesPct <= 40 ? "var(--red)" : "var(--text-primary)",
            fontSize: 13,
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
            minWidth: 38,
            textAlign: "right",
          }}>
            {yesPct.toFixed(0)}%
          </span>
          <div style={{ display: "flex", gap: 3 }}>
            <span style={{ background: "rgba(38,166,154,0.2)", color: "var(--green)", fontSize: 10, padding: "1px 5px", borderRadius: 3, fontWeight: 600 }}>Yes</span>
            <span style={{ background: "rgba(239,83,80,0.2)", color: "var(--red)", fontSize: 10, padding: "1px 5px", borderRadius: 3, fontWeight: 600 }}>No</span>
          </div>
        </div>
      )}

      {/* Footer: volume + expiry */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: "var(--text-muted)", fontSize: 11 }}>
          {fmtVol(market.volume_24hr)} Vol.
        </span>
        {expiry && (
          <span style={{ color: "var(--text-muted)", fontSize: 11 }}>
            {expiry}
          </span>
        )}
      </div>
    </button>
  );
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 6, background: "var(--bg-elevated)" }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ height: 11, borderRadius: 3, background: "var(--bg-elevated)", width: "90%" }} />
          <div style={{ height: 11, borderRadius: 3, background: "var(--bg-elevated)", width: "60%" }} />
        </div>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: "var(--bg-elevated)" }} />
      <div style={{ height: 11, borderRadius: 3, background: "var(--bg-elevated)", width: "40%" }} />
      <style>{`
        @keyframes shimmer {
          0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; }
        }
        .skeleton-card > * { animation: shimmer 1.4s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

// ─── Main MarketGrid ──────────────────────────────────────────────────────────

export function MarketGrid() {
  const { markets, isLoading, error } = usePopularMarkets();
  const { setSelectedMarket } = useChartStore();

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
      {/* Header */}
      <div style={{ marginBottom: 16, display: "flex", alignItems: "baseline", gap: 10 }}>
        <h2 style={{ color: "var(--text-primary)", fontSize: 14, fontWeight: 600, margin: 0 }}>
          Top Markets
        </h2>
        <span style={{ color: "var(--text-muted)", fontSize: 11 }}>by 24h volume</span>
      </div>

      {error && (
        <div style={{ color: "var(--red)", fontSize: 12 }}>{error}</div>
      )}

      {/* Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 10,
        }}
      >
        {isLoading
          ? Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)
          : markets.map((market) => (
              <MarketCard
                key={market.condition_id}
                market={market}
                onSelect={(m, t) => setSelectedMarket(m, t)}
              />
            ))}
      </div>
    </div>
  );
}
