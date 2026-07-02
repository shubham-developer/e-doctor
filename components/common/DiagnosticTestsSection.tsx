"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
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
  const [tests, setTests] = useState<DiagnosticTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editTest, setEditTest] = useState<DiagnosticTest | null>(null);
  const canEdit = user?.role !== "VIEWER";

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiClient.get<{ tests: DiagnosticTest[] }>(apiBase);
    if (res.success) setTests(res.data.tests ?? []);
    else toast.error(res.error);
    setLoading(false);
  }, [apiBase]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(t: DiagnosticTest) {
    if (!confirm(`Delete "${t.name}"?`)) return;
    const res = await apiClient.delete(`${apiBase}/${t._id}`);
    if (res.success) {
      toast.success("Test deleted");
      setTests((prev) => prev.filter((x) => x._id !== t._id));
    } else toast.error(res.error);
  }

  const filtered = search
    ? tests.filter(
        (t) =>
          t.name.toLowerCase().includes(search.toLowerCase()) ||
          t.shortName.toLowerCase().includes(search.toLowerCase()),
      )
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
      key: "short",
      header: "Short Name",
      width: "w-28",
      render: (t) => (
        <span className="text-xs text-gray-600">{t.shortName}</span>
      ),
    },
    {
      key: "testType",
      header: "Test Type",
      width: "w-28",
      render: (t) => (
        <span className="text-xs text-gray-500">{t.testType || "—"}</span>
      ),
    },
    {
      key: "method",
      header: "Method",
      width: "w-28",
      render: (t) => (
        <span className="text-xs text-gray-500">{t.method || "—"}</span>
      ),
    },
    {
      key: "chargeCategory",
      header: "Charge Category",
      width: "w-32",
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
      key: "tax",
      header: "Tax (%)",
      width: "w-20",
      align: "right",
      render: (t) => (
        <span className="text-xs font-mono text-gray-600">
          {t.tax.toFixed(2)}
        </span>
      ),
    },
    {
      key: "charge",
      header: `Charge (${sym})`,
      width: "w-24",
      align: "right",
      sortable: true,
      sortValue: (t) => t.standardCharge,
      render: (t) => (
        <span className="text-xs font-mono text-gray-700">
          {t.standardCharge.toFixed(2)}
        </span>
      ),
    },
    {
      key: "amount",
      header: `Amount (${sym})`,
      width: "w-24",
      align: "right",
      sortable: true,
      sortValue: (t) => t.amount,
      render: (t) => (
        <span className="text-xs font-mono font-semibold text-blue-700">
          {t.amount.toFixed(2)}
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
                  className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-500 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(t)}
                  className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
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
          onSaved={(saved) => {
            if (editTest)
              setTests((prev) =>
                prev.map((t) => (t._id === saved._id ? saved : t)),
              );
            else setTests((prev) => [saved, ...prev]);
          }}
        />
      )}

      <div className="h-full flex flex-col bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 shrink-0 bg-gray-50 px-3 py-2">
          <h1 className="text-sm font-semibold text-gray-800">{title}</h1>
          {canEdit && (
            <Button
              size="sm"
              className="h-8 text-xs gap-1 bg-blue-600 hover:bg-blue-700"
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
