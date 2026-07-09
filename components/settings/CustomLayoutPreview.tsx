"use client";

import {
  PAGE_WIDTH_MM,
  PAGE_HEIGHT_MM,
  type PrintTemplate,
  type PrintDocumentKey,
} from "@/lib/print/customTemplate";
import { CanvasElement } from "./print-builder/CanvasElement";
import { SAMPLE_DATA } from "./print-builder/sampleData";

/** Read-only miniature of a tenant's saved Custom layout — shown in Settings → Print Layouts in place of PrintLayoutPreview, which only knows the 5 fixed CSS presets and can't represent an arbitrary canvas. Reuses CanvasElement (non-interactive) so this can't visually drift from the builder itself. */
export function CustomLayoutPreview({
  documentKey,
  template,
}: {
  documentKey: PrintDocumentKey;
  template: PrintTemplate | undefined;
}) {
  const elements = template?.elements ?? [];

  if (elements.length === 0) {
    return (
      <div
        className="flex w-full items-center justify-center rounded border border-dashed border-gray-300 bg-white p-4 text-center text-2xs text-gray-400"
        style={{ aspectRatio: `${PAGE_WIDTH_MM} / ${PAGE_HEIGHT_MM}` }}
      >
        No custom layout designed yet — open the builder to get started.
      </div>
    );
  }

  return (
    <div
      className="pointer-events-none relative w-full overflow-hidden rounded border border-gray-200 bg-white shadow-sm"
      style={{ aspectRatio: `${PAGE_WIDTH_MM} / ${PAGE_HEIGHT_MM}` }}
    >
      {elements.map((el) => (
        <CanvasElement
          key={el.id}
          documentKey={documentKey}
          element={el}
          sampleData={SAMPLE_DATA[documentKey]}
          selected={false}
          onSelect={() => {}}
          onChange={() => {}}
        />
      ))}
    </div>
  );
}
