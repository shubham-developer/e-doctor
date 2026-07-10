"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useApiQuery } from "@/lib/useApiQuery";
import { apiClient } from "@/lib/apiClient";
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
import { FormDialog } from "@/components/common/FormDialog";
import { Plus, Trash2, Pencil } from "lucide-react";
import type { BedGroupRecord, RefItem } from "./types";

export function BedGroupSection() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  // dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BedGroupRecord | null>(null);
  const [formName, setFormName] = useState("");
  const [formFloor, setFormFloor] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [search]);

  const groupParams = new URLSearchParams();
  if (debouncedSearch) groupParams.set("search", debouncedSearch);
  const {
    data: groupsData,
    isPending: loading,
    refetch: load,
  } = useApiQuery<{ items: BedGroupRecord[] }>(
    ["bed-groups", debouncedSearch],
    `/api/dashboard/bed-groups?${groupParams}`,
    { keepPrevious: true },
  );
  const items = groupsData?.items ?? [];
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));

  const { data: floorsData } = useApiQuery<{ items: RefItem[] }>(
    ["ref-list", "/api/dashboard/floors"],
    "/api/dashboard/floors",
  );
  const floors = floorsData?.items ?? [];

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
      const data = editTarget
        ? await apiClient.patch(`/api/dashboard/bed-groups/${editTarget._id}`, body)
        : await apiClient.post("/api/dashboard/bed-groups", body);
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
    const data = await apiClient.delete(`/api/dashboard/bed-groups/${id}`);
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
                Click &quot;+ Add Bed Group&quot; to create one
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
      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editTarget ? "Edit Bed Group" : "Add Bed Group"}
        contentClassName="sm:w-[min(92vw,480px)]"
        footer={
          <>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-primary-600 hover:bg-primary-700"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving…" : editTarget ? "Update" : "Add Bed Group"}
            </Button>
          </>
        }
      >
        <div className="px-5 py-4 space-y-4">
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
              autoFocus
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
        </div>
      </FormDialog>
    </>
  );
}
