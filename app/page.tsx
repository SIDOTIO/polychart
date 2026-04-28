"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SearchBar } from "@/components/SearchBar";
import { MarketHeader } from "@/components/MarketHeader";
import { ChartContainer } from "@/components/ChartContainer";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
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
    <div style={{
      display: "flex",
      height: "100vh",
      width: "100vw",
      overflow: "hidden",
      background: "var(--bg-base)",
    }}>

      {/* ── Sidebar ─────────────────────────────── */}
      <aside style={{
        width: 256,
        minWidth: 256,
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-surface)",
        borderRight: "1px solid var(--border)",
      }}>

        {/* Logo */}
        <div style={{
          height: 52,
          minHeight: 52,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "0 16px",
          borderBottom: "1px solid var(--border)",
        }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="1" y="12" width="4" height="7" rx="1" fill="var(--accent)" opacity="0.5"/>
            <rect x="8" y="7"  width="4" height="12" rx="1" fill="var(--accent)" opacity="0.75"/>
            <rect x="15" y="2" width="4" height="17" rx="1" fill="var(--accent)"/>
          </svg>
          <span style={{
            fontWeight: 700,
            fontSize: 15,
            letterSpacing: "0.08em",
            color: "var(--text-primary)",
          }}>
            POLY<span style={{ color: "var(--accent)" }}>CHART</span>
          </span>
        </div>

        {/* Search */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <SearchBar />
        </div>

        {/* Keyboard hint */}
        <div style={{
          padding: "8px 14px",
          borderTop: "1px solid var(--border)",
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
        }}>
          {[["H", "H-Line"], ["ESC", "Cancel"]].map(([key, label]) => (
            <span key={key} style={{ display: "flex", gap: 4, alignItems: "center", color: "var(--text-muted)", fontSize: 10 }}>
              <kbd style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-light)",
                borderRadius: 3,
                padding: "1px 5px",
                fontFamily: "inherit",
                fontSize: 10,
                color: "var(--text-secondary)",
              }}>{key}</kbd>
              {label}
            </span>
          ))}
        </div>
      </aside>

      {/* ── Main ───────────────────────────────── */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
        <MarketHeader />
        <ChartContainer />
      </main>
    </div>
  );
}
