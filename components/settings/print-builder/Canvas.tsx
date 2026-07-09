"use client";

import { useEffect } from "react";
import {
  PAGE_WIDTH_MM,
  PAGE_HEIGHT_MM,
  type PrintTemplateElement,
  type PrintDocumentKey,
} from "@/lib/print/customTemplate";
import { CanvasElement } from "./CanvasElement";

/** The A4 design surface — an aspect-locked box (210:297, the same ratio lib/print/renderCustomTemplate.ts prints at) so on-screen % positions land in the same place on paper. */
export function Canvas({
  documentKey,
  elements,
  sampleData,
  selectedId,
  onSelect,
  onChangeElement,
}: {
  documentKey: PrintDocumentKey;
  elements: PrintTemplateElement[];
  sampleData: Record<string, unknown>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChangeElement: (id: string, patch: Partial<PrintTemplateElement>) => void;
}) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!selectedId) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const step = e.shiftKey ? 5 : 1;
      let dx = 0;
      let dy = 0;
      if (e.key === "ArrowLeft") dx = -step;
      else if (e.key === "ArrowRight") dx = step;
      else if (e.key === "ArrowUp") dy = -step;
      else if (e.key === "ArrowDown") dy = step;
      else return;
      e.preventDefault();
      const el = elements.find((el) => el.id === selectedId);
      if (!el) return;
      onChangeElement(selectedId, {
        x: Math.min(100, Math.max(0, el.x + dx)),
        y: Math.min(100, Math.max(0, el.y + dy)),
      });
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedId, elements, onChangeElement]);

  return (
    <div
      data-canvas-page
      onClick={() => onSelect(null)}
      className="relative mx-auto w-full max-w-150 rounded border border-gray-300 bg-white shadow-sm"
      style={{ aspectRatio: `${PAGE_WIDTH_MM} / ${PAGE_HEIGHT_MM}` }}
    >
      {elements.map((el) => (
        <CanvasElement
          key={el.id}
          documentKey={documentKey}
          element={el}
          sampleData={sampleData}
          selected={el.id === selectedId}
          onSelect={() => onSelect(el.id)}
          onChange={(patch) => onChangeElement(el.id, patch)}
        />
      ))}
    </div>
  );
}
