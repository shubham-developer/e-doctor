"use client";

import { useCallback, useRef } from "react";
import type { PrintTemplateElement, PrintDocumentKey } from "@/lib/print/customTemplate";
import { PRINT_TEMPLATE_FIELDS } from "@/lib/print/templateFields";

function getPath(data: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[key];
  }, data);
}

function previewText(el: PrintTemplateElement, sampleData: Record<string, unknown>): string {
  if (el.type === "text") {
    return (el.content ?? "").replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, token: string) =>
      String(getPath(sampleData, token) ?? ""),
    );
  }
  if (el.type === "field") {
    const value = el.token ? getPath(sampleData, el.token) : undefined;
    return `${el.label ? el.label + " " : ""}${value != null ? String(value) : ""}`;
  }
  return "";
}

/** Drag/resize/select a single placed element on the builder canvas — the on-screen editor counterpart to lib/print/renderCustomTemplate.ts's print-time rendering (kept visually approximate, not pixel-identical, since the print path is the source of truth verified via the builder's own Print Preview button). */
export function CanvasElement({
  documentKey,
  element,
  sampleData,
  selected,
  onSelect,
  onChange,
}: {
  documentKey: PrintDocumentKey;
  element: PrintTemplateElement;
  sampleData: Record<string, unknown>;
  selected: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<PrintTemplateElement>) => void;
}) {
  const dragState = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizeState = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null);

  const handleMoveDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      onSelect();
      const canvas = (e.currentTarget as HTMLElement).closest(
        "[data-canvas-page]",
      ) as HTMLElement | null;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      dragState.current = { startX: e.clientX, startY: e.clientY, origX: element.x, origY: element.y };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

      function onMove(ev: PointerEvent) {
        if (!dragState.current) return;
        const dxPct = ((ev.clientX - dragState.current.startX) / rect.width) * 100;
        const dyPct = ((ev.clientY - dragState.current.startY) / rect.height) * 100;
        onChange({
          x: Math.min(100, Math.max(0, dragState.current.origX + dxPct)),
          y: Math.min(100, Math.max(0, dragState.current.origY + dyPct)),
        });
      }
      function onUp() {
        dragState.current = null;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      }
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [element.x, element.y, onChange, onSelect],
  );

  const handleResizeDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      const canvas = (e.currentTarget as HTMLElement).closest(
        "[data-canvas-page]",
      ) as HTMLElement | null;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      resizeState.current = {
        startX: e.clientX,
        startY: e.clientY,
        origW: element.width,
        origH: element.height,
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

      function onMove(ev: PointerEvent) {
        if (!resizeState.current) return;
        const dwPct = ((ev.clientX - resizeState.current.startX) / rect.width) * 100;
        const dhPct = ((ev.clientY - resizeState.current.startY) / rect.height) * 100;
        onChange({
          width: Math.max(3, resizeState.current.origW + dwPct),
          height: Math.max(2, resizeState.current.origH + dhPct),
        });
      }
      function onUp() {
        resizeState.current = null;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      }
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [element.width, element.height, onChange],
  );

  const style: React.CSSProperties = {
    position: "absolute",
    left: `${element.x}%`,
    top: `${element.y}%`,
    width: `${element.width}%`,
    height: `${element.height}%`,
    fontSize: element.fontSize ? `${element.fontSize}px` : undefined,
    fontWeight: element.bold ? "bold" : undefined,
    textAlign: element.align,
  };

  const tableDef = PRINT_TEMPLATE_FIELDS[documentKey]?.tables?.find(
    (t) => t.token === element.tableToken,
  );

  return (
    <div
      style={style}
      onPointerDown={handleMoveDown}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className={`group cursor-move select-none overflow-visible border ${
        selected
          ? "border-primary-500 bg-primary-50/40"
          : "border-transparent hover:border-gray-300"
      }`}
    >
      <div className="h-full w-full overflow-hidden px-0.5 text-[10px] leading-tight text-gray-800">
        {element.type === "image" ? (
          sampleData.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={String(sampleData.logoUrl)}
              alt="logo"
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gray-100 text-2xs text-gray-400">
              Logo
            </div>
          )
        ) : element.type === "table" && tableDef?.kind === "nested" ? (
          <div className="h-full w-full overflow-hidden rounded-sm bg-gray-50 p-1 text-2xs text-gray-500">
            {tableDef.label} — fixed layout, position/resize only
          </div>
        ) : element.type === "table" ? (
          <table className="w-full border-collapse text-[9px]">
            <thead>
              <tr>
                {(element.columns ?? []).map((c) => (
                  <th key={c} className="border-b border-gray-400 px-0.5 text-left">
                    {tableDef?.columns.find((col) => col.key === c)?.label ?? c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(Array.isArray(sampleData[element.tableToken ?? ""])
                ? (sampleData[element.tableToken ?? ""] as Record<string, unknown>[]).slice(0, 3)
                : []
              ).map((row, i) => (
                <tr key={i}>
                  {(element.columns ?? []).map((c) => (
                    <td key={c} className="border-b border-gray-200 px-0.5">
                      {String(row[c] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          previewText(element, sampleData) || (
            <span className="italic text-gray-400">Empty</span>
          )
        )}
      </div>
      {selected && (
        <div
          onPointerDown={handleResizeDown}
          className="absolute -bottom-1 -right-1 h-2.5 w-2.5 cursor-nwse-resize rounded-sm border border-white bg-primary-600"
        />
      )}
    </div>
  );
}
