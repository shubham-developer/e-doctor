"use client";

import { Button } from "@/components/ui/button";
import { PRINT_TEMPLATE_FIELDS, CLINIC_LOGO_TOKEN } from "@/lib/print/templateFields";
import type { PrintDocumentKey, PrintTemplateElement } from "@/lib/print/customTemplate";

let counter = 0;
function newId() {
  counter += 1;
  return `el-${Date.now()}-${counter}`;
}

const DEFAULT_BOX = { x: 10, y: 10, width: 35, height: 6 };

/** Click-to-add palette of the document's available placeholder tokens/tables — the user drags the placed element afterward (see Canvas.tsx), rather than dragging directly from here, since the canvas can be rendered at a scaled size and native HTML5 drag-and-drop coordinate math across that scale is unnecessarily fragile for what a simple add-then-move interaction achieves just as well. */
export function FieldPalette({
  documentKey,
  onAdd,
}: {
  documentKey: PrintDocumentKey;
  onAdd: (element: PrintTemplateElement) => void;
}) {
  const registry = PRINT_TEMPLATE_FIELDS[documentKey];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-gray-500">
          Add
        </h3>
        <div className="flex flex-wrap gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              onAdd({ id: newId(), type: "text", ...DEFAULT_BOX, content: "New text" })
            }
          >
            + Text Box
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              onAdd({
                id: newId(),
                type: "image",
                x: 10,
                y: 10,
                width: 25,
                height: 12,
                token: CLINIC_LOGO_TOKEN,
              })
            }
          >
            + Logo
          </Button>
        </div>
      </div>

      <div>
        <h3 className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-gray-500">
          Fields
        </h3>
        <div className="flex max-h-56 flex-wrap gap-1.5 overflow-y-auto">
          {registry.fields.map((f) => (
            <Button
              key={f.token}
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                onAdd({
                  id: newId(),
                  type: "field",
                  ...DEFAULT_BOX,
                  token: f.token,
                  label: `${f.label}:`,
                })
              }
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {registry.tables && registry.tables.length > 0 && (
        <div>
          <h3 className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-gray-500">
            Tables
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {registry.tables.map((t) => (
              <Button
                key={t.token}
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  onAdd({
                    id: newId(),
                    type: "table",
                    x: 5,
                    y: 40,
                    width: 90,
                    height: 30,
                    tableToken: t.token,
                    columns:
                      t.kind === "flat" ? t.columns.map((c) => c.key) : undefined,
                  })
                }
              >
                + {t.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
