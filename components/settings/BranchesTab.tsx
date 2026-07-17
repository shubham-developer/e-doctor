"use client";

import { useMemo, useState } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Building2 } from "lucide-react";
import { useApiQuery } from "@/lib/useApiQuery";
import { apiClient } from "@/lib/apiClient";
import { useApp } from "@/lib/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { FormDialog } from "@/components/common/FormDialog";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { INDIAN_STATES } from "@/lib/constants/indianStates";
import { INDIAN_CITIES_BY_STATE } from "@/lib/constants/indianCities";

const STATE_OPTIONS = INDIAN_STATES.map((s) => ({ value: s, label: s }));

interface BranchRecord {
  _id: string;
  name: string;
  code: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  isDefault: boolean;
}

interface BranchFormValues {
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  isActive: boolean;
  isDefault: boolean;
}

const EMPTY_FORM: BranchFormValues = {
  name: "",
  code: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  phone: "",
  email: "",
  isActive: true,
  isDefault: false,
};

export function BranchesTab() {
  const { user } = useApp();
  const isOwner = user?.role === "OWNER";
  const qc = useQueryClient();
  const { data, isFetching } = useApiQuery<BranchRecord[]>(
    ["branches"],
    "/api/dashboard/branches",
  );
  const branches = data ?? [];

  const [search, setSearch] = useState("");
  const filteredBranches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return branches;
    return branches.filter((b) =>
      [b.name, b.code, b.address, b.city, b.state, b.pincode, b.phone, b.email]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q)),
    );
  }, [branches, search]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BranchRecord | null>(null);
  const [saving, setSaving] = useState(false);

  const { register, control, handleSubmit, setValue, reset } =
    useForm<BranchFormValues>({ defaultValues: EMPTY_FORM });

  const selectedState = useWatch({ control, name: "state" });
  const cityOptions = useMemo(() => {
    const cities = INDIAN_CITIES_BY_STATE[selectedState] ?? [];
    return cities.map((c) => ({ value: c, label: c }));
  }, [selectedState]);

  function openAdd() {
    setEditing(null);
    reset(EMPTY_FORM);
    setOpen(true);
  }

  function openEdit(b: BranchRecord) {
    setEditing(b);
    reset({
      name: b.name,
      code: b.code,
      address: b.address ?? "",
      city: b.city ?? "",
      state: b.state ?? "",
      pincode: b.pincode ?? "",
      phone: b.phone ?? "",
      email: b.email ?? "",
      isActive: b.isActive,
      isDefault: b.isDefault,
    });
    setOpen(true);
  }

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["branches"] });
  }

  const onSubmit = handleSubmit(
    async (values) => {
      setSaving(true);
      const res = editing
        ? await apiClient.put(`/api/dashboard/branches/${editing._id}`, values)
        : await apiClient.post("/api/dashboard/branches", values);
      setSaving(false);
      if (!res.success) {
        toast.error(res.error ?? "Failed");
        return;
      }
      toast.success(editing ? "Branch updated" : "Branch added");
      setOpen(false);
      invalidate();
    },
    (errors) => {
      const message = errors.name?.message ?? errors.code?.message ?? "Please fix the errors";
      toast.error(message);
    },
  );

  async function handleDelete(b: BranchRecord) {
    if (!confirm(`Remove branch "${b.name}"?`)) return;
    const res = await apiClient.delete(`/api/dashboard/branches/${b._id}`);
    if (!res.success) {
      toast.error(res.error ?? "Failed");
      return;
    }
    toast.success("Branch removed");
    invalidate();
  }

  const inp = "h-9";
  const lbl = "text-xs font-medium text-gray-700 mb-1";

  const columns: ColumnDef<BranchRecord>[] = [
    {
      key: "name",
      header: "Branch",
      sortable: true,
      render: (b) => (
        <div>
          <p className="text-xs font-medium text-gray-900 flex items-center gap-1.5">
            {b.name}
            {b.isDefault && (
              <span className="text-2xs font-semibold px-1.5 py-0.5 rounded bg-primary-100 text-primary-700">
                Default
              </span>
            )}
          </p>
          <p className="text-2xs text-gray-400">
            {[b.address, b.city, b.state, b.pincode].filter(Boolean).join(", ")}
          </p>
        </div>
      ),
    },
    {
      key: "code",
      header: "Code",
      render: (b) => (
        <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">
          {b.code}
        </span>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      render: (b) => (
        <span className="text-xs text-gray-600">{b.phone || "—"}</span>
      ),
    },
    {
      key: "email",
      header: "Email",
      render: (b) => (
        <span className="text-xs text-gray-600">{b.email || "—"}</span>
      ),
    },
    {
      key: "isActive",
      header: "Active",
      width: "w-20",
      render: (b) => <Switch checked={b.isActive} disabled />,
    },
    {
      key: "actions",
      header: "",
      width: "w-20",
      align: "right",
      render: (b) =>
        isOwner ? (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => openEdit(b)}
              className="text-gray-400 hover:text-gray-600"
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => handleDelete(b)}
              className="text-gray-400 hover:text-danger-500"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        ) : null,
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={filteredBranches}
        rowKey={(b) => b._id}
        loading={isFetching}
        emptyText="No branches added yet"
        wrapperClassName="flex-1 overflow-auto"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search name, code, phone…"
        toolbarRight={
          isOwner ? (
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 bg-primary-600 hover:bg-primary-700"
              onClick={openAdd}
            >
              <Plus className="w-3.5 h-3.5" /> Add Branch
            </Button>
          ) : undefined
        }
      />

      <FormDialog
        open={open}
        onClose={() => !saving && setOpen(false)}
        title={editing ? "Edit Branch" : "Add Branch"}
        contentClassName="sm:w-[min(92vw,720px)]"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              className="bg-primary-600 hover:bg-primary-700"
              onClick={onSubmit}
              disabled={saving}
            >
              <Building2 className="w-3.5 h-3.5 mr-1.5" />
              {saving ? "Saving…" : editing ? "Update" : "Add Branch"}
            </Button>
          </>
        }
      >
        <div className="px-5 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <Label className={lbl}>Branch Name *</Label>
              <Input
                className={inp}
                placeholder="Enter branch name"
                {...register("name", { required: "Branch name is required" })}
              />
            </div>
            <div>
              <Label className={lbl}>Short Code *</Label>
              <Input
                className={inp}
                placeholder="Enter short code"
                maxLength={10}
                {...register("code", { required: "Branch code is required" })}
                onChange={(e) => setValue("code", e.target.value.toUpperCase())}
              />
            </div>
          </div>

          <div>
            <Label className={lbl}>Address</Label>
            <Input
              className={inp}
              placeholder="Enter address"
              {...register("address")}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className={lbl}>State</Label>
              <Controller
                control={control}
                name="state"
                render={({ field }) => (
                  <SearchableSelect
                    value={field.value}
                    onValueChange={(v) => {
                      field.onChange(v);
                      setValue("city", "");
                    }}
                    options={STATE_OPTIONS}
                    placeholder="Select state…"
                    triggerClassName="h-9 px-2.5"
                  />
                )}
              />
            </div>
            <div>
              <Label className={lbl}>City</Label>
              <Controller
                control={control}
                name="city"
                render={({ field }) => (
                  <SearchableSelect
                    value={field.value}
                    onValueChange={field.onChange}
                    options={cityOptions}
                    placeholder={selectedState ? "Select city…" : "Select state first"}
                    triggerClassName="h-9 px-2.5"
                    disabled={!selectedState}
                  />
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className={lbl}>Pincode</Label>
              <Input
                className={inp}
                placeholder="Enter pincode"
                inputMode="numeric"
                maxLength={6}
                {...register("pincode")}
                onChange={(e) =>
                  setValue("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))
                }
              />
            </div>
            <div>
              <Label className={lbl}>Phone</Label>
              <Input
                className={inp}
                placeholder="Enter phone number"
                {...register("phone")}
              />
            </div>
          </div>

          <div>
            <Label className={lbl}>Email</Label>
            <Input className={inp} placeholder="Enter email" {...register("email")} />
          </div>

          <div className="border-t pt-3 space-y-2">
            <div className="flex items-center gap-2">
              <Controller
                control={control}
                name="isDefault"
                render={({ field }) => (
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
              <span className="text-xs text-gray-600">
                Default branch for new logins
              </span>
            </div>
            {editing && (
              <div className="flex items-center gap-2">
                <Controller
                  control={control}
                  name="isActive"
                  render={({ field }) => (
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  )}
                />
                <span className="text-xs text-gray-600">Active</span>
              </div>
            )}
          </div>
        </div>
      </FormDialog>
    </>
  );
}
