"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { PRINT_TEMPLATE_FIELDS } from "@/lib/print/templateFields";
import type { PrintTemplateElement, PrintDocumentKey } from "@/lib/print/customTemplate";

/** Selected-element property panel. Table columns are reorder/show-hide only (not per-cell drag) — repeating rows can't have individually-positioned cells without a much bigger rendering model, so a table element is positioned/resized as one block on the canvas and its contents are configured here. */
export function ElementInspector({
  documentKey,
  element,
  onChange,
  onDelete,
  onDuplicate,
  onBringToFront,
  onSendToBack,
}: {
  documentKey: PrintDocumentKey;
  element: PrintTemplateElement;
  onChange: (patch: Partial<PrintTemplateElement>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
}) {
  const tableDef = PRINT_TEMPLATE_FIELDS[documentKey]?.tables?.find(
    (t) => t.token === element.tableToken,
  );

  function moveColumn(key: string, dir: -1 | 1) {
    const cols = element.columns ?? [];
    const idx = cols.indexOf(key);
    const swapIdx = idx + dir;
    if (idx < 0 || swapIdx < 0 || swapIdx >= cols.length) return;
    const next = [...cols];
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    onChange({ columns: next });
  }

  function toggleColumn(key: string, checked: boolean) {
    const cols = element.columns ?? [];
    if (checked) {
      const order = tableDef?.columns.map((c) => c.key) ?? [];
      onChange({ columns: order.filter((k) => cols.includes(k) || k === key) });
    } else {
      onChange({ columns: cols.filter((c) => c !== key) });
    }
  }

  const typeLabel =
    element.type === "table"
      ? "Table"
      : element.type === "image"
        ? "Image"
        : element.type === "field"
          ? "Field"
          : "Text";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-2xs font-semibold uppercase tracking-wide text-gray-500">
          {typeLabel}
        </h3>
        <div className="flex gap-1">
          <Button type="button" variant="outline" size="xs" onClick={onDuplicate}>
            Duplicate
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="xs"
            onClick={onDelete}
          >
            Delete
          </Button>
        </div>
      </div>

      <div className="flex gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="xs"
          className="flex-1"
          onClick={onSendToBack}
        >
          Send to back
        </Button>
        <Button
          type="button"
          variant="outline"
          size="xs"
          className="flex-1"
          onClick={onBringToFront}
        >
          Bring to front
        </Button>
      </div>

      {element.type === "text" && (
        <div>
          <label className="mb-1 block text-2xs text-gray-500">
            Content ({"{{token}}"} placeholders supported)
          </label>
          <Textarea
            className="min-h-16 text-xs"
            value={element.content ?? ""}
            onChange={(e) => onChange({ content: e.target.value })}
          />
        </div>
      )}

      {element.type === "field" && (
        <div>
          <label className="mb-1 block text-2xs text-gray-500">Label prefix</label>
          <Input
            className="h-7 text-xs"
            value={element.label ?? ""}
            onChange={(e) => onChange({ label: e.target.value })}
          />
        </div>
      )}

      {(element.type === "text" || element.type === "field") && (
        <>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <label className="text-2xs text-gray-500">Size</label>
              <Input
                type="number"
                className="h-7 w-16 text-xs"
                value={element.fontSize ?? 12}
                onChange={(e) =>
                  onChange({ fontSize: Number(e.target.value) || undefined })
                }
              />
            </div>
            <label className="flex items-center gap-1.5 text-2xs text-gray-500">
              <Checkbox
                checked={!!element.bold}
                onCheckedChange={(v) => onChange({ bold: !!v })}
              />
              Bold
            </label>
          </div>
          <div className="flex gap-1">
            {(["left", "center", "right"] as const).map((a) => (
              <Button
                key={a}
                type="button"
                variant={element.align === a ? "default" : "outline"}
                size="xs"
                className="flex-1 capitalize"
                onClick={() => onChange({ align: a })}
              >
                {a}
              </Button>
            ))}
          </div>
        </>
      )}

      {element.type === "table" && tableDef?.kind === "flat" && (
        <div>
          <label className="mb-1 block text-2xs text-gray-500">Columns</label>
          <div className="space-y-1">
            {tableDef.columns.map((c) => {
              const visible = (element.columns ?? []).includes(c.key);
              return (
                <div
                  key={c.key}
                  className="flex items-center justify-between gap-1 rounded border border-gray-100 px-1.5 py-1"
                >
                  <label className="flex items-center gap-1.5 text-xs text-gray-700">
                    <Checkbox
                      checked={visible}
                      onCheckedChange={(v) => toggleColumn(c.key, !!v)}
                    />
                    {c.label}
                  </label>
                  {visible && (
                    <div className="flex gap-0.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-xs"
                        onClick={() => moveColumn(c.key, -1)}
                      >
                        ↑
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-xs"
                        onClick={() => moveColumn(c.key, 1)}
                      >
                        ↓
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {element.type === "table" && tableDef?.kind === "nested" && (
        <p className="text-2xs text-gray-500">
          This section has a fixed internal layout — position and resize it, but
          its rows/columns aren&apos;t configurable.
        </p>
      )}
    </div>
  );
}
