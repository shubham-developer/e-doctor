"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useApp } from "@/lib/context";
import { apiClient } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/ui/page-loader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PRINT_LAYOUTS,
  PRINT_LAYOUT_IDS,
  PRINT_MODULES,
  DEFAULT_PRINT_LAYOUT,
  resolvePrintLayout,
  type PrintLayoutId,
  type PrintModuleKey,
} from "@/lib/print/layouts";
import {
  documentsForModule,
  type PrintTemplate,
} from "@/lib/print/customTemplate";
import { PrintLayoutPreview } from "./PrintLayoutPreview";
import { CustomLayoutPreview } from "./CustomLayoutPreview";

type LayoutMap = Record<PrintModuleKey, PrintLayoutId>;

function layoutMapFrom(saved?: Record<string, string> | null): LayoutMap {
  return Object.fromEntries(
    PRINT_MODULES.map(({ key }) => [key, resolvePrintLayout(saved, key)]),
  ) as LayoutMap;
}

export function PrintLayoutSettings() {
  const { user, tenant, refetch } = useApp();
  const isOwner = user?.role === "OWNER";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [layouts, setLayouts] = useState<LayoutMap>(() => layoutMapFrom(null));
  const [customTemplates, setCustomTemplates] = useState<
    Record<string, PrintTemplate>
  >({});
  const [previewModule, setPreviewModule] = useState<PrintModuleKey>(
    PRINT_MODULES[0].key,
  );

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
          setLayouts(layoutMapFrom(d.data?.tenant.printLayouts));
          setCustomTemplates(d.data?.tenant.customPrintTemplates ?? {});
        } else {
          toast.error(d.error ?? "Failed to load print layout settings");
        }
        setLoading(false);
      });
  }, []);

  function setModuleLayout(module: PrintModuleKey, layout: PrintLayoutId) {
    setLayouts((prev) => ({ ...prev, [module]: layout }));
    setPreviewModule(module);
  }

  function hasTemplate(documentKey: string) {
    return (customTemplates[documentKey]?.elements?.length ?? 0) > 0;
  }

  async function handleSave() {
    // A module set to "custom" whose document(s) were never designed would
    // otherwise silently fall back to preset rendering at print time —
    // indistinguishable from "nothing happened" to the hospital staff who
    // picked it. Block Save until every "custom" module has a real design.
    const undesigned = PRINT_MODULES.filter(
      ({ key }) => layouts[key] === "custom",
    ).flatMap((m) =>
      documentsForModule(m.key).filter((doc) => !hasTemplate(doc.key)),
    );
    if (undesigned.length > 0) {
      toast.error(
        `Open the builder and design these before saving: ${undesigned
          .map((d) => d.label)
          .join(", ")}`,
      );
      return;
    }

    setSaving(true);
    const d = await apiClient.patch("/api/dashboard/settings", {
      printLayouts: layouts,
    });
    setSaving(false);
    if (d.success) {
      toast.success("Print layouts saved");
      refetch();
    } else {
      toast.error(d.error ?? "Failed to save print layouts");
    }
  }

  if (loading) return <PageLoader rows={6} />;

  const previewLayout = layouts[previewModule];

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-800">Print Layouts</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Every bill, receipt and report prints with the same letterhead — the
          layout controls how it is arranged. Pick a layout per module.
        </p>
      </div>

      <div className="grid gap-6 px-6 py-5 lg:grid-cols-[1fr_280px]">
        <div>
          <div className="flex items-center justify-end gap-2 pb-3 border-b border-gray-100">
            <span className="text-xs text-gray-500">Apply to all modules</span>
            <Select
              value=""
              onValueChange={(v) => {
                if (!v) return;
                setLayouts(
                  layoutMapFrom(
                    Object.fromEntries(
                      PRINT_MODULES.map(({ key }) => [key, v]),
                    ),
                  ),
                );
              }}
              disabled={!isOwner}
            >
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue placeholder="Choose layout…" />
              </SelectTrigger>
              <SelectContent>
                {PRINT_LAYOUT_IDS.map((id) => (
                  <SelectItem key={id} value={id}>
                    {PRINT_LAYOUTS[id].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {PRINT_MODULES.map(({ key, label }) => {
            const docsForKey = documentsForModule(key);
            return (
              <div
                key={key}
                onClick={() => setPreviewModule(key)}
                className={`px-2 py-2.5 border-b border-gray-50 cursor-pointer rounded ${
                  previewModule === key ? "bg-primary-50/60" : "hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-medium text-gray-700">
                    {label}
                  </span>
                  <div className="flex items-center gap-2">
                    {layouts[key] !== DEFAULT_PRINT_LAYOUT && (
                      <span className="text-2xs font-medium uppercase tracking-wide text-primary-600">
                        Modified
                      </span>
                    )}
                    <Select
                      value={layouts[key]}
                      onValueChange={(v) =>
                        v && setModuleLayout(key, v as PrintLayoutId)
                      }
                      disabled={!isOwner}
                    >
                      <SelectTrigger className="h-8 w-40 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRINT_LAYOUT_IDS.map((id) => (
                          <SelectItem key={id} value={id}>
                            {PRINT_LAYOUTS[id].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {layouts[key] === "custom" && (
                  <div className="mt-1.5 flex flex-wrap gap-3">
                    {docsForKey.map((doc) => (
                      <Link
                        key={doc.key}
                        href={`/dashboard/settings/print-layouts/builder?document=${doc.key}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-2xs font-medium text-primary-600 hover:underline"
                      >
                        {docsForKey.length > 1 ? `Edit ${doc.label}` : "Open Builder"}{" "}
                        →
                        {!hasTemplate(doc.key) && (
                          <span className="ml-1 font-normal normal-case text-warning-600">
                            (not designed yet)
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="lg:sticky lg:top-4 self-start">
          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
            Preview —{" "}
            {PRINT_MODULES.find((m) => m.key === previewModule)?.label}
          </h3>
          {previewLayout === "custom" ? (
            <div className="space-y-3">
              {documentsForModule(previewModule).map((doc) => (
                <div key={doc.key}>
                  {documentsForModule(previewModule).length > 1 && (
                    <p className="mb-1 text-2xs font-medium text-gray-500">
                      {doc.label}
                    </p>
                  )}
                  <CustomLayoutPreview
                    documentKey={doc.key}
                    template={customTemplates[doc.key]}
                  />
                </div>
              ))}
              <p className="text-xs text-gray-500">
                <span className="font-medium text-gray-700">Custom:</span>{" "}
                {PRINT_LAYOUTS.custom.description}
              </p>
            </div>
          ) : (
            <>
              <PrintLayoutPreview
                layout={previewLayout}
                clinicName={tenant?.name ?? "Clinic"}
              />
              <p className="text-xs text-gray-500 mt-2">
                <span className="font-medium text-gray-700">
                  {PRINT_LAYOUTS[previewLayout].label}:
                </span>{" "}
                {PRINT_LAYOUTS[previewLayout].description}
              </p>
            </>
          )}
        </div>
      </div>

      {isOwner && (
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-primary-600 hover:bg-primary-700 px-8"
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      )}
    </div>
  );
}
