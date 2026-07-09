"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useApp } from "@/lib/context";
import { apiClient } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/ui/page-loader";
import {
  PRINT_DOCUMENTS,
  type PrintDocumentKey,
  type PrintTemplate,
  type PrintTemplateElement,
} from "@/lib/print/customTemplate";
import { renderCustomPrintHtml } from "@/lib/print/renderCustomTemplate";
import { SAMPLE_DATA } from "./sampleData";
import { Canvas } from "./Canvas";
import { FieldPalette } from "./FieldPalette";
import { ElementInspector } from "./ElementInspector";

/** How long a burst of continuous changes (a drag or resize gesture) is treated as one undo step, rather than pushing a history entry per pointermove tick. */
const HISTORY_COALESCE_MS = 400;

export function PrintTemplateBuilder({
  documentKey,
}: {
  documentKey: PrintDocumentKey;
}) {
  const router = useRouter();
  const { user, refetch } = useApp();
  const isOwner = user?.role === "OWNER";
  const doc = PRINT_DOCUMENTS.find((d) => d.key === documentKey);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [elements, setElements] = useState<PrintTemplateElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [existingPrintLayouts, setExistingPrintLayouts] = useState<
    Record<string, string>
  >({});
  const [existingTemplates, setExistingTemplates] = useState<
    Record<string, PrintTemplate>
  >({});

  const elementsRef = useRef(elements);
  useEffect(() => {
    elementsRef.current = elements;
  }, [elements]);

  const past = useRef<PrintTemplateElement[][]>([]);
  const future = useRef<PrintTemplateElement[][]>([]);
  const lastChangeAt = useRef(0);
  // past/future live in refs (so continuous drag updates don't re-render on every
  // push), these mirror their lengths purely to drive the Undo/Redo buttons' disabled state.
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const syncHistoryState = useCallback(() => {
    setCanUndo(past.current.length > 0);
    setCanRedo(future.current.length > 0);
  }, []);

  useEffect(() => {
    apiClient
      .get<{
        tenant: {
          printLayouts?: Record<string, string>;
          customPrintTemplates?: Record<string, PrintTemplate>;
        };
      }>("/api/dashboard/settings")
      .then((d) => {
        if (d.success) {
          setExistingPrintLayouts(d.data?.tenant.printLayouts ?? {});
          setExistingTemplates(d.data?.tenant.customPrintTemplates ?? {});
          setElements(
            d.data?.tenant.customPrintTemplates?.[documentKey]?.elements ?? [],
          );
        } else {
          toast.error(d.error ?? "Failed to load the saved layout");
        }
        setLoading(false);
      });
  }, [documentKey]);

  /** Discrete actions (add/delete/duplicate/reorder/toggle) always push a fresh history entry. */
  const commitDiscrete = useCallback(
    (next: PrintTemplateElement[]) => {
      past.current.push(elementsRef.current);
      future.current = [];
      lastChangeAt.current = 0;
      setElements(next);
      syncHistoryState();
    },
    [syncHistoryState],
  );

  /** Continuous changes (drag/resize) coalesce into one history entry per gesture. */
  const updateElement = useCallback(
    (id: string, patch: Partial<PrintTemplateElement>) => {
      const now = Date.now();
      if (now - lastChangeAt.current > HISTORY_COALESCE_MS) {
        past.current.push(elementsRef.current);
        future.current = [];
        syncHistoryState();
      }
      lastChangeAt.current = now;
      setElements((prev) =>
        prev.map((el) => (el.id === id ? { ...el, ...patch } : el)),
      );
    },
    [syncHistoryState],
  );

  const undo = useCallback(() => {
    if (past.current.length === 0) return;
    const prev = past.current.pop()!;
    future.current.push(elementsRef.current);
    lastChangeAt.current = 0;
    setElements(prev);
    syncHistoryState();
  }, [syncHistoryState]);

  const redo = useCallback(() => {
    if (future.current.length === 0) return;
    const next = future.current.pop()!;
    past.current.push(elementsRef.current);
    lastChangeAt.current = 0;
    setElements(next);
    syncHistoryState();
  }, [syncHistoryState]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "z") return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo]);

  function addElement(el: PrintTemplateElement) {
    commitDiscrete([...elements, el]);
    setSelectedId(el.id);
  }

  function deleteSelected() {
    if (!selectedId) return;
    commitDiscrete(elements.filter((el) => el.id !== selectedId));
    setSelectedId(null);
  }

  function duplicateSelected() {
    const el = elements.find((e) => e.id === selectedId);
    if (!el) return;
    const copy: PrintTemplateElement = {
      ...el,
      id: `el-${Date.now()}-${Math.round(Math.random() * 1000)}`,
      x: Math.min(95, el.x + 3),
      y: Math.min(95, el.y + 3),
    };
    commitDiscrete([...elements, copy]);
    setSelectedId(copy.id);
  }

  function bringToFront() {
    if (!selectedId) return;
    const el = elements.find((e) => e.id === selectedId);
    if (!el) return;
    commitDiscrete([...elements.filter((e) => e.id !== selectedId), el]);
  }

  function sendToBack() {
    if (!selectedId) return;
    const el = elements.find((e) => e.id === selectedId);
    if (!el) return;
    commitDiscrete([el, ...elements.filter((e) => e.id !== selectedId)]);
  }

  function updateSelected(patch: Partial<PrintTemplateElement>) {
    if (!selectedId) return;
    commitDiscrete(
      elements.map((el) => (el.id === selectedId ? { ...el, ...patch } : el)),
    );
  }

  function handlePreview() {
    const win = window.open(
      "",
      "_blank",
      "width=860,height=1100,menubar=no,toolbar=no,scrollbars=yes",
    );
    if (!win) return;
    win.document.write(
      renderCustomPrintHtml({
        title: `Preview – ${doc?.label ?? "Layout"}`,
        documentKey,
        template: { elements },
        data: SAMPLE_DATA[documentKey],
      }),
    );
    win.document.close();
  }

  async function handleSave() {
    if (elements.length === 0) {
      toast.error("Add at least one field before saving");
      return;
    }
    if (!doc) return;
    setSaving(true);
    const nextTemplates = { ...existingTemplates, [documentKey]: { elements } };
    const nextLayouts = { ...existingPrintLayouts, [doc.module]: "custom" };
    const res = await apiClient.patch("/api/dashboard/settings", {
      customPrintTemplates: nextTemplates,
      printLayouts: nextLayouts,
    });
    setSaving(false);
    if (res.success) {
      toast.success("Layout saved");
      setExistingTemplates(nextTemplates);
      setExistingPrintLayouts(nextLayouts);
      refetch();
    } else {
      toast.error(res.error ?? "Failed to save layout");
    }
  }

  if (loading) return <PageLoader rows={8} />;

  const selected = elements.find((el) => el.id === selectedId) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-800">
            {doc?.label ?? "Custom Layout"} — Layout Builder
          </h1>
          <p className="text-xs text-gray-500">
            Drag fields onto the page, resize them, and bind values to{" "}
            {"{{"}placeholders{"}}"}. Arrow keys nudge the selected element
            (Shift for bigger steps).
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => router.push("/dashboard/settings/print-layouts")}
        >
          Back to Print Layouts
        </Button>
      </div>

      {!isOwner && (
        <div className="rounded border border-warning-200 bg-warning-50 px-3 py-2 text-xs text-warning-700">
          Only the account owner can edit and save print layouts. You can
          still preview the current design.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[220px_1fr_260px]">
        {isOwner && (
          <div className="rounded-lg border border-gray-200 bg-white p-3">
            <FieldPalette documentKey={documentKey} onAdd={addElement} />
          </div>
        )}
        {!isOwner && <div />}

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={undo}
                disabled={!canUndo}
              >
                Undo
              </Button>
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={redo}
                disabled={!canRedo}
              >
                Redo
              </Button>
            </div>
            <div className="flex gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePreview}
              >
                Print Preview
              </Button>
              {isOwner && (
                <Button
                  type="button"
                  size="sm"
                  className="bg-primary-600 hover:bg-primary-700"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Save"}
                </Button>
              )}
            </div>
          </div>
          <Canvas
            documentKey={documentKey}
            elements={elements}
            sampleData={SAMPLE_DATA[documentKey]}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onChangeElement={updateElement}
          />
        </div>

        {isOwner && (
          <div className="rounded-lg border border-gray-200 bg-white p-3">
            {selected ? (
              <ElementInspector
                documentKey={documentKey}
                element={selected}
                onChange={updateSelected}
                onDelete={deleteSelected}
                onDuplicate={duplicateSelected}
                onBringToFront={bringToFront}
                onSendToBack={sendToBack}
              />
            ) : (
              <p className="text-xs text-gray-500">
                Select an element on the page to edit it, or add one from the
                palette on the left.
              </p>
            )}
          </div>
        )}
        {!isOwner && <div />}
      </div>
    </div>
  );
}
