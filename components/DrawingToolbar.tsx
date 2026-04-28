"use client";

interface DrawingToolbarProps {
  drawMode: "none" | "hline";
  onSetDrawMode: (mode: "none" | "hline") => void;
  drawingCount: number;
  onClearAll: () => void;
}

export function DrawingToolbar({
  drawMode,
  onSetDrawMode,
  drawingCount,
  onClearAll,
}: DrawingToolbarProps) {
  const hlineActive = drawMode === "hline";

  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      {/* H-Line tool */}
      <button
        title="Horizontal line (H)"
        onClick={() => onSetDrawMode(hlineActive ? "none" : "hline")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          padding: "3px 8px",
          fontSize: 11,
          background: hlineActive ? "rgba(78,158,255,0.15)" : "transparent",
          color: hlineActive ? "var(--accent)" : "var(--text-muted)",
          border: hlineActive
            ? "1px solid rgba(78,158,255,0.4)"
            : "1px solid var(--border)",
          borderRadius: 4,
          cursor: "pointer",
          transition: "all 0.1s",
        }}
        onMouseEnter={(e) => {
          if (!hlineActive)
            (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)";
        }}
        onMouseLeave={(e) => {
          if (!hlineActive)
            (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
        }}
      >
        {/* Horizontal line icon */}
        <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
          <line x1="0" y1="5" x2="14" y2="5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" />
          <circle cx="7" cy="5" r="1.5" fill="currentColor" />
        </svg>
        H-Line
      </button>

      {/* Clear all drawings */}
      {drawingCount > 0 && (
        <button
          title="Clear all drawings"
          onClick={onClearAll}
          style={{
            padding: "3px 8px",
            fontSize: 11,
            background: "transparent",
            color: "var(--text-muted)",
            border: "1px solid var(--border)",
            borderRadius: 4,
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "var(--red)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--red)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
          }}
        >
          Clear ({drawingCount})
        </button>
      )}
    </div>
  );
}
