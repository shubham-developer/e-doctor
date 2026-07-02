"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Trash2, Plus, X, Check } from "lucide-react";

type MasterType =
  | "category"
  | "supplier"
  | "dosage"
  | "dose_interval"
  | "dose_duration"
  | "unit"
  | "company"
  | "group";

interface MasterItem {
  _id: string;
  name: string;
}
interface Dosage {
  _id: string;
  category: string;
  dosage: string;
  unit: string;
}
interface Supplier {
  _id: string;
  name: string;
  contact: string;
  contactPersonName: string;
  contactPersonPhone: string;
  drugLicenseNumber: string;
  address: string;
}

const SECTIONS: { type: MasterType; label: string }[] = [
  { type: "category", label: "Medicine Category" },
  { type: "supplier", label: "Supplier" },
  { type: "dosage", label: "Medicine Dosage" },
  { type: "dose_interval", label: "Dose Interval" },
  { type: "dose_duration", label: "Dose Duration" },
  { type: "unit", label: "Unit" },
  { type: "company", label: "Company" },
  { type: "group", label: "Medicine Group" },
];

const EMPTY_SUPPLIER: Omit<Supplier, "_id"> = {
  name: "",
  contact: "",
  contactPersonName: "",
  contactPersonPhone: "",
  drugLicenseNumber: "",
  address: "",
};
const EMPTY_DOSAGE: Omit<Dosage, "_id"> = {
  category: "",
  dosage: "",
  unit: "",
};

/* ────────────────────────────────────────────────────────── */
/* Dosage section                                            */
/* ────────────────────────────────────────────────────────── */
function DosageSection() {
  const [items, setItems] = useState<Dosage[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [units, setUnits] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Omit<Dosage, "_id">>(EMPTY_DOSAGE);
  const [editId, setEditId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [dosageRes, catRes, unitRes] = await Promise.all([
      fetch("/api/dashboard/pharmacy/dosages"),
      fetch("/api/dashboard/pharmacy/masters?type=category"),
      fetch("/api/dashboard/pharmacy/masters?type=unit"),
    ]);
    const [dosageData, catData, unitData] = await Promise.all([
      dosageRes.json(),
      catRes.json(),
      unitRes.json(),
    ]);
    if (dosageData.success) setItems(dosageData.data);
    if (catData.success)
      setCategories(catData.data.map((c: { name: string }) => c.name));
    if (unitData.success)
      setUnits(unitData.data.map((u: { name: string }) => u.name));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openAdd() {
    setEditId(null);
    setForm(EMPTY_DOSAGE);
    setDialogOpen(true);
  }
  function openEdit(d: Dosage) {
    setEditId(d._id);
    setForm({ category: d.category, dosage: d.dosage, unit: d.unit });
    setDialogOpen(true);
  }

  async function save() {
    if (!form.category.trim()) {
      toast.error("Category is required");
      return;
    }
    if (!form.dosage.trim()) {
      toast.error("Dosage is required");
      return;
    }
    setSaving(true);
    const url = editId
      ? `/api/dashboard/pharmacy/dosages/${editId}`
      : "/api/dashboard/pharmacy/dosages";
    const method = editId ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (data.success) {
      toast.success(editId ? "Updated" : "Added");
      setDialogOpen(false);
      load();
    } else toast.error(data.error);
    setSaving(false);
  }

  async function del(id: string) {
    const res = await fetch(`/api/dashboard/pharmacy/dosages/${id}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (data.success) {
      toast.success("Deleted");
      load();
    } else toast.error(data.error);
  }

  const columns: ColumnDef<Dosage>[] = [
    {
      key: "category",
      header: "Category Name",
      accessor: "category",
      sortable: true,
    },
    {
      key: "dosage",
      header: "Dosage",
      accessor: "dosage",
      sortable: true,
      width: "160px",
    },
    {
      key: "unit",
      header: "Unit",
      accessor: "unit",
      sortable: true,
      width: "160px",
    },
    {
      key: "actions",
      header: "",
      align: "right",
      width: "80px",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openEdit(row);
            }}
            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                />
              }
            >
              <Trash2 className="w-3.5 h-3.5" />
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this dosage?</AlertDialogTitle>
                <AlertDialogDescription>
                  This dosage entry will be permanently removed.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => del(row._id)}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ),
    },
  ];

  const filtered = items.filter(
    (i) =>
      !search ||
      i.category.toLowerCase().includes(search.toLowerCase()) ||
      i.unit.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <>
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-800">Medicine Dosage List</h2>
        <Button
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 gap-1.5 h-8 text-xs"
          onClick={openAdd}
        >
          <Plus className="w-3.5 h-3.5" /> Add Medicine Dosage
        </Button>
      </div>

      <div className="p-4 flex-1">
        <DataTable<Dosage>
          columns={columns}
          data={filtered}
          rowKey={(r) => r._id}
          loading={loading}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search dosage..."
          downloadable
          printable
          fileName="Medicine Dosage"
          emptyText="No dosage entries added yet"
          stickyHeader={false}
        />
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editId ? "Edit Dosage" : "Add Medicine Dosage"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>
                Category Name <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.category}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, category: v ?? "" }))
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.length === 0 ? (
                    <SelectItem value="__none" disabled>
                      No categories — add them first
                    </SelectItem>
                  ) : (
                    categories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>
                Dosage <span className="text-red-500">*</span>
              </Label>
              <Input
                value={form.dosage}
                onChange={(e) =>
                  setForm((f) => ({ ...f, dosage: e.target.value }))
                }
                placeholder="e.g. 1, 1/2, 0.5"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Unit</Label>
              <Select
                value={form.unit}
                onValueChange={(v) => setForm((f) => ({ ...f, unit: v ?? "" }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {units.length === 0 ? (
                    <SelectItem value="__none" disabled>
                      No units — add them first
                    </SelectItem>
                  ) : (
                    units.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={save}
              disabled={saving}
            >
              {saving ? "Saving..." : editId ? "Save Changes" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ────────────────────────────────────────────────────────── */
/* Supplier section                                          */
/* ────────────────────────────────────────────────────────── */
function SupplierSection() {
  const [items, setItems] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Omit<Supplier, "_id">>(EMPTY_SUPPLIER);
  const [editId, setEditId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/dashboard/pharmacy/suppliers");
    const data = await res.json();
    if (data.success) setItems(data.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openAdd() {
    setEditId(null);
    setForm(EMPTY_SUPPLIER);
    setDialogOpen(true);
  }
  function openEdit(s: Supplier) {
    setEditId(s._id);
    setForm({
      name: s.name,
      contact: s.contact,
      contactPersonName: s.contactPersonName,
      contactPersonPhone: s.contactPersonPhone,
      drugLicenseNumber: s.drugLicenseNumber,
      address: s.address,
    });
    setDialogOpen(true);
  }

  async function save() {
    if (!form.name.trim()) {
      toast.error("Supplier name is required");
      return;
    }
    setSaving(true);
    const url = editId
      ? `/api/dashboard/pharmacy/suppliers/${editId}`
      : "/api/dashboard/pharmacy/suppliers";
    const method = editId ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (data.success) {
      toast.success(editId ? "Supplier updated" : "Supplier added");
      setDialogOpen(false);
      load();
    } else toast.error(data.error);
    setSaving(false);
  }

  async function del(id: string) {
    const res = await fetch(`/api/dashboard/pharmacy/suppliers/${id}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (data.success) {
      toast.success("Deleted");
      load();
    } else toast.error(data.error);
  }

  const columns: ColumnDef<Supplier>[] = [
    { key: "name", header: "Supplier Name", accessor: "name", sortable: true },
    {
      key: "contact",
      header: "Supplier Contact",
      accessor: "contact",
      sortable: false,
    },
    {
      key: "contactPersonName",
      header: "Contact Person Name",
      accessor: "contactPersonName",
      sortable: true,
    },
    {
      key: "contactPersonPhone",
      header: "Contact Person Phone",
      accessor: "contactPersonPhone",
      sortable: false,
    },
    {
      key: "drugLicenseNumber",
      header: "Drug License No.",
      accessor: "drugLicenseNumber",
      sortable: false,
    },
    { key: "address", header: "Address", accessor: "address", sortable: false },
    {
      key: "actions",
      header: "",
      align: "right",
      width: "80px",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openEdit(row);
            }}
            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                />
              }
            >
              <Trash2 className="w-3.5 h-3.5" />
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Delete &quot;{row.name}&quot;?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This supplier will be permanently removed.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => del(row._id)}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ),
    },
  ];

  const filtered = items.filter(
    (i) =>
      !search ||
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.contactPersonName.toLowerCase().includes(search.toLowerCase()) ||
      i.drugLicenseNumber.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <>
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-800">Supplier List</h2>
        <Button
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 gap-1.5 h-8 text-xs"
          onClick={openAdd}
        >
          <Plus className="w-3.5 h-3.5" /> Add Supplier
        </Button>
      </div>

      <div className="p-4 flex-1">
        <DataTable<Supplier>
          columns={columns}
          data={filtered}
          rowKey={(r) => r._id}
          loading={loading}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search suppliers..."
          downloadable
          printable
          fileName="Suppliers"
          emptyText="No suppliers added yet"
          stickyHeader={false}
        />
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editId ? "Edit Supplier" : "Add Supplier"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-1.5">
              <Label>
                Supplier Name <span className="text-red-500">*</span>
              </Label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Supplier name"
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Supplier Contact</Label>
              <Input
                value={form.contact}
                onChange={(e) =>
                  setForm((f) => ({ ...f, contact: e.target.value }))
                }
                placeholder="Phone number"
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Drug License Number</Label>
              <Input
                value={form.drugLicenseNumber}
                onChange={(e) =>
                  setForm((f) => ({ ...f, drugLicenseNumber: e.target.value }))
                }
                placeholder="License number"
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Contact Person Name</Label>
              <Input
                value={form.contactPersonName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, contactPersonName: e.target.value }))
                }
                placeholder="Full name"
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Contact Person Phone</Label>
              <Input
                value={form.contactPersonPhone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, contactPersonPhone: e.target.value }))
                }
                placeholder="Phone number"
                className="h-10"
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Address</Label>
              <Input
                value={form.address}
                onChange={(e) =>
                  setForm((f) => ({ ...f, address: e.target.value }))
                }
                placeholder="Street, City"
                className="h-10"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={save}
              disabled={saving}
            >
              {saving ? "Saving..." : editId ? "Save Changes" : "Add Supplier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ────────────────────────────────────────────────────────── */
/* Simple master section                                     */
/* ────────────────────────────────────────────────────────── */
function SimpleMasterSection({
  type,
  label,
}: {
  type: MasterType;
  label: string;
}) {
  const [items, setItems] = useState<MasterItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/dashboard/pharmacy/masters?type=${type}`);
    const data = await res.json();
    if (data.success) setItems(data.data);
    setLoading(false);
  }, [type]);

  useEffect(() => {
    load();
  }, [load]);

  async function addItem() {
    if (!newName.trim()) {
      toast.error("Name is required");
      return;
    }
    setAdding(true);
    const res = await fetch("/api/dashboard/pharmacy/masters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, name: newName.trim() }),
    });
    const data = await res.json();
    if (data.success) {
      toast.success("Added");
      setNewName("");
      load();
    } else toast.error(data.error);
    setAdding(false);
  }

  async function saveEdit(id: string) {
    if (!editingName.trim()) {
      toast.error("Name is required");
      return;
    }
    const res = await fetch(`/api/dashboard/pharmacy/masters/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editingName.trim() }),
    });
    const data = await res.json();
    if (data.success) {
      toast.success("Updated");
      setEditingId(null);
      load();
    } else toast.error(data.error);
  }

  async function deleteItem(id: string) {
    const res = await fetch(`/api/dashboard/pharmacy/masters/${id}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (data.success) {
      toast.success("Deleted");
      load();
    } else toast.error(data.error);
  }

  const columns: ColumnDef<MasterItem>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      render: (row) =>
        editingId === row._id ? (
          <Input
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveEdit(row._id);
              if (e.key === "Escape") setEditingId(null);
            }}
            className="h-7 text-sm w-64"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="text-sm text-gray-800">{row.name}</span>
        ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      width: "80px",
      render: (row) =>
        editingId === row._id ? (
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={() => saveEdit(row._id)}
              className="p-1.5 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setEditingId(null)}
              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditingId(row._id);
                setEditingName(row.name);
              }}
              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                  />
                }
              >
                <Trash2 className="w-3.5 h-3.5" />
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Delete &quot;{row.name}&quot;?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove the {label.toLowerCase()} permanently.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-600 hover:bg-red-700"
                    onClick={() => deleteItem(row._id)}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ),
    },
  ];

  const filtered = items.filter(
    (i) => !search || i.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <>
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-800">{label} List</h2>
      </div>

      {/* Add row */}
      <div className="px-5 py-3 border-b border-gray-100 flex gap-2">
        <Input
          id={`pharma-add-${type}`}
          placeholder={`New ${label} name`}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addItem()}
          className="h-9 text-sm max-w-xs"
        />
        <Button
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 h-9 px-3 text-xs gap-1"
          onClick={addItem}
          disabled={adding}
        >
          <Plus className="w-3.5 h-3.5" /> Add
        </Button>
      </div>

      <div className="p-4 flex-1">
        <DataTable<MasterItem>
          columns={columns}
          data={filtered}
          rowKey={(r) => r._id}
          loading={loading}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder={`Search ${label.toLowerCase()}...`}
          downloadable
          printable
          fileName={label}
          emptyText={`No ${label.toLowerCase()} added yet`}
          stickyHeader={false}
        />
      </div>
    </>
  );
}

/* ────────────────────────────────────────────────────────── */
/* Main page                                                 */
/* ────────────────────────────────────────────────────────── */
export default function PharmacySettingsPage() {
  const [activeType, setActiveType] = useState<MasterType>("category");

  return (
    <div>
      <div className="flex gap-0 border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm min-h-130">
        {/* Left sidebar */}
        <div className="w-52 shrink-0 border-r border-gray-100 bg-gray-50/60">
          {SECTIONS.map((s) => (
            <button
              key={s.type}
              onClick={() => setActiveType(s.type)}
              className={`w-full text-left px-4 py-3 text-sm border-b border-gray-100 last:border-0 transition-colors ${
                activeType === s.type
                  ? "bg-blue-50 text-blue-700 font-semibold border-r-2 border-r-blue-600"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          {activeType === "supplier" ? (
            <SupplierSection />
          ) : activeType === "dosage" ? (
            <DosageSection />
          ) : (
            <SimpleMasterSection
              key={activeType}
              type={activeType}
              label={SECTIONS.find((s) => s.type === activeType)!.label}
            />
          )}
        </div>
      </div>
    </div>
  );
}
