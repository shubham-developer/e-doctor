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
import { CopyablePassword } from "./CopyablePassword";
import type { CustomRole, StaffMember } from "./types";

const DEPARTMENTS = [
  "Doctor Department",
  "Nursing Department",
  "Pharmacy Department",
  "Finance",
  "Radiology",
  "Admin",
  "Pathology",
  "OT",
  "Reception",
  "Lab",
  "Gynecology",
  "Cardiology",
  "Orthopedics",
];

const FLOORS = [
  "Ground Floor",
  "1st Floor",
  "2nd Floor",
  "3rd Floor",
  "4th Floor",
  "Basement",
];

export function StaffModal({
  open,
  staff,
  roles,
  onClose,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  staff?: StaffMember | null;
  roles: CustomRole[];
  onClose: () => void;
  onSaved: () => void;
  onDeleted?: () => void;
}) {
  const isEdit = !!staff;
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [alternatePhone, setAltPhone] = useState("");
  const [email, setEmail] = useState("");
  const [customRoleId, setCustomRoleId] = useState("");
  const [designation, setDesignation] = useState("");
  const [department, setDepartment] = useState("");
  const [floor, setFloor] = useState("");
  const [address, setAddress] = useState("");
  const [dateOfBirth, setDob] = useState("");
  const [dateOfJoining, setDoj] = useState("");
  const [salary, setSalary] = useState<number | "">("");
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

  const selectedRole = roles.find((r) => r._id === customRoleId);

  useEffect(() => {
    if (open) {
      setNewPassword("");
      setResetPassword("");
      setSetPasswordOpen(false);
      setCustomPassword("");
      setConfirmDelete(false);
      if (staff) {
        setName(staff.name);
        setPhone(staff.phone ?? "");
        setAltPhone(staff.alternatePhone ?? "");
        setEmail(staff.email ?? "");
        setCustomRoleId(staff.customRoleId?._id ?? "");
        setDesignation(staff.designation ?? "");
        setDepartment(staff.department ?? "");
        setFloor(staff.floor ?? "");
        setAddress(staff.address ?? "");
        setDob(staff.dateOfBirth ?? "");
        setDoj(staff.dateOfJoining ?? "");
        setSalary(staff.salary ?? "");
      } else {
        setName("");
        setPhone("");
        setAltPhone("");
        setEmail("");
        setCustomRoleId("");
        setDesignation("");
        setDepartment("");
        setFloor("");
        setAddress("");
        setDob("");
        setDoj("");
        setSalary("");
      }
    }
  }, [staff, open]);

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!customRoleId.trim()) {
      toast.error("Role is required");
      return;
    }
    setSaving(true);
    try {
      const data = await apiClient[isEdit ? "patch" : "post"]<{
        tempPassword?: string;
      }>("/api/dashboard/hr", {
        ...(isEdit && { id: staff!._id }),
        name,
        phone,
        alternatePhone,
        email,
        role: selectedRole?.name ?? customRoleId,
        customRoleId: customRoleId || undefined,
        designation,
        department,
        floor,
        address,
        dateOfBirth,
        dateOfJoining,
        salary: salary === "" ? undefined : Number(salary),
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
            <span className="font-semibold">{name}</span>. Share these
            credentials with them:
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Email</p>
              <p className="text-sm font-medium text-gray-900">{email}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Temporary Password</p>
              <CopyablePassword password={newPassword} />
            </div>
          </div>
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2">
            Note this password now — it won't be shown again. The staff member
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
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-700 mb-1">
              Role <span className="text-danger-500">*</span>
            </Label>
            <Select
              value={customRoleId}
              onValueChange={(v) => setCustomRoleId(v ?? "")}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select role" />
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
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
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
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-9"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-700 mb-1">
              Alternate Phone
            </Label>
            <Input
              value={alternatePhone}
              onChange={(e) => setAltPhone(e.target.value)}
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              value={department}
              onValueChange={(v) => setDepartment(v ?? "")}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-700 mb-1">
              Floor
            </Label>
            <Select value={floor} onValueChange={(v) => setFloor(v ?? "")}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {FLOORS.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
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
              value={salary}
              onChange={(e) =>
                setSalary(e.target.value === "" ? "" : Number(e.target.value))
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
              value={dateOfBirth}
              onChange={(e) => setDob(e.target.value)}
              className="h-9"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-700 mb-1">
              Date of Joining
            </Label>
            <Input
              type="date"
              value={dateOfJoining}
              onChange={(e) => setDoj(e.target.value)}
              className="h-9"
            />
          </div>
        </div>

        <div>
          <Label className="text-xs font-medium text-gray-700 mb-1">
            Address
          </Label>
          <Textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={2}
            className="text-sm resize-none"
          />
        </div>
      </div>
    </FormDialog>
  );
}
