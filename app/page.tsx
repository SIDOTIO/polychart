"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SearchBar } from "@/components/SearchBar";
import { MarketHeader } from "@/components/MarketHeader";
import { ChartContainer } from "@/components/ChartContainer";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

export default function Home() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppLayout />
    </QueryClientProvider>
  );
}

function AppLayout() {
  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
        background: "var(--bg-base)",
      }}
    >
      {/* ── Left sidebar ───────────────────────────── */}
      <aside
        style={{
          width: 240,
          minWidth: 240,
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          background: "var(--bg-surface)",
          overflow: "hidden",
        }}
      >
        {/* Logo */}
        <div
          style={{
            padding: "0 14px",
            height: 52,
            minHeight: 52,
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="1" y="11" width="4" height="6" rx="1" fill="var(--accent)" opacity="0.6" />
            <rect x="7" y="7" width="4" height="10" rx="1" fill="var(--accent)" opacity="0.8" />
            <rect x="13" y="2" width="4" height="15" rx="1" fill="var(--accent)" />
          </svg>
          <span
            style={{
              fontWeight: 700,
              fontSize: 14,
              color: "var(--text-primary)",
              letterSpacing: "0.06em",
            }}
          >
            POLYCHART
          </span>
        </div>

        {/* Search */}
        <SearchBar />

        {/* Footer hint */}
        <div
          style={{
            marginTop: "auto",
            padding: "10px 14px",
            borderTop: "1px solid var(--border)",
            color: "var(--text-muted)",
            fontSize: 10,
            lineHeight: 1.5,
          }}
        >
          Press <kbd style={{ background: "var(--bg-elevated)", padding: "1px 4px", borderRadius: 2, border: "1px solid var(--border)" }}>H</kbd> for H-line
          · <kbd style={{ background: "var(--bg-elevated)", padding: "1px 4px", borderRadius: 2, border: "1px solid var(--border)" }}>ESC</kbd> to cancel
        </div>
      </aside>

      {/* ── Main area ──────────────────────────────── */}
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        <MarketHeader />
        <ChartContainer />
      </main>
    </div>
  );
}
