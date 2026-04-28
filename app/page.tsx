"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SearchBar } from "@/components/SearchBar";

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
      {/* Sidebar */}
      <aside
        style={{
          width: 240,
          minWidth: 240,
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          background: "var(--bg-surface)",
        }}
      >
        <div
          style={{
            padding: "12px 14px",
            borderBottom: "1px solid var(--border)",
            fontWeight: 600,
            fontSize: 14,
            color: "var(--accent)",
            letterSpacing: "0.05em",
          }}
        >
          POLYCHART
        </div>
        <SearchBar />
      </aside>

      {/* Main area */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* MarketHeader will go here */}
        <div
          style={{
            height: 48,
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

        {/* ChartContainer will go here */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-muted)",
          }}
        >
          Chart will appear here
        </div>
      </main>
    </div>
  );
}
