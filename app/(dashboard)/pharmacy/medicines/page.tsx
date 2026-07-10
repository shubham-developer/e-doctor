"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useApiQuery } from "@/lib/useApiQuery";
import { toast } from "sonner";
import { Plus, Download, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TablePagination } from "@/components/common/TablePagination";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { apiClient } from "@/lib/apiClient";
import { MedicineModal } from "@/components/pharmacy/MedicineModal";
import { BadStockModal } from "@/components/pharmacy/BadStockModal";
import type { Medicine } from "@/components/pharmacy/types";

export default function MedicinesPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState(""); // debounced — drives the fetch
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const queryClient = useQueryClient();
  const [badStockMed, setBadStockMed] = useState<Medicine | null>(null);
  const limit = 100;

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setSearch(searchInput);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const {
    data: medsData,
    isPending: loading,
    refetch: fetchMeds,
  } = useApiQuery<{
    medicines: Medicine[];
    total: number;
    totalPages: number;
  }>(
    ["medicines-list", search, page],
    `/api/dashboard/pharmacy/medicines?search=${encodeURIComponent(search)}&page=${page}&limit=${limit}`,
    { keepPrevious: true },
  );
  const medicines = medsData?.medicines ?? [];
  const total = medsData?.total ?? 0;

  async function bulkDelete() {
    setDeleting(true);
    const data = await apiClient.delete<{ deleted: number }>(
      "/api/dashboard/pharmacy/medicines",
      { ids: Array.from(selectedKeys) },
    );
    if (data.success) {
      queryClient.invalidateQueries({ queryKey: ["medicines"] });
      toast.success(
        `${data.data.deleted} medicine${data.data.deleted !== 1 ? "s" : ""} deleted`,
      );
      setSelectedKeys(new Set());
      fetchMeds();
    } else {
      toast.error(data.error);
    }
    setDeleting(false);
  }

  const medColumns: ColumnDef<Medicine>[] = [
    {
      key: "name",
      header: "Medicine Name",
      sortable: true,
      sortValue: (m) => m.name,
      skeletonWidth: "w-36",
      render: (m) => (
        <span className="text-xs font-medium whitespace-nowrap">{m.name}</span>
      ),
    },
    {
      key: "company",
      header: "Company",
      sortable: true,
      sortValue: (m) => m.company ?? "",
      skeletonWidth: "w-24",
      render: (m) => (
        <span className="text-xs text-gray-600">{m.company || "—"}</span>
      ),
    },
    {
      key: "composition",
      header: "Composition",
      skeletonWidth: "w-32",
      className: "max-w-xs truncate",
      render: (m) => (
        <span className="text-xs text-gray-600">{m.composition || "—"}</span>
      ),
    },
    {
      key: "category",
      header: "Category",
      sortable: true,
      sortValue: (m) => m.category ?? "",
      skeletonWidth: "w-20",
      render: (m) => (
        <span className="text-xs text-gray-600">{m.category || "—"}</span>
      ),
    },
    {
      key: "group",
      header: "Group",
      skeletonWidth: "w-16",
      render: (m) => (
        <span className="text-xs text-gray-600">{m.group || "—"}</span>
      ),
    },
    {
      key: "unit",
      header: "Unit",
      skeletonWidth: "w-12",
      render: (m) => (
        <span className="text-xs text-gray-600">{m.unit || "—"}</span>
      ),
    },
    {
      key: "availableQty",
      header: "Qty",
      align: "right",
      sortable: true,
      sortValue: (m) => m.availableQty,
      skeletonWidth: "w-12",
      render: (m) => (
        <span
          className={`text-xs font-medium ${m.availableQty === 0 ? "text-danger-500" : m.availableQty <= m.reorderLevel ? "text-warning-500" : "text-gray-700"}`}
        >
          {m.availableQty}
          {m.availableQty === 0 && <span className="ml-1">(Out)</span>}
          {m.availableQty > 0 && m.availableQty <= m.reorderLevel && (
            <span className="ml-1">(Low)</span>
          )}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      width: "160px",
      skeletonWidth: "w-24",
      render: (m) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="outline"
            size="xs"
            onClick={(e) => {
              e.stopPropagation();
              setEditingMedicine(m);
            }}
            className="text-primary-600 border-primary-200 hover:text-primary-800 hover:border-primary-400"
          >
            Edit
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={(e) => {
              e.stopPropagation();
              setBadStockMed(m);
            }}
            className="text-warning-600 border-warning-200 hover:text-warning-800 hover:border-warning-400"
          >
            <AlertTriangle className="w-3 h-3" /> Bad Stock
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b">
        <h1 className="text-lg font-semibold text-gray-800">Medicines Stock</h1>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.info("Import coming soon")}
            className="flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" /> Import Medicines
          </Button>
          <Button
            size="sm"
            onClick={() => setShowAdd(true)}
            className="bg-primary-600 hover:bg-primary-700 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add Medicine
          </Button>
        </div>
      </div>

      {/* Table */}
      <DataTable<Medicine>
        columns={medColumns}
        data={medicines}
        rowKey={(m) => m._id}
        loading={loading}
        emptyText="No medicines found"
        onRowClick={(m) => {
          if (selectedKeys.size === 0) setEditingMedicine(m);
        }}
        wrapperClassName="flex-1 overflow-auto"
        searchValue={searchInput}
        onSearchChange={(v) => setSearchInput(v)}
        selectable
        selectedKeys={selectedKeys}
        onSelectAll={(keys) => setSelectedKeys(new Set(keys))}
        onSelectRow={(key, checked) =>
          setSelectedKeys((prev) => {
            const next = new Set(prev);
            checked ? next.add(key) : next.delete(key);
            return next;
          })
        }
        toolbarRight={
          selectedKeys.size > 0 ? (
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={deleting}
                    className="h-8 gap-1.5 text-danger-600 border-danger-200 hover:bg-danger-50 hover:border-danger-300"
                  />
                }
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete {selectedKeys.size} selected
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Delete {selectedKeys.size} medicine
                    {selectedKeys.size !== 1 ? "s" : ""}?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently remove the selected medicines from
                    your stock. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-danger-600 hover:bg-danger-700"
                    onClick={bulkDelete}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <span className="text-xs text-gray-400">{total} records</span>
          )
        }
        downloadable
        printable
        fileName="medicines"
      />

      <TablePagination
        page={page}
        total={total}
        limit={limit}
        onPageChange={setPage}
        itemLabel="medicines"
        className="shrink-0 rounded-none border-x-0 border-b-0"
      />

      <MedicineModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSaved={fetchMeds}
      />
      <MedicineModal
        open={!!editingMedicine}
        medicine={editingMedicine}
        onClose={() => setEditingMedicine(null)}
        onSaved={() => {
          fetchMeds();
          setEditingMedicine(null);
        }}
      />
      <BadStockModal
        medicine={badStockMed}
        onClose={() => setBadStockMed(null)}
        onSaved={fetchMeds}
      />
    </div>
  );
}
