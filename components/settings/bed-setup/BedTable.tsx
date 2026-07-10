"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useApiQuery } from "@/lib/useApiQuery";
import { apiClient } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormDialog } from "@/components/common/FormDialog";
import { Plus, Trash2, Pencil, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BedRecord, RefItem } from "./types";

/** Bed management table — also used read-only for the Bed Status section. */
export function BedTable({ readOnly = false }: { readOnly?: boolean }) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BedRecord | null>(null);
  const [formName, setFormName] = useState("");
  const [formBedType, setFormBedType] = useState("");
  const [formBedGroup, setFormBedGroup] = useState("");
  const [formDailyCharge, setFormDailyCharge] = useState("");
  const [formUnavailable, setFormUnavailable] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  const bedParams = new URLSearchParams();
  if (debouncedSearch) bedParams.set("search", debouncedSearch);
  const {
    data: bedsData,
    isPending: loading,
    refetch: loadBeds,
  } = useApiQuery<{ beds: BedRecord[] }>(
    ["beds", debouncedSearch],
    `/api/dashboard/beds?${bedParams}`,
    { keepPrevious: true },
  );
  const beds = bedsData?.beds ?? [];

  const { data: bedTypesData } = useApiQuery<{ items: RefItem[] }>(
    ["ref-list", "/api/dashboard/bed-types"],
    "/api/dashboard/bed-types",
  );
  const bedTypes = bedTypesData?.items ?? [];
  const { data: bedGroupsData } = useApiQuery<{ items: RefItem[] }>(
    ["bed-groups", ""],
    "/api/dashboard/bed-groups",
  );
  const bedGroups = bedGroupsData?.items ?? [];

  function openAdd() {
    setEditTarget(null);
    setFormName("");
    setFormBedType("");
    setFormBedGroup("");
    setFormDailyCharge("");
    setFormUnavailable(false);
    setDialogOpen(true);
  }

  function openEdit(bed: BedRecord) {
    setEditTarget(bed);
    setFormName(bed.name);
    setFormBedType(bed.bedType ?? "");
    setFormBedGroup(bed.bedGroup ?? "");
    setFormDailyCharge(bed.dailyCharge ? String(bed.dailyCharge) : "");
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
        dailyCharge: Number(formDailyCharge) || 0,
        status: formUnavailable ? "allotted" : "available",
      };
      const data = editTarget
        ? await apiClient.patch(`/api/dashboard/beds/${editTarget._id}`, body)
        : await apiClient.post("/api/dashboard/beds", body);
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
    const data = await apiClient.delete(`/api/dashboard/beds/${id}`);
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
      key: "dailyCharge",
      header: "Daily Charge",
      sortable: true,
      sortValue: (b) => b.dailyCharge ?? 0,
      width: "w-28",
      skeletonWidth: "w-16",
      render: (b) => (
        <span className="text-xs text-gray-600">
          {b.dailyCharge ? `₹${b.dailyCharge}/day` : "—"}
        </span>
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
                Click &quot;+ Add Bed&quot; to create one
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
        <FormDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          title={editTarget ? "Edit Bed" : "Add Bed"}
          contentClassName="sm:w-[min(92vw,480px)]"
          footer={
            <>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                className="bg-primary-600 hover:bg-primary-700 gap-2"
                onClick={handleSave}
                disabled={saving}
              >
                <Check className="w-4 h-4" />
                {saving ? "Saving…" : "Save"}
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
                className="h-10"
                placeholder="e.g. Bed 101"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                autoFocus
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
            <div className="space-y-1.5">
              <Label>Daily Charge (₹/day)</Label>
              <Input
                type="number"
                min="0"
                className="h-10"
                placeholder="0"
                value={formDailyCharge}
                onChange={(e) => setFormDailyCharge(e.target.value)}
              />
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
        </FormDialog>
      )}
    </>
  );
}
