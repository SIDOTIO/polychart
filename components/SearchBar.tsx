"use client";

import { useState, useRef, useEffect } from "react";
import { useMarketSearch } from "@/hooks/useMarketSearch";
import { useChartStore } from "@/store/chartStore";
import type { Market, Token } from "@/types/polymarket";

function fmtVol(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function ProbBadge({ price, label }: { price: number; label: string }) {
  const pct = price * 100;
  const color = pct >= 65 ? "var(--green)" : pct <= 35 ? "var(--red)" : "var(--accent)";
  return (
    <span style={{
      padding: "1px 6px",
      borderRadius: 4,
      fontSize: 10,
      fontWeight: 700,
      fontVariantNumeric: "tabular-nums",
      color,
      background: pct >= 65 ? "var(--green-dim)" : pct <= 35 ? "var(--red-dim)" : "var(--accent-dim)",
    }}>
      {pct.toFixed(0)}% {label}
    </span>
  );
}

interface ResultRowProps {
  market: Market;
  token: Token;
  isActive: boolean;
  onSelect: (m: Market, t: Token) => void;
}

function ResultRow({ market, token, isActive, onSelect }: ResultRowProps) {
  const [hovered, setHovered] = useState(false);
  const isBinary = market.tokens.length === 2;

  return (
    <button
      onClick={() => onSelect(market, token)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "9px 12px",
        background: isActive || hovered ? "var(--bg-elevated)" : "transparent",
        border: "none",
        borderBottom: "1px solid var(--border)",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 5,
        transition: "background 0.1s",
      }}
    >
      {/* Market question */}
      <span style={{
        color: "var(--text-primary)",
        fontSize: 12,
        fontWeight: 500,
        lineHeight: 1.4,
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
      }}>
        {!isBinary && (
          <span style={{ color: "var(--accent)", marginRight: 4 }}>{token.outcome} —</span>
        )}
        {market.question}
      </span>

      {/* Meta */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <ProbBadge price={token.price} label="Yes" />
        <span style={{ color: "var(--text-muted)", fontSize: 11 }}>
          {fmtVol(market.volume_24hr)} / 24h
        </span>
      </div>
    </button>
  );
}

export function SearchBar() {
  const [minVolume, setMinVolume] = useState(10_000);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { selectedMarket, selectedToken, setSelectedMarket } = useChartStore();
  const { query, setQuery, results, isLoading, error } = useMarketSearch({ minVolume });

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleSelect(market: Market, token: Token) {
    setSelectedMarket(market, token);
    setIsOpen(false);
    setQuery("");
    inputRef.current?.blur();
  }

  // Build result rows — binary markets show only once (Yes token)
  const rows: Array<{ market: Market; token: Token }> = [];
  for (const market of results) {
    if (market.tokens.length === 0) continue;
    if (market.tokens.length === 2) {
      // Binary: show Yes token only
      const yes = market.tokens.find(t => t.outcome === "Yes") ?? market.tokens[0];
      rows.push({ market, token: yes });
    } else {
      // Multi-outcome: show each token
      for (const token of market.tokens) {
        rows.push({ market, token });
      }
    }
  }

  const showDropdown = isOpen && query.length >= 2;

  return (
    <div ref={containerRef} style={{ padding: "10px 12px 6px", position: "relative" }}>

      {/* Search input */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: "var(--bg-elevated)",
        border: `1px solid ${isOpen ? "var(--accent)" : "var(--border)"}`,
        borderRadius: 7,
        padding: "0 10px",
        transition: "border-color 0.15s",
      }}>
        {isLoading ? (
          <div style={{
            width: 13, height: 13, flexShrink: 0,
            border: "1.5px solid var(--border)",
            borderTopColor: "var(--accent)",
            borderRadius: "50%",
            animation: "spin 0.6s linear infinite",
          }} />
        ) : (
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, opacity: 0.4 }}>
            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        )}
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search markets…"
          style={{
            flex: 1, background: "transparent", border: "none", outline: "none",
            color: "var(--text-primary)", fontSize: 12.5,
            padding: "8px 0", caretColor: "var(--accent)",
          }}
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setIsOpen(false); inputRef.current?.focus(); }}
            style={{
              background: "none", border: "none", padding: 2,
              color: "var(--text-muted)", cursor: "pointer", lineHeight: 1,
              fontSize: 14,
            }}
          >×</button>
        )}
      </div>

      {/* Volume toggle */}
      <div
        onClick={() => setMinVolume(v => v > 0 ? 0 : 10_000)}
        style={{
          display: "flex", alignItems: "center", gap: 7,
          padding: "7px 2px 4px", cursor: "pointer", userSelect: "none",
        }}
      >
        <div style={{
          width: 26, height: 14, borderRadius: 7,
          background: minVolume > 0 ? "var(--accent)" : "var(--border)",
          position: "relative", transition: "background 0.2s", flexShrink: 0,
        }}>
          <div style={{
            position: "absolute", top: 2,
            left: minVolume > 0 ? 14 : 2,
            width: 10, height: 10, borderRadius: "50%",
            background: "#fff", transition: "left 0.2s",
          }} />
        </div>
        <span style={{ color: "var(--text-muted)", fontSize: 11 }}>
          $10K+ volume only
        </span>
      </div>

      {/* Active market pill */}
      {selectedMarket && !showDropdown && (
        <div style={{
          margin: "4px 0 2px",
          padding: "7px 10px",
          background: "var(--accent-dim)",
          borderRadius: 6,
          border: "1px solid rgba(78,158,255,0.2)",
        }}>
          <div style={{ color: "var(--accent)", fontSize: 10, fontWeight: 600, marginBottom: 2, letterSpacing: "0.05em" }}>
            VIEWING
          </div>
          <div style={{
            color: "var(--text-primary)", fontSize: 11.5, fontWeight: 500, lineHeight: 1.4,
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>
            {selectedToken && market_tokens_length(selectedMarket) > 2
              ? `${selectedToken.outcome} — ` : ""}
            {selectedMarket.question}
          </div>
        </div>
      )}

      {/* Results dropdown */}
      {showDropdown && (
        <div style={{
          position: "absolute",
          top: "100%", left: 0, right: 0,
          zIndex: 200,
          background: "var(--bg-surface)",
          border: "1px solid var(--border-light)",
          borderTop: "none",
          borderRadius: "0 0 8px 8px",
          maxHeight: 380,
          overflowY: "auto",
          boxShadow: "0 12px 32px rgba(0,0,0,0.6)",
          animation: "slideDown 0.15s ease-out",
        }}>
          {error && (
            <div style={{ padding: "10px 12px", color: "var(--red)", fontSize: 12 }}>{error}</div>
          )}
          {!isLoading && !error && rows.length === 0 && (
            <div style={{ padding: "14px 12px", color: "var(--text-muted)", fontSize: 12 }}>
              No markets found{minVolume > 0 ? " — try turning off the $10K filter" : ""}
            </div>
          )}
          {rows.map(({ market, token }) => (
            <ResultRow
              key={`${market.condition_id}:${token.token_id}`}
              market={market}
              token={token}
              isActive={selectedMarket?.condition_id === market.condition_id
                && selectedToken?.token_id === token.token_id}
              onSelect={handleSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function market_tokens_length(m: Market) { return m.tokens.length; }
