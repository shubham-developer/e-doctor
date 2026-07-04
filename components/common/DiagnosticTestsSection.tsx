"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useApiQuery } from "@/lib/useApiQuery";
import { useApp, useCurrency } from "@/lib/context";
import { Button } from "@/components/ui/button";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { Plus, Trash2, Pencil } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { TestDialog } from "@/components/common/TestDialog";
import type { DiagnosticTest } from "@/lib/types/diagnosticTest";

/** Shared Pathology/Radiology tests list + Add/Edit flow. */
export function DiagnosticTestsSection({
  module,
  apiBase,
  title,
  addLabel,
  fileName,
  emptyText,
}: {
  module: "pathology" | "radiology";
  apiBase: string;
  title: string;
  addLabel: string;
  fileName: string;
  emptyText: string;
}) {
  const { user } = useApp();
  const { sym } = useCurrency();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editTest, setEditTest] = useState<DiagnosticTest | null>(null);
  const canEdit = user?.role !== "VIEWER";
  const queryClient = useQueryClient();

  // Same key the bill dialogs / IPD lab tab read from, so edits here
  // propagate to their cached test catalogues.
  const testsKey = [`${module}-tests`];
  const {
    data: testsData,
    isPending: loading,
    refetch: load,
  } = useApiQuery<{ tests: DiagnosticTest[] }>(testsKey, apiBase);
  const tests = testsData?.tests ?? [];

  async function handleDelete(t: DiagnosticTest) {
    if (!confirm(`Delete "${t.name}"?`)) return;
    const res = await apiClient.delete(`${apiBase}/${t._id}`);
    if (res.success) {
      toast.success("Test deleted");
      queryClient.invalidateQueries({ queryKey: testsKey });
    } else toast.error(res.error);
  }

  const filtered = search
    ? tests.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
    : tests;

  const columns: ColumnDef<DiagnosticTest>[] = [
    {
      key: "name",
      header: "Test Name",
      sortable: true,
      sortValue: (t) => t.name,
      render: (t) => (
        <span className="text-xs font-medium text-gray-900">{t.name}</span>
      ),
    },
    {
      key: "chargeCategory",
      header: "Service",
      width: "w-40",
      render: (t) => (
        <span className="text-xs text-gray-500">{t.chargeName || "—"}</span>
      ),
      csvValue: (t) => t.chargeName ?? "",
    },
    {
      key: "days",
      header: "Report Days",
      width: "w-24",
      align: "center",
      sortable: true,
      sortValue: (t) => t.reportDays,
      render: (t) => (
        <span className="text-xs font-mono text-gray-700">{t.reportDays}</span>
      ),
    },
    {
      key: "charge",
      header: `Price (${sym})`,
      width: "w-28",
      align: "right",
      sortable: true,
      sortValue: (t) => t.standardCharge,
      render: (t) => (
        <span className="text-xs font-mono font-semibold text-primary-700">
          {t.standardCharge.toFixed(2)}
        </span>
      ),
    },
    ...(canEdit
      ? [
          {
            key: "actions",
            header: "",
            width: "w-16",
            render: (t: DiagnosticTest) => (
              <div className="flex items-center justify-center gap-1">
                <button
                  onClick={() => setEditTest(t)}
                  className="p-1.5 rounded hover:bg-primary-50 text-gray-400 hover:text-primary-500 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(t)}
                  className="p-1.5 rounded hover:bg-danger-50 text-gray-400 hover:text-danger-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      {(showAdd || editTest) && (
        <TestDialog
          test={editTest}
          apiBase={apiBase}
          module={module}
          onClose={() => {
            setShowAdd(false);
            setEditTest(null);
          }}
          onSaved={() => queryClient.invalidateQueries({ queryKey: testsKey })}
        />
      )}

      <div className="h-full flex flex-col bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 shrink-0 bg-gray-50 px-3 py-2">
          <h1 className="text-lg font-semibold text-gray-800">{title}</h1>
          {canEdit && (
            <Button
              size="sm"
              className="h-8 text-xs gap-1 bg-primary-600 hover:bg-primary-700"
              onClick={() => setShowAdd(true)}
            >
              <Plus className="w-3.5 h-3.5" /> {addLabel}
            </Button>
          )}
        </div>

        <DataTable<DiagnosticTest>
          columns={columns}
          data={filtered}
          rowKey={(t) => t._id}
          loading={loading}
          skeletonRows={6}
          wrapperClassName="flex-1 overflow-auto"
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search tests…"
          downloadable
          printable
          fileName={fileName}
          emptyText={emptyText}
        />

        <div className="px-3 py-1.5 border-t border-gray-200 shrink-0 bg-gray-50">
          <span className="text-xs text-gray-500">
            Records: {filtered.length} of {tests.length}
          </span>
        </div>
      </div>
    </>
  );
}
