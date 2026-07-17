"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, KeyRound, Eye, EyeOff, RefreshCw } from "lucide-react";
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
import { apiClient } from "@/lib/apiClient";
import { useApiQuery } from "@/lib/useApiQuery";
import { useRoles, useBranches } from "@/lib/lookups";
import { CopyablePassword } from "./CopyablePassword";
import type { StaffMember } from "./types";

interface StaffFormState {
  name: string;
  phone: string;
  alternatePhone: string;
  email: string;
  customRoleId: string;
  designation: string;
  department: string;
  floor: string;
  address: string;
  dateOfBirth: string;
  dateOfJoining: string;
  salary: number | "";
  branchIds: string[];
}

const EMPTY_FORM: StaffFormState = {
  name: "",
  phone: "",
  alternatePhone: "",
  email: "",
  customRoleId: "",
  designation: "",
  department: "",
  floor: "",
  address: "",
  dateOfBirth: "",
  dateOfJoining: "",
  salary: "",
  branchIds: [],
};

export function StaffModal({
  open,
  staff,
  onClose,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  staff?: StaffMember | null;
  onClose: () => void;
  onSaved: () => void;
  onDeleted?: () => void;
}) {
  const isEdit = !!staff;
  const queryClient = useQueryClient();

  const { data: rolesData } = useRoles();
  const roles = rolesData ?? [];

  const { data: deptsData } = useApiQuery<{ items: { _id: string; name: string }[] }>(
    ["departments"],
    "/api/dashboard/departments",
    { staleTime: 5 * 60 * 1000 },
  );
  const departments = deptsData?.items ?? [];

  const { data: floorsData } = useApiQuery<{ items: { _id: string; name: string }[] }>(
    ["floors"],
    "/api/dashboard/floors",
    { staleTime: 5 * 60 * 1000 },
  );
  const floors = floorsData?.items ?? [];

  const { data: branchesData } = useBranches();
  const branches = branchesData ?? [];

  const [form, setForm] = useState<StaffFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Passwords shown inline in the modal
  const [newPassword, setNewPassword] = useState(""); // shown after create with email
  const [resetPassword, setResetPassword] = useState(""); // shown after reset
  // Set password inline form
  const [setPasswordOpen, setSetPasswordOpen] = useState(false);
  const [customPassword, setCustomPassword] = useState("");
  const [showCustomPassword, setShowCustomPassword] = useState(false);

  const selectedRole = roles.find((r) => r._id === form.customRoleId);

  useEffect(() => {
    if (open) {
      setNewPassword("");
      setResetPassword("");
      setSetPasswordOpen(false);
      setCustomPassword("");
      setConfirmDelete(false);
      setForm(
        staff
          ? {
              name: staff.name,
              phone: staff.phone ?? "",
              alternatePhone: staff.alternatePhone ?? "",
              email: staff.email ?? "",
              customRoleId: staff.customRoleId?._id ?? "",
              designation: staff.designation ?? "",
              department: staff.department ?? "",
              floor: staff.floor ?? "",
              address: staff.address ?? "",
              dateOfBirth: staff.dateOfBirth ?? "",
              dateOfJoining: staff.dateOfJoining ?? "",
              salary: staff.salary ?? "",
              branchIds: staff.branchIds ?? [],
            }
          : EMPTY_FORM,
      );
    }
  }, [staff, open]);

  function set<K extends keyof StaffFormState>(key: K, value: StaffFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!form.customRoleId.trim()) {
      toast.error("Role is required");
      return;
    }
    setSaving(true);
    try {
      const data = await apiClient[isEdit ? "patch" : "post"]<{
        tempPassword?: string;
      }>("/api/dashboard/hr", {
        ...(isEdit && { id: staff!._id }),
        ...form,
        role: selectedRole?.name ?? form.customRoleId,
        customRoleId: form.customRoleId || undefined,
        salary: form.salary === "" ? undefined : Number(form.salary),
      });
      if (!data.success) {
        toast.error(data.error);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
      onSaved();
      if (data.data.tempPassword) {
        // Stay open to show the password prominently
        setNewPassword(data.data.tempPassword);
      } else {
        onClose();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!staff) return;
    setDeleting(true);
    try {
      const data = await apiClient.delete(`/api/dashboard/hr/${staff._id}`);
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["doctors"] });
        toast.success(`${staff.name} removed`);
        onClose();
        onDeleted?.();
      } else {
        toast.error(data.error ?? "Failed to delete");
      }
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  async function handleSetPassword(password?: string) {
    if (!staff) return;
    setResetting(true);
    try {
      const data = await apiClient.post<{ tempPassword: string }>(
        `/api/dashboard/hr/${staff._id}`,
        { action: "resetPassword", ...(password ? { password } : {}) },
      );
      if (data.success) {
        setResetPassword(data.data.tempPassword);
        setSetPasswordOpen(false);
        setCustomPassword("");
      } else {
        toast.error(data.error ?? "Failed to set password");
      }
    } finally {
      setResetting(false);
    }
  }

  // ── Password-reveal screen (shown after successful create with email) ──
  if (newPassword) {
    const closeRevealScreen = () => {
      setNewPassword("");
      onClose();
    };
    return (
      <FormDialog
        open={open}
        onClose={closeRevealScreen}
        title="Staff Added Successfully"
        headerClassName="bg-success-600"
        contentClassName="sm:max-w-md"
        footer={
          <Button
            className="bg-success-600 hover:bg-success-700"
            onClick={closeRevealScreen}
          >
            Done
          </Button>
        }
      >
        <div className="px-6 py-6 space-y-4">
          <p className="text-sm text-gray-700">
            A login account has been created for{" "}
            <span className="font-semibold">{form.name}</span>. Share these
            credentials with them:
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Email</p>
              <p className="text-sm font-medium text-gray-900">{form.email}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Temporary Password</p>
              <CopyablePassword password={newPassword} />
            </div>
          </div>
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2">
            Note this password now — it won&apos;t be shown again. The staff member
            should change it after first login.
          </p>
        </div>
      </FormDialog>
    );
  }

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Staff Member" : "Add Staff Member"}
      contentClassName="sm:w-[min(92vw,860px)]"
      footerClassName="justify-between"
      footer={
        <>
          {isEdit ? (
            confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-danger-600">Are you sure?</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-xs bg-danger-600 hover:bg-danger-700"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? "Deleting…" : "Yes, Delete"}
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-danger-500 border-danger-200 hover:bg-danger-50 hover:text-danger-600 h-8"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Staff
              </Button>
            )
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="bg-primary-600 hover:bg-primary-700"
            >
              {saving ? "Saving…" : isEdit ? "Update" : "Add Staff"}
            </Button>
          </div>
        </>
      }
    >
      {/* Login account section — shown at top when editing a staff member with email */}
      {isEdit && staff?.email && (
        <div className="px-5 pt-4">
          <div className="rounded-lg border border-primary-100 bg-primary-50 px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-primary-800">
                  Login Account
                </p>
                <p className="text-xs text-primary-600 mt-0.5">{staff.email}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs h-8 border-primary-200 text-primary-700 hover:bg-primary-100"
                onClick={() => {
                  setSetPasswordOpen(true);
                  setCustomPassword("");
                  setShowCustomPassword(false);
                  setResetPassword("");
                }}
              >
                <KeyRound className="w-3.5 h-3.5" />
                Set Password
              </Button>
            </div>

            {/* Inline set-password form */}
            {setPasswordOpen && (
              <div className="mt-3 pt-3 border-t border-primary-200 space-y-2">
                <p className="text-xs font-medium text-primary-800">
                  Set a new password
                </p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showCustomPassword ? "text" : "password"}
                      value={customPassword}
                      onChange={(e) => setCustomPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="h-8 text-xs border-primary-200 pr-8 bg-white"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setShowCustomPassword((v) => !v)}
                      className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showCustomPassword ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    title="Generate random password"
                    onClick={() => {
                      const p = Math.random().toString(36).slice(-8);
                      setCustomPassword(p);
                      setShowCustomPassword(true);
                    }}
                    className="border-primary-200 text-primary-700 hover:bg-primary-100"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    disabled={resetting || customPassword.trim().length < 6}
                    onClick={() => handleSetPassword(customPassword.trim())}
                  >
                    {resetting ? "Saving…" : "Save Password"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-primary-200 text-primary-700 hover:bg-primary-100"
                    onClick={() => setSetPasswordOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {resetPassword && !setPasswordOpen && (
              <div className="mt-3 pt-3 border-t border-primary-200">
                <p className="text-xs text-primary-700 mb-1.5">
                  Password set — copy and share with the staff member:
                </p>
                <CopyablePassword password={resetPassword} />
              </div>
            )}
          </div>
        </div>
      )}

      <div className="px-5 py-4 space-y-3 max-h-[65vh] overflow-y-auto">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-xs font-medium text-gray-700 mb-1">
              Full Name <span className="text-danger-500">*</span>
            </Label>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className="h-9"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-700 mb-1">
              Role <span className="text-danger-500">*</span>
            </Label>
            <Select
              value={form.customRoleId}
              onValueChange={(v) => set("customRoleId", v ?? "")}
            >
              <SelectTrigger className="h-9">
                <SelectValue>{selectedRole?.name ?? "Select role"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r._id} value={r._id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-700 mb-1">
              Designation
            </Label>
            <Input
              value={form.designation}
              onChange={(e) => set("designation", e.target.value)}
              className="h-9"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-xs font-medium text-gray-700 mb-1">
              Phone
            </Label>
            <Input
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              className="h-9"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-700 mb-1">
              Alternate Phone
            </Label>
            <Input
              value={form.alternatePhone}
              onChange={(e) => set("alternatePhone", e.target.value)}
              className="h-9"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-700 mb-1">
              Email
              {!isEdit && (
                <span className="text-gray-400 font-normal ml-1 text-2xs">
                  (creates login account)
                </span>
              )}
            </Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              className="h-9"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-xs font-medium text-gray-700 mb-1">
              Department
            </Label>
            <Select
              value={form.department}
              onValueChange={(v) => set("department", v ?? "")}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {departments.length === 0 ? (
                  <SelectItem value="__none__" disabled>
                    No departments — add in Settings
                  </SelectItem>
                ) : (
                  departments.map((d) => (
                    <SelectItem key={d._id} value={d.name}>
                      {d.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-700 mb-1">
              Floor
            </Label>
            <Select value={form.floor} onValueChange={(v) => set("floor", v ?? "")}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {floors.length === 0 ? (
                  <SelectItem value="__none__" disabled>
                    No floors — add in Settings
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
          <div>
            <Label className="text-xs font-medium text-gray-700 mb-1">
              Salary
            </Label>
            <Input
              type="number"
              min="0"
              value={form.salary}
              onChange={(e) =>
                set("salary", e.target.value === "" ? "" : Number(e.target.value))
              }
              className="h-9"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs font-medium text-gray-700 mb-1">
              Date of Birth
            </Label>
            <Input
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => set("dateOfBirth", e.target.value)}
              className="h-9"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-700 mb-1">
              Date of Joining
            </Label>
            <Input
              type="date"
              value={form.dateOfJoining}
              onChange={(e) => set("dateOfJoining", e.target.value)}
              className="h-9"
            />
          </div>
        </div>

        <div>
          <Label className="text-xs font-medium text-gray-700 mb-1">
            Address
          </Label>
          <Textarea
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
            rows={2}
            className="text-sm resize-none"
          />
        </div>

        {branches.length > 1 && (
          <div>
            <Label className="text-xs font-medium text-gray-700 mb-1">
              Branches
              <span className="text-gray-400 font-normal ml-1 text-2xs">
                (none selected = all branches)
              </span>
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {branches.map((b) => {
                const selected = form.branchIds.includes(b._id);
                return (
                  <button
                    type="button"
                    key={b._id}
                    onClick={() =>
                      set(
                        "branchIds",
                        selected
                          ? form.branchIds.filter((id) => id !== b._id)
                          : [...form.branchIds, b._id],
                      )
                    }
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      selected
                        ? "bg-primary-600 border-primary-600 text-white"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {b.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </FormDialog>
  );
}
