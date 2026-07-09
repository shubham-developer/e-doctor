"use client";

import { useState } from "react";
import { useCurrency } from "@/lib/context";
import { apiClient } from "@/lib/apiClient";
import { useApiQuery } from "@/lib/useApiQuery";
import { Plus, Trash2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { AddLabTestDialog } from "@/components/ipd/AddLabTestDialog";
import type { IpdLabTest } from "@/components/ipd/types";

export function LabInvestigationTab({ ipdId }: { ipdId: string }) {
  const { fmt } = useCurrency();
  const [showForm, setShowForm] = useState(false);

  const { data: labTestsData, refetch: loadLabTests } = useApiQuery<
    IpdLabTest[]
  >(["ipd-lab-tests", ipdId], `/api/dashboard/ipd/${ipdId}/lab-tests`);
  const labTests = labTestsData ?? [];

  async function deleteLabTest(id: string) {
    const d = await apiClient.delete(
      `/api/dashboard/ipd/${ipdId}/lab-tests/${id}`,
    );
    if (d.success) loadLabTests();
  }

  const total = labTests.reduce((s, t) => s + t.amount, 0);

  const columns: ColumnDef<IpdLabTest>[] = [
    {
      key: "date",
      header: "Date",
      accessor: "date",
      sortable: true,
      width: "w-28",
      render: (t) => (
        <span className="text-xs text-gray-500">{t.date || "—"}</span>
      ),
    },
    {
      key: "testName",
      header: "Test",
      accessor: "testName",
      sortable: true,
      render: (t) => (
        <div>
          <p className="text-xs font-medium text-gray-800">{t.testName}</p>
          {t.note && <p className="text-xs text-gray-400">{t.note}</p>}
        </div>
      ),
      csvValue: (t) => t.testName,
    },
    {
      key: "categoryName",
      header: "Category",
      accessor: "categoryName",
      render: (t) => (
        <span className="text-xs text-gray-500">
          {t.categoryName || "—"}
        </span>
      ),
      csvValue: (t) => t.categoryName ?? "",
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      sortable: true,
      sortValue: (t) => t.amount,
      render: (t) => (
        <span className="text-xs font-semibold text-gray-900">
          {fmt(t.amount)}
        </span>
      ),
      csvValue: (t) => String(t.amount),
    },
    {
      key: "addedByName",
      header: "By",
      accessor: "addedByName",
      width: "w-28",
      render: (t) => (
        <span className="text-xs text-gray-500">{t.addedByName || "—"}</span>
      ),
      csvValue: (t) => t.addedByName ?? "",
    },
    {
      key: "actions",
      header: "",
      width: "w-12",
      align: "right",
      render: (t) => (
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => deleteLabTest(t._id)}
          className="text-gray-400 hover:text-danger-500 hover:bg-danger-50"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      ),
    },
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-800">
            Total Lab Charges:
          </span>
          <span className="text-sm font-bold text-primary-700">
            {fmt(total)}
          </span>
          <span className="text-xs text-gray-400">
            (added to Charges automatically)
          </span>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="w-3.5 h-3.5" /> Add Test
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={labTests}
        rowKey={(t) => t._id}
        emptyNode={
          <div className="flex flex-col items-center justify-center gap-2">
            <FileText className="w-10 h-10 opacity-20" />
            <p className="text-sm">No lab tests added yet</p>
            <p className="text-xs">
              Added tests are automatically billed in Charges
            </p>
          </div>
        }
        wrapperClassName="rounded-lg"
        downloadable
        printable
        fileName="IPD Lab Investigations"
      />

      <AddLabTestDialog
        ipdId={ipdId}
        open={showForm}
        onClose={() => setShowForm(false)}
        onSaved={loadLabTests}
      />
    </div>
  );
}
