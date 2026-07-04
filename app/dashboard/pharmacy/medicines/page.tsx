"use client";

import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Download, X, Trash2, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface Medicine {
  _id: string;
  name: string;
  category?: string;
  company?: string;
  composition?: string;
  group?: string;
  unit?: string;
  minLevel?: number;
  reorderLevel: number;
  taxPercent: number;
  boxPacking?: string;
  vatAC?: string;
  rackNumber?: string;
  note?: string;
  availableQty: number;
  salePrice: number;
  batchNo?: string;
  expiryDate?: string;
}

// ─── Add / Edit Medicine Modal ────────────────────────────────────────────────

function MedicineModal({
  open,
  medicine,
  onClose,
  onSaved,
}: {
  open: boolean;
  medicine?: Medicine | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!medicine;

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [company, setCompany] = useState("");
  const [composition, setComposition] = useState("");
  const [group, setGroup] = useState("");
  const [unit, setUnit] = useState("");
  const [minLevel, setMinLevel] = useState<number | "">("");
  const [reorderLevel, setReorderLevel] = useState<number | "">("");
  const [taxPercent, setTaxPercent] = useState<number | "">("");
  const [boxPacking, setBoxPacking] = useState("");
  const [vatAC, setVatAC] = useState("");
  const [rackNumber, setRackNumber] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const [categories, setCategories] = useState<string[]>([]);
  const [companies, setCompanies] = useState<string[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [units, setUnits] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    const fetchMaster = async (type: string) => {
      const res = await fetch(`/api/dashboard/pharmacy/masters?type=${type}`);
      const data = await res.json();
      return data.success ? data.data.map((i: { name: string }) => i.name) : [];
    };
    Promise.all([
      fetchMaster("category"),
      fetchMaster("company"),
      fetchMaster("group"),
      fetchMaster("unit"),
    ]).then(([cats, comps, grps, units]) => {
      setCategories(cats);
      setCompanies(comps);
      setGroups(grps);
      setUnits(units);
    });
  }, [open]);

  useEffect(() => {
    if (medicine) {
      setName(medicine.name);
      setCategory(medicine.category ?? "");
      setCompany(medicine.company ?? "");
      setComposition(medicine.composition ?? "");
      setGroup(medicine.group ?? "");
      setUnit(medicine.unit ?? "");
      setMinLevel(medicine.minLevel ?? "");
      setReorderLevel(medicine.reorderLevel ?? "");
      setTaxPercent(medicine.taxPercent ?? "");
      setBoxPacking(medicine.boxPacking ?? "");
      setVatAC(medicine.vatAC ?? "");
      setRackNumber(medicine.rackNumber ?? "");
      setNote(medicine.note ?? "");
    } else {
      setName("");
      setCategory("");
      setCompany("");
      setComposition("");
      setGroup("");
      setUnit("");
      setMinLevel("");
      setReorderLevel("");
      setTaxPercent("");
      setBoxPacking("");
      setVatAC("");
      setRackNumber("");
      setNote("");
    }
  }, [medicine, open]);

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Medicine name is required");
      return;
    }
    if (!category.trim()) {
      toast.error("Medicine category is required");
      return;
    }
    if (!unit.trim()) {
      toast.error("Unit is required");
      return;
    }
    if (!boxPacking.trim()) {
      toast.error("Box/Packing is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/dashboard/pharmacy/medicines", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isEdit && { id: medicine!._id }),
          name: name.trim(),
          category,
          company,
          composition: composition.trim(),
          group,
          unit,
          minLevel: Number(minLevel) || 0,
          reorderLevel: Number(reorderLevel) || 0,
          taxPercent: Number(taxPercent) || 0,
          boxPacking: boxPacking.trim(),
          vatAC: vatAC.trim(),
          rackNumber: rackNumber.trim(),
          note: note.trim(),
        }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error);
        throw new Error(data.error);
      }
      queryClient.invalidateQueries({ queryKey: ["medicines"] });
      toast.success(isEdit ? "Medicine updated" : "Medicine added");
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const inp =
    "h-9 text-sm border border-gray-300 rounded px-2.5 w-full focus:outline-none focus:border-primary-400";
  const sel =
    "h-9 text-sm border border-gray-300 rounded px-2.5 w-full focus:outline-none focus:border-primary-400 bg-white";
  const lbl = "block text-xs font-medium text-gray-700 mb-1 whitespace-nowrap";

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-none sm:w-[min(92vw,1100px)] p-0 overflow-hidden gap-0"
      >
        <div className="bg-primary-600 text-white flex items-center justify-between px-5 py-3.5">
          <DialogTitle>
            {isEdit ? "Edit Medicine Details" : "Add Medicine Details"}
          </DialogTitle>
          <button
            type="button"
            onClick={onClose}
            className="text-white hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className={lbl}>
                Medicine Name <span className="text-danger-500">*</span>
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inp}
              />
            </div>
            <div>
              <label className={lbl}>
                Medicine Category <span className="text-danger-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={sel}
              >
                <option value="">Select</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={lbl}>Medicine Company</label>
              <select
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className={sel}
              >
                <option value="">Select</option>
                {companies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={lbl}>Medicine Composition</label>
              <input
                value={composition}
                onChange={(e) => setComposition(e.target.value)}
                className={inp}
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className={lbl}>Medicine Group</label>
              <select
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                className={sel}
              >
                <option value="">Select</option>
                {groups.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={lbl}>
                Unit <span className="text-danger-500">*</span>
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className={sel}
              >
                <option value="">Select</option>
                {units.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={lbl}>Min Level</label>
              <input
                type="number"
                min="0"
                value={minLevel}
                onChange={(e) =>
                  setMinLevel(
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
                className={inp}
              />
            </div>
            <div>
              <label className={lbl}>Re-Order Level</label>
              <input
                type="number"
                min="0"
                value={reorderLevel}
                onChange={(e) =>
                  setReorderLevel(
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
                className={inp}
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className={lbl}>Tax</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={taxPercent}
                  onChange={(e) =>
                    setTaxPercent(
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                  className={inp + " pr-7"}
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                  %
                </span>
              </div>
            </div>
            <div>
              <label className={lbl}>
                Box/Packing <span className="text-danger-500">*</span>
              </label>
              <input
                value={boxPacking}
                onChange={(e) => setBoxPacking(e.target.value)}
                className={inp}
              />
            </div>
            <div>
              <label className={lbl}>VAT A/C</label>
              <input
                value={vatAC}
                onChange={(e) => setVatAC(e.target.value)}
                className={inp}
              />
            </div>
            <div>
              <label className={lbl}>Rack Number</label>
              <input
                value={rackNumber}
                onChange={(e) => setRackNumber(e.target.value)}
                className={inp}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Note</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="border border-gray-300 rounded px-2.5 py-2 text-sm w-full focus:outline-none focus:border-primary-400 resize-none"
              />
            </div>
            <div>
              <label className={lbl}>Medicine Photo ( JPG | JPEG | PNG )</label>
              <div className="border border-gray-300 rounded flex items-center justify-center gap-2 text-gray-400 text-sm cursor-pointer hover:bg-gray-50 h-22">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                  />
                </svg>
                Drop a file here or click
              </div>
            </div>
          </div>
        </div>

        <div className="border-t px-6 py-3 flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-primary-600 hover:bg-primary-700 flex items-center gap-1.5"
          >
            {saving ? (
              "Saving…"
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Save
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Bad Stock Modal ──────────────────────────────────────────────────────────

function BadStockModal({
  medicine,
  onClose,
  onSaved,
}: {
  medicine: Medicine | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [batchNo, setBatchNo] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [outwardDate, setOutwardDate] = useState(
    format(new Date(), "yyyy-MM-dd"),
  );
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (medicine) {
      setBatchNo(medicine.batchNo ?? "");
      setExpiryDate(medicine.expiryDate ?? "");
      setOutwardDate(format(new Date(), "yyyy-MM-dd"));
      setNote("");
    }
  }, [medicine]);

  async function handleSave() {
    if (!outwardDate) {
      toast.error("Outward date is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/dashboard/pharmacy/bad-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicineId: medicine!._id,
          batchNo,
          expiryDate,
          outwardDate,
          note,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error);
        return;
      }
      toast.success("Bad stock recorded");
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const inp =
    "h-9 text-sm border border-gray-300 rounded px-2.5 w-full focus:outline-none focus:border-primary-400";
  const lbl = "block text-xs font-medium text-gray-700 mb-1";

  return (
    <Dialog
      open={!!medicine}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-none sm:w-[min(92vw,680px)] p-0 overflow-hidden gap-0"
      >
        <div className="bg-primary-600 text-white flex items-center justify-between px-5 py-3.5">
          <DialogTitle>Add Bad Stock</DialogTitle>
          <button
            type="button"
            onClick={onClose}
            className="text-white hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={lbl}>Batch No</label>
              <input
                value={batchNo}
                onChange={(e) => setBatchNo(e.target.value)}
                className={inp}
              />
            </div>
            <div>
              <label className={lbl}>Expiry Date</label>
              <input
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className={inp}
              />
            </div>
            <div>
              <label className={lbl}>
                Outward Date <span className="text-danger-500">*</span>
              </label>
              <input
                type="date"
                value={outwardDate}
                onChange={(e) => setOutwardDate(e.target.value)}
                className={inp}
              />
            </div>
          </div>
          <div>
            <label className={lbl}>Note</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="border border-gray-300 rounded px-2.5 py-2 text-sm w-full focus:outline-none focus:border-primary-400 resize-none"
            />
          </div>
        </div>

        <div className="border-t px-5 py-3 flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-primary-600 hover:bg-primary-700 flex items-center gap-1.5"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MedicinesPage() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const queryClient = useQueryClient();
  const [badStockMed, setBadStockMed] = useState<Medicine | null>(null);
  const limit = 100;

  const fetchMeds = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/dashboard/pharmacy/medicines?search=${encodeURIComponent(search)}&page=${page}&limit=${limit}`,
      );
      const data = await res.json();
      if (data.success) {
        setMedicines(data.data.medicines ?? []);
        setTotal(data.data.total ?? 0);
        setTotalPages(data.data.totalPages ?? 1);
      }
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    fetchMeds();
  }, [fetchMeds]);

  async function bulkDelete() {
    setDeleting(true);
    const res = await fetch("/api/dashboard/pharmacy/medicines", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selectedKeys) }),
    });
    const data = await res.json();
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
      skeletonWidth: "w-24",
      render: (m) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditingMedicine(m);
            }}
            className="text-xs text-primary-600 hover:text-primary-800 border border-primary-200 hover:border-primary-400 rounded px-2 py-0.5"
          >
            Edit
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setBadStockMed(m);
            }}
            className="text-xs text-warning-600 hover:text-warning-800 border border-warning-200 hover:border-warning-400 rounded px-2 py-0.5 flex items-center gap-1"
          >
            <AlertTriangle className="w-3 h-3" /> Bad Stock
          </button>
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
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
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

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 p-3 border-t text-sm">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 border rounded disabled:opacity-40"
          >
            Prev
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 border rounded disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

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
