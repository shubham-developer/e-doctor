"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useApiQuery } from "@/lib/useApiQuery";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Download, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormDialog } from "@/components/common/FormDialog";
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
import { usePharmacyMasters } from "@/lib/lookups";

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

  const { data: categoriesData } = usePharmacyMasters("category");
  const { data: companiesData } = usePharmacyMasters("company");
  const { data: groupsData } = usePharmacyMasters("group");
  const { data: unitsData } = usePharmacyMasters("unit");
  const categories = categoriesData ?? [];
  const companies = companiesData ?? [];
  const groups = groupsData ?? [];
  const units = unitsData ?? [];

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
      const data = await apiClient[isEdit ? "patch" : "post"](
        "/api/dashboard/pharmacy/medicines",
        {
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
        },
      );
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

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Medicine Details" : "Add Medicine Details"}
      contentClassName="sm:w-[min(92vw,1100px)]"
      footer={
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
      }
    >
      <div className="px-5 py-4 space-y-3">
        <div className="grid grid-cols-4 gap-3">
          <div>
            <Label className="text-xs font-medium text-gray-700 mb-1 whitespace-nowrap">
              Medicine Name <span className="text-danger-500">*</span>
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-700 mb-1 whitespace-nowrap">
              Medicine Category <span className="text-danger-500">*</span>
            </Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v ?? "")}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c._id} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-700 mb-1 whitespace-nowrap">
              Medicine Company
            </Label>
            <Select value={company} onValueChange={(v) => setCompany(v ?? "")}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c._id} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-700 mb-1 whitespace-nowrap">
              Medicine Composition
            </Label>
            <Input
              value={composition}
              onChange={(e) => setComposition(e.target.value)}
              className="h-9"
            />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <div>
            <Label className="text-xs font-medium text-gray-700 mb-1 whitespace-nowrap">
              Medicine Group
            </Label>
            <Select value={group} onValueChange={(v) => setGroup(v ?? "")}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((g) => (
                  <SelectItem key={g._id} value={g.name}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-700 mb-1 whitespace-nowrap">
              Unit <span className="text-danger-500">*</span>
            </Label>
            <Select value={unit} onValueChange={(v) => setUnit(v ?? "")}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {units.map((u) => (
                  <SelectItem key={u._id} value={u.name}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-700 mb-1 whitespace-nowrap">
              Min Level
            </Label>
            <Input
              type="number"
              min="0"
              value={minLevel}
              onChange={(e) =>
                setMinLevel(e.target.value === "" ? "" : Number(e.target.value))
              }
              className="h-9"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-700 mb-1 whitespace-nowrap">
              Re-Order Level
            </Label>
            <Input
              type="number"
              min="0"
              value={reorderLevel}
              onChange={(e) =>
                setReorderLevel(
                  e.target.value === "" ? "" : Number(e.target.value),
                )
              }
              className="h-9"
            />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <div>
            <Label className="text-xs font-medium text-gray-700 mb-1 whitespace-nowrap">
              Tax
            </Label>
            <div className="relative">
              <Input
                type="number"
                min="0"
                value={taxPercent}
                onChange={(e) =>
                  setTaxPercent(
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
                className="h-9 pr-7"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                %
              </span>
            </div>
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-700 mb-1 whitespace-nowrap">
              Box/Packing <span className="text-danger-500">*</span>
            </Label>
            <Input
              value={boxPacking}
              onChange={(e) => setBoxPacking(e.target.value)}
              className="h-9"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-700 mb-1 whitespace-nowrap">
              VAT A/C
            </Label>
            <Input
              value={vatAC}
              onChange={(e) => setVatAC(e.target.value)}
              className="h-9"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-700 mb-1 whitespace-nowrap">
              Rack Number
            </Label>
            <Input
              value={rackNumber}
              onChange={(e) => setRackNumber(e.target.value)}
              className="h-9"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs font-medium text-gray-700 mb-1 whitespace-nowrap">
              Note
            </Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="text-sm resize-none"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-700 mb-1 whitespace-nowrap">
              Medicine Photo ( JPG | JPEG | PNG )
            </Label>
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
    </FormDialog>
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
      const data = await apiClient.post("/api/dashboard/pharmacy/bad-stock", {
        medicineId: medicine!._id,
        batchNo,
        expiryDate,
        outwardDate,
        note,
      });
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

  return (
    <FormDialog
      open={!!medicine}
      onClose={onClose}
      title="Add Bad Stock"
      contentClassName="sm:w-[min(92vw,680px)]"
      footer={
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
      }
    >
      <div className="px-5 py-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-xs font-medium text-gray-700 mb-1">
              Batch No
            </Label>
            <Input
              value={batchNo}
              onChange={(e) => setBatchNo(e.target.value)}
              className="h-9"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-700 mb-1">
              Expiry Date
            </Label>
            <Input
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="h-9"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-700 mb-1">
              Outward Date <span className="text-danger-500">*</span>
            </Label>
            <Input
              type="date"
              value={outwardDate}
              onChange={(e) => setOutwardDate(e.target.value)}
              className="h-9"
            />
          </div>
        </div>
        <div>
          <Label className="text-xs font-medium text-gray-700 mb-1">Note</Label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="text-sm resize-none"
          />
        </div>
      </div>
    </FormDialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

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
      skeletonWidth: "w-24",
      render: (m) => (
        <div className="flex items-center gap-1.5">
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
