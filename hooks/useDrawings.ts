import { useCallback } from "react";
import { useChartStore } from "@/store/chartStore";
import type { Drawing } from "@/store/chartStore";

let drawingCounter = 0;
function newId() {
  return `drawing-${Date.now()}-${++drawingCounter}`;
}

export function useDrawings() {
  const {
    selectedMarket,
    selectedTimeframe,
    addDrawing,
    updateDrawing,
    removeDrawing,
    getDrawings,
  } = useChartStore();

  const key = selectedMarket
    ? `${selectedMarket.market_slug}:${selectedTimeframe}`
    : null;

  const drawings: Drawing[] = key ? getDrawings(selectedMarket!.market_slug, selectedTimeframe) : [];

  const add = useCallback(
    (price: number, label?: string) => {
      if (!selectedMarket) return;
      addDrawing(selectedMarket.market_slug, selectedTimeframe, {
        id: newId(),
        type: "hline",
        price,
        label,
        color: "#4e9eff",
      });
    },
    [selectedMarket, selectedTimeframe, addDrawing]
  );

  const remove = useCallback(
    (id: string) => {
      if (!selectedMarket) return;
      removeDrawing(selectedMarket.market_slug, selectedTimeframe, id);
    },
    [selectedMarket, selectedTimeframe, removeDrawing]
  );

  const clearAll = useCallback(() => {
    if (!selectedMarket) return;
    for (const d of drawings) {
      removeDrawing(selectedMarket.market_slug, selectedTimeframe, d.id);
    }
  }, [selectedMarket, selectedTimeframe, drawings, removeDrawing]);

  const update = useCallback(
    (id: string, patch: Partial<Drawing>) => {
      if (!selectedMarket) return;
      updateDrawing(selectedMarket.market_slug, selectedTimeframe, id, patch);
    },
    [selectedMarket, selectedTimeframe, updateDrawing]
  );

  return { drawings, add, remove, update, clearAll };
}
