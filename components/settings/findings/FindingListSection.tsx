"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useApiQuery } from "@/lib/useApiQuery";
import { apiClient } from "@/lib/apiClient";
import { useFindingCategories, type FindingLookup } from "@/lib/lookups";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { FormDialog } from "@/components/common/FormDialog";
import { TablePagination } from "@/components/common/TablePagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Pencil, Trash2, Plus } from "lucide-react";

type Finding = FindingLookup;

const EMPTY_FINDING: Omit<Finding, "_id"> = { category: "", list: "" };

/** Finding List section — each entry is a List value under a Category (picked from the Category tab). */
const PAGE_SIZE = 25;

export function FindingListSection() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Omit<Finding, "_id">>(EMPTY_FINDING);
  const [editId, setEditId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: findingsData, isPending: loading } = useApiQuery<Finding[]>(
    ["finding-masters"],
    "/api/dashboard/findings",
  );
  const items = findingsData ?? [];
  const { data: categories = [] } = useFindingCategories();

  function invalidateLookup() {
    queryClient.invalidateQueries({ queryKey: ["finding-masters"] });
  }

  function openAdd() {
    setEditId(null);
    setForm(EMPTY_FINDING);
    setDialogOpen(true);
  }
  function openEdit(f: Finding) {
    setEditId(f._id);
    setForm({ category: f.category, list: f.list });
    setDialogOpen(true);
  }

  async function save() {
    if (!form.category.trim()) {
      toast.error("Category is required");
      return;
    }
    if (!form.list.trim()) {
      toast.error("List is required");
      return;
    }
    setSaving(true);
    const res = editId
      ? await apiClient.patch(`/api/dashboard/findings/${editId}`, form)
      : await apiClient.post("/api/dashboard/findings", form);
    if (res.success) {
      toast.success(editId ? "Updated" : "Added");
      setDialogOpen(false);
      invalidateLookup();
    } else toast.error(res.error);
    setSaving(false);
  }

  async function del(id: string) {
    const res = await apiClient.delete(`/api/dashboard/findings/${id}`);
    if (res.success) {
      toast.success("Deleted");
      invalidateLookup();
    } else toast.error(res.error);
  }

  const columns: ColumnDef<Finding>[] = [
    {
      key: "category",
      header: "Finding Category",
      accessor: "category",
      sortable: true,
    },
    {
      key: "list",
      header: "Finding List",
      accessor: "list",
      sortable: true,
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
                  className="p-1.5 rounded-md hover:bg-danger-50 text-gray-400 hover:text-danger-500 transition-colors"
                />
              }
            >
              <Trash2 className="w-3.5 h-3.5" />
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this finding?</AlertDialogTitle>
                <AlertDialogDescription>
                  This finding entry will be permanently removed.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-danger-600 hover:bg-danger-700"
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
      i.list.toLowerCase().includes(search.toLowerCase()),
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <div className="flex flex-col h-full">
        <DataTable<Finding>
          columns={columns}
          data={pageItems}
          rowKey={(r) => r._id}
          loading={loading}
          searchValue={search}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          searchPlaceholder="Search findings..."
          toolbarRight={
            <Button
              size="sm"
              className="bg-primary-600 hover:bg-primary-700 gap-1.5 h-8 text-xs"
              onClick={openAdd}
            >
              <Plus className="w-3.5 h-3.5" /> Add Finding
            </Button>
          }
          downloadable
          printable
          fileName="Findings"
          emptyText="No findings added yet"
          stickyHeader={false}
          wrapperClassName="flex-1 overflow-auto"
        />
        {totalPages > 1 && (
          <TablePagination
            page={page}
            total={filtered.length}
            limit={PAGE_SIZE}
            onPageChange={setPage}
            itemLabel="findings"
            className="border-t border-x-0 border-b-0 rounded-none shrink-0"
          />
        )}
      </div>

      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editId ? "Edit Finding" : "Add Finding"}
        contentClassName="sm:max-w-sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-primary-600 hover:bg-primary-700"
              onClick={save}
              disabled={saving}
            >
              {saving ? "Saving..." : editId ? "Save Changes" : "Add"}
            </Button>
          </>
        }
      >
        <div className="px-5 py-4 space-y-3">
          <div className="space-y-1.5">
            <Label>
              Finding Category <span className="text-danger-500">*</span>
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
                    No categories — add them in the Category tab
                  </SelectItem>
                ) : (
                  categories.map((c) => (
                    <SelectItem key={c._id} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>
              Finding List <span className="text-danger-500">*</span>
            </Label>
            <Input
              value={form.list}
              onChange={(e) =>
                setForm((f) => ({ ...f, list: e.target.value }))
              }
              placeholder="e.g. Blood Pressure, Chest Clear"
              className="h-9"
            />
          </div>
        </div>
      </FormDialog>
    </>
  );
}
