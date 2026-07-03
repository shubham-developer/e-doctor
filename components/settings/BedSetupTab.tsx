"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Trash2, Pencil, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { SettingsTabs } from "@/components/settings/SettingsTabs";

// ── Types ─────────────────────────────────────────────────────────────────────

type SubSection = "bed-status" | "bed" | "bed-type" | "bed-group" | "floor";

interface BedRecord {
  _id: string;
  name: string;
  bedType: string;
  bedGroup: string;
  floor: string;
  status: "available" | "allotted";
}

interface BedGroupRecord {
  _id: string;
  name: string;
  floor?: string;
  description?: string;
}

interface RefItem {
  _id: string;
  name: string;
}

// ── Simple reference list (BedType, Floor) ────────────────────────────────────

function RefList({ title, apiPath }: { title: string; apiPath: string }) {
  const [items, setItems] = useState<RefItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(apiPath);
    const data = await res.json();
    if (data.success) setItems(data.data.items ?? []);
    setLoading(false);
  }, [apiPath]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAdd() {
    if (!newName.trim()) return;
    setAdding(true);
    const res = await fetch(apiPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    const data = await res.json();
    if (data.success) {
      toast.success(`${title} added`);
      setNewName("");
      load();
    } else toast.error(data.error);
    setAdding(false);
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"?`)) return;
    const res = await fetch(`${apiPath}/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      toast.success("Deleted");
      load();
    } else toast.error(data.error);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-4 border-b border-gray-100 shrink-0">
        <Input
          className="h-9 text-sm flex-1"
          placeholder={`Add ${title}…`}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <Button
          size="sm"
          className="h-9 bg-primary-600 hover:bg-primary-700 gap-1.5 shrink-0"
          onClick={handleAdd}
          disabled={adding || !newName.trim()}
        >
          <Plus className="w-3.5 h-3.5" /> Add
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-xs text-gray-400">
            Loading…
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <p className="text-xs">No {title.toLowerCase()}s configured yet</p>
            <p className="text-xs mt-1">Add one above to get started</p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">
                  Name
                </th>
                <th className="w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((item) => (
                <tr key={item._id} className="hover:bg-gray-50 group">
                  <td className="px-4 py-2.5 text-xs text-gray-800">
                    {item.name}
                  </td>
                  <td className="px-2 py-2.5 text-right">
                    <button
                      onClick={() => handleDelete(item._id, item.name)}
                      className="p-1.5 rounded hover:bg-danger-50 text-gray-300 hover:text-danger-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Bed Group section ─────────────────────────────────────────────────────────

function BedGroupSection() {
  const [items, setItems] = useState<BedGroupRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [floors, setFloors] = useState<RefItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const PAGE_SIZE = 25;

  // dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BedGroupRecord | null>(null);
  const [formName, setFormName] = useState("");
  const [formFloor, setFormFloor] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    const res = await fetch(`/api/dashboard/bed-groups?${params}`);
    const data = await res.json();
    if (data.success) {
      const all = data.data.items ?? [];
      setItems(all);
      setTotalPages(Math.max(1, Math.ceil(all.length / PAGE_SIZE)));
      setPage(1);
    }
    setLoading(false);
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetch("/api/dashboard/floors")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setFloors(d.data.items ?? []);
      });
  }, []);

  useEffect(() => {
    const id = setTimeout(() => load(), 300);
    return () => clearTimeout(id);
  }, [search]);

  function openAdd() {
    setEditTarget(null);
    setFormName("");
    setFormFloor("");
    setFormDesc("");
    setDialogOpen(true);
  }

  function openEdit(item: BedGroupRecord) {
    setEditTarget(item);
    setFormName(item.name);
    setFormFloor(item.floor ?? "");
    setFormDesc(item.description ?? "");
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!formName.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: formName.trim(),
        floor: formFloor.trim() || undefined,
        description: formDesc.trim() || undefined,
      };
      const res = editTarget
        ? await fetch(`/api/dashboard/bed-groups/${editTarget._id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch("/api/dashboard/bed-groups", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
      const data = await res.json();
      if (data.success) {
        toast.success(editTarget ? "Bed Group updated" : "Bed Group added");
        setDialogOpen(false);
        load();
      } else {
        toast.error(data.error);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"?`)) return;
    const res = await fetch(`/api/dashboard/bed-groups/${id}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (data.success) {
      toast.success("Deleted");
      load();
    } else toast.error(data.error);
  }

  const from = items.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, items.length);
  const pageItems = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const columns: ColumnDef<BedGroupRecord>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      sortValue: (b) => b.name,
      skeletonWidth: "w-28",
      render: (b) => (
        <span className="text-xs font-medium text-primary-600">{b.name}</span>
      ),
    },
    {
      key: "floor",
      header: "Floor",
      sortable: true,
      sortValue: (b) => b.floor ?? "",
      width: "w-32",
      skeletonWidth: "w-20",
      render: (b) => (
        <span className="text-xs text-gray-600">{b.floor || "—"}</span>
      ),
    },
    {
      key: "description",
      header: "Description",
      skeletonWidth: "w-64",
      render: (b) => (
        <span className="text-xs text-gray-500 line-clamp-2">
          {b.description || ""}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Action",
      align: "right",
      width: "w-20",
      skeletonWidth: "w-12",
      render: (b) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openEdit(b);
            }}
            className="p-1.5 rounded hover:bg-primary-50 text-gray-400 hover:text-primary-600 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(b._id, b.name);
            }}
            className="p-1.5 rounded hover:bg-danger-50 text-gray-400 hover:text-danger-500 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Table toolbar header with Add button */}
        <DataTable<BedGroupRecord>
          columns={columns}
          data={pageItems}
          rowKey={(b) => b._id}
          loading={loading}
          skeletonRows={5}
          emptyNode={
            <div className="flex flex-col items-center gap-2 py-8">
              <p className="text-xs text-gray-400">
                No bed groups configured yet
              </p>
              <p className="text-xs text-gray-400">
                Click "+ Add Bed Group" to create one
              </p>
            </div>
          }
          wrapperClassName="flex-1 overflow-auto"
          searchValue={search}
          onSearchChange={(v) => setSearch(v)}
          toolbarRight={
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 bg-primary-600 hover:bg-primary-700"
              onClick={openAdd}
            >
              <Plus className="w-3.5 h-3.5" /> Add Bed Group
            </Button>
          }
          downloadable
          printable
          fileName="bed-groups"
        />

        {/* Pagination footer */}
        <div className="flex items-center justify-between px-3 py-1.5 border-t border-gray-200 shrink-0 bg-gray-50 text-xs text-gray-500">
          <span>
            Records: {from} to {to} of {items.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              className="p-0.5 rounded hover:bg-gray-200 disabled:opacity-30"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              ‹
            </button>
            <span className="px-1.5 font-medium">{page}</span>
            <button
              className="p-0.5 rounded hover:bg-gray-200 disabled:opacity-30"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {/* Add / Edit dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => !o && setDialogOpen(false)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? "Edit Bed Group" : "Add Bed Group"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label>
                Name <span className="text-danger-500">*</span>
              </Label>
              <Input
                className="h-9"
                placeholder="e.g. VIP Ward"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Floor</Label>
              <Select
                value={formFloor}
                onValueChange={(v) => setFormFloor(v ?? "")}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select floor" />
                </SelectTrigger>
                <SelectContent>
                  {floors.length === 0 ? (
                    <SelectItem value="__none__" disabled>
                      No floors — add in Floor section
                    </SelectItem>
                  ) : (
                    floors.map((f) => (
                      <SelectItem key={f._id} value={f.name}>
                        {f.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                rows={4}
                className="text-sm resize-none"
                placeholder="Brief description of this ward…"
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
              />
            </div>
            <div className="flex gap-3 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-primary-600 hover:bg-primary-700"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving…" : editTarget ? "Update" : "Add Bed Group"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Bed management table ──────────────────────────────────────────────────────

function BedTable({ readOnly = false }: { readOnly?: boolean }) {
  const [beds, setBeds] = useState<BedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [bedTypes, setBedTypes] = useState<RefItem[]>([]);
  const [bedGroups, setBedGroups] = useState<RefItem[]>([]);

  // dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BedRecord | null>(null);
  const [formName, setFormName] = useState("");
  const [formBedType, setFormBedType] = useState("");
  const [formBedGroup, setFormBedGroup] = useState("");
  const [formUnavailable, setFormUnavailable] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadBeds = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    const res = await fetch(`/api/dashboard/beds?${params}`);
    const data = await res.json();
    if (data.success) setBeds(data.data.beds ?? []);
    setLoading(false);
  }, [search]);

  useEffect(() => {
    loadBeds();
  }, [loadBeds]);

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard/bed-types").then((r) => r.json()),
      fetch("/api/dashboard/bed-groups").then((r) => r.json()),
    ]).then(([bt, bg]) => {
      if (bt.success) setBedTypes(bt.data.items ?? []);
      if (bg.success) setBedGroups(bg.data.items ?? []);
    });
  }, []);

  useEffect(() => {
    const id = setTimeout(() => loadBeds(), 300);
    return () => clearTimeout(id);
  }, [search]);

  function openAdd() {
    setEditTarget(null);
    setFormName("");
    setFormBedType("");
    setFormBedGroup("");
    setFormUnavailable(false);
    setDialogOpen(true);
  }

  function openEdit(bed: BedRecord) {
    setEditTarget(bed);
    setFormName(bed.name);
    setFormBedType(bed.bedType ?? "");
    setFormBedGroup(bed.bedGroup ?? "");
    setFormUnavailable(bed.status === "allotted");
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!formName.trim()) {
      toast.error("Bed name is required");
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: formName.trim(),
        bedType: formBedType || undefined,
        bedGroup: formBedGroup || undefined,
        status: formUnavailable ? "allotted" : "available",
      };
      const res = editTarget
        ? await fetch(`/api/dashboard/beds/${editTarget._id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch("/api/dashboard/beds", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
      const data = await res.json();
      if (data.success) {
        toast.success(editTarget ? "Bed updated" : "Bed added");
        setDialogOpen(false);
        loadBeds();
      } else toast.error(data.error);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete bed "${name}"?`)) return;
    const res = await fetch(`/api/dashboard/beds/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      toast.success("Bed deleted");
      loadBeds();
    } else toast.error(data.error);
  }

  const columns: ColumnDef<BedRecord>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      sortValue: (b) => b.name,
      skeletonWidth: "w-20",
      render: (b) => (
        <span className="text-xs font-medium text-primary-600">{b.name}</span>
      ),
    },
    {
      key: "bedType",
      header: "Bed Type",
      sortable: true,
      sortValue: (b) => b.bedType,
      skeletonWidth: "w-20",
      render: (b) => (
        <span className="text-xs text-gray-600">{b.bedType || "—"}</span>
      ),
    },
    {
      key: "bedGroup",
      header: "Bed Group",
      sortable: true,
      sortValue: (b) => b.bedGroup,
      skeletonWidth: "w-28",
      render: (b) => (
        <span className="text-xs text-gray-600">{b.bedGroup || "—"}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (b) => b.status,
      skeletonWidth: "w-20",
      render: (b) => (
        <span
          className={cn(
            "text-xs font-medium",
            b.status === "available" ? "text-success-700" : "text-danger-600",
          )}
        >
          {b.status === "available" ? "Available" : "Not Available"}
        </span>
      ),
    },
    ...(!readOnly
      ? [
          {
            key: "actions",
            header: "Action",
            align: "center" as const,
            width: "w-20",
            skeletonWidth: "w-12",
            render: (b: BedRecord) => (
              <div className="flex items-center justify-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openEdit(b);
                  }}
                  className="p-1.5 rounded hover:bg-primary-50 text-gray-400 hover:text-primary-600 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(b._id, b.name);
                  }}
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
      <DataTable<BedRecord>
        columns={columns}
        data={beds}
        rowKey={(b) => b._id}
        loading={loading}
        skeletonRows={5}
        rowClassName={(b) =>
          b.status === "available"
            ? "bg-success-50/60 hover:bg-success-50"
            : "bg-danger-50/50 hover:bg-danger-50"
        }
        emptyNode={
          <div className="flex flex-col items-center gap-2 py-8">
            <p className="text-xs text-gray-400">No beds found</p>
            {!readOnly && (
              <p className="text-xs text-gray-400">
                Click "+ Add Bed" to create one
              </p>
            )}
          </div>
        }
        wrapperClassName="flex-1 overflow-auto"
        searchValue={search}
        onSearchChange={(v) => setSearch(v)}
        {...(!readOnly && {
          toolbarRight: (
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 bg-primary-600 hover:bg-primary-700"
              onClick={openAdd}
            >
              <Plus className="w-3.5 h-3.5" /> Add Bed
            </Button>
          ),
        })}
        downloadable
        printable
        fileName={readOnly ? "bed-status" : "beds"}
      />

      {!readOnly && (
        <Dialog
          open={dialogOpen}
          onOpenChange={(o) => !o && setDialogOpen(false)}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editTarget ? "Edit Bed" : "Add Bed"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <Label>
                  Name <span className="text-danger-500">*</span>
                </Label>
                <Input
                  className="h-10"
                  placeholder="e.g. Bed 101"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                />
              </div>
              <div className="space-y-1.5">
                <Label>
                  Bed Type <span className="text-danger-500">*</span>
                </Label>
                <Select
                  value={formBedType}
                  onValueChange={(v) => setFormBedType(v ?? "")}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {bedTypes.length === 0 ? (
                      <SelectItem value="__none__" disabled>
                        No bed types — add in Bed Type section
                      </SelectItem>
                    ) : (
                      bedTypes.map((t) => (
                        <SelectItem key={t._id} value={t.name}>
                          {t.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>
                  Bed Group <span className="text-danger-500">*</span>
                </Label>
                <Select
                  value={formBedGroup}
                  onValueChange={(v) => setFormBedGroup(v ?? "")}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {bedGroups.length === 0 ? (
                      <SelectItem value="__none__" disabled>
                        No bed groups — add in Bed Group section
                      </SelectItem>
                    ) : (
                      bedGroups.map((g) => (
                        <SelectItem key={g._id} value={g.name}>
                          {g.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-gray-300 accent-primary-600"
                  checked={formUnavailable}
                  onChange={(e) => setFormUnavailable(e.target.checked)}
                />
                <span className="text-sm font-medium text-gray-700">
                  Not available for use
                </span>
              </label>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-primary-600 hover:bg-primary-700 gap-2"
                onClick={handleSave}
                disabled={saving}
              >
                <Check className="w-4 h-4" />
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const SECTIONS: { key: SubSection; label: string }[] = [
  { key: "bed-status", label: "Bed Status" },
  { key: "bed", label: "Bed" },
  { key: "bed-type", label: "Bed Type" },
  { key: "bed-group", label: "Bed Group" },
  { key: "floor", label: "Floor" },
];

export function BedSetupTab() {
  const [active, setActive] = useState<SubSection>("bed-status");

  return (
    <div className="flex flex-col h-[calc(100vh-220px)] min-h-96 border border-gray-200 rounded-lg overflow-hidden bg-white">
      <SettingsTabs tabs={SECTIONS} active={active} onChange={setActive} />

      <div className="flex-1 overflow-hidden">
        {active === "bed-status" && <BedTable readOnly />}
        {active === "bed" && <BedTable />}
        {active === "bed-type" && (
          <RefList title="Bed Type" apiPath="/api/dashboard/bed-types" />
        )}
        {active === "bed-group" && <BedGroupSection />}
        {active === "floor" && (
          <RefList title="Floor" apiPath="/api/dashboard/floors" />
        )}
      </div>
    </div>
  );
}
