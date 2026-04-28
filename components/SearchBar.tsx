"use client";

import { useState, useRef, useEffect } from "react";
import { useMarketSearch } from "@/hooks/useMarketSearch";
import { useChartStore } from "@/store/chartStore";
import type { Market, Token } from "@/types/polymarket";

// ─── Formatters ───────────────────────────────────────────────────────────────

function formatVolume(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}m`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}k`;
  return `$${v.toFixed(0)}`;
}

function formatPct(p: number): string {
  return `${(p * 100).toFixed(1)}%`;
}

// ─── Single result row ────────────────────────────────────────────────────────

interface ResultRowProps {
  market: Market;
  token: Token;
  onSelect: (market: Market, token: Token) => void;
  isActive: boolean;
}

function ResultRow({ market, token, onSelect, isActive }: ResultRowProps) {
  const pct = token.price;
  const isHigh = pct >= 0.7;
  const isLow = pct <= 0.3;
  const priceColor = isHigh ? "var(--green)" : isLow ? "var(--red)" : "var(--text-primary)";

  return (
    <button
      onClick={() => onSelect(market, token)}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "8px 12px",
        background: isActive ? "var(--bg-elevated)" : "transparent",
        border: "none",
        borderBottom: "1px solid var(--border)",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 3,
        transition: "background 0.1s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-elevated)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = isActive
          ? "var(--bg-elevated)"
          : "transparent";
      }}
    >
      {/* Title */}
      <span
        style={{
          color: "var(--text-primary)",
          fontSize: 12,
          lineHeight: "1.35",
          fontWeight: 500,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {market.tokens.length > 2 ? `${token.outcome} — ` : ""}
        {market.question}
      </span>

      {/* Meta row */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <span style={{ color: priceColor, fontSize: 11, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
          {formatPct(pct)} Yes
        </span>
        <span style={{ color: "var(--text-muted)", fontSize: 11 }}>·</span>
        <span style={{ color: "var(--text-muted)", fontSize: 11 }}>
          {formatVolume(market.volume_24hr)} / 24h
        </span>
      </div>
    </button>
  );
}

// ─── Main SearchBar ───────────────────────────────────────────────────────────

export function SearchBar() {
  const [minVolume, setMinVolume] = useState(10_000);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { selectedMarket, selectedToken, setSelectedMarket } = useChartStore();

  const { query, setQuery, results, isLoading, error } = useMarketSearch({
    minVolume,
  });

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSelect(market: Market, token: Token) {
    setSelectedMarket(market, token);
    setIsOpen(false);
    setQuery("");
    inputRef.current?.blur();
  }

  // Expand multi-outcome markets into per-token rows
  const rows: Array<{ market: Market; token: Token }> = [];
  for (const market of results) {
    const yesTokens = market.tokens.filter((t) => !t.winner || t.price > 0);
    if (yesTokens.length === 0) continue;
    for (const token of yesTokens) {
      rows.push({ market, token });
    }
  }

  const showDropdown = isOpen && (query.length >= 2);

  return (
    <div ref={containerRef} style={{ position: "relative", padding: "10px 10px 0" }}>
      {/* Search Input */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          background: "var(--bg-elevated)",
          border: `1px solid ${isOpen ? "var(--accent)" : "var(--border)"}`,
          borderRadius: 5,
          padding: "0 8px",
          gap: 6,
          transition: "border-color 0.15s",
        }}
      >
        {/* Search icon */}
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, opacity: 0.4 }}>
          <circle cx="6.5" cy="6.5" r="5" stroke="var(--text-primary)" strokeWidth="1.5" />
          <path d="M10.5 10.5L14 14" stroke="var(--text-primary)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>

        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search markets…"
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "var(--text-primary)",
            fontSize: 12,
            padding: "7px 0",
            caretColor: "var(--accent)",
          }}
        />

        {/* Loading spinner */}
        {isLoading && (
          <div
            style={{
              width: 12,
              height: 12,
              border: "2px solid var(--border)",
              borderTopColor: "var(--accent)",
              borderRadius: "50%",
              animation: "spin 0.6s linear infinite",
              flexShrink: 0,
            }}
          />
        )}
      </div>

      {/* Volume gate toggle */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 2px 4px",
          cursor: "pointer",
        }}
        onClick={() => setMinVolume(minVolume > 0 ? 0 : 10_000)}
      >
        <div
          style={{
            width: 24,
            height: 13,
            borderRadius: 7,
            background: minVolume > 0 ? "var(--accent)" : "var(--border)",
            position: "relative",
            transition: "background 0.2s",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 2,
              left: minVolume > 0 ? 13 : 2,
              width: 9,
              height: 9,
              borderRadius: "50%",
              background: "#fff",
              transition: "left 0.2s",
            }}
          />
        </div>
        <span style={{ color: "var(--text-muted)", fontSize: 11 }}>
          $10k+ volume only
        </span>
      </div>

      {/* Currently selected market indicator */}
      {selectedMarket && !showDropdown && (
        <div
          style={{
            margin: "2px 0 8px",
            padding: "6px 8px",
            background: "var(--bg-elevated)",
            borderRadius: 4,
            border: "1px solid var(--border)",
          }}
        >
          <div style={{ color: "var(--text-muted)", fontSize: 10, marginBottom: 2 }}>VIEWING</div>
          <div
            style={{
              color: "var(--text-primary)",
              fontSize: 11,
              fontWeight: 500,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {selectedMarket.tokens.length > 2 && selectedToken
              ? `${selectedToken.outcome} — `
              : ""}
            {selectedMarket.question}
          </div>
        </div>
      )}

      {/* Results dropdown */}
      {showDropdown && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 100,
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderTop: "none",
            borderRadius: "0 0 5px 5px",
            maxHeight: 400,
            overflowY: "auto",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          }}
        >
          {error && (
            <div style={{ padding: 12, color: "var(--red)", fontSize: 12 }}>{error}</div>
          )}

          {!isLoading && !error && rows.length === 0 && query.length >= 2 && (
            <div style={{ padding: 12, color: "var(--text-muted)", fontSize: 12 }}>
              No markets found
              {minVolume > 0 ? " — try turning off the volume filter" : ""}
            </div>
          )}

          {rows.map(({ market, token }) => (
            <ResultRow
              key={`${market.condition_id}:${token.token_id}`}
              market={market}
              token={token}
              onSelect={handleSelect}
              isActive={
                selectedMarket?.condition_id === market.condition_id &&
                selectedToken?.token_id === token.token_id
              }
            />
          ))}
        </div>
      )}

      {/* Spin animation */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
