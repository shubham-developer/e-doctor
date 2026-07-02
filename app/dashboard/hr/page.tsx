"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Users,
  LayoutGrid,
  List,
  Search,
  Plus,
  X,
  CalendarDays,
  Banknote,
  TreePalm,
  User,
  Shield,
  Trash2,
  KeyRound,
  Copy,
  CheckCheck,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CustomRole {
  _id: string;
  name: string;
}

interface StaffMember {
  _id: string;
  staffCode: number;
  name: string;
  phone?: string;
  alternatePhone?: string;
  email?: string;
  role: string;
  customRoleId?: CustomRole | null;
  designation?: string;
  department?: string;
  floor?: string;
  address?: string;
  dateOfBirth?: string;
  dateOfJoining?: string;
  salary?: number;
  photoUrl?: string;
  status: "active" | "inactive";
}

// ─── Constants ────────────────────────────────────────────────────────────────

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

// ─── Add / Edit Staff Modal ───────────────────────────────────────────────────

function CopyablePassword({ password }: { password: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-lg font-bold tracking-widest text-gray-900">
        {password}
      </span>
      <button
        onClick={copy}
        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 border border-blue-200 rounded px-2 py-1"
      >
        {copied ? (
          <CheckCheck className="w-3.5 h-3.5" />
        ) : (
          <Copy className="w-3.5 h-3.5" />
        )}
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}

function StaffModal({
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

  const selectedRole = roles.find((r) => r._id === customRoleId);

  useEffect(() => {
    if (open) {
      setNewPassword("");
      setResetPassword("");
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
      const res = await fetch("/api/dashboard/hr", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error);
        return;
      }
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
      const res = await fetch(`/api/dashboard/hr/${staff._id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
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

  async function handleResetPassword() {
    if (!staff) return;
    setResetting(true);
    try {
      const res = await fetch(`/api/dashboard/hr/${staff._id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resetPassword" }),
      });
      const data = await res.json();
      if (data.success) {
        setResetPassword(data.data.tempPassword);
      } else {
        toast.error(data.error ?? "Failed to reset password");
      }
    } finally {
      setResetting(false);
    }
  }

  const inp =
    "h-9 text-sm border border-gray-300 rounded px-2.5 w-full focus:outline-none focus:border-blue-400";
  const sel = inp + " bg-white";
  const lbl = "block text-xs font-medium text-gray-700 mb-1";

  // ── Password-reveal screen (shown after successful create with email) ──
  if (newPassword) {
    return (
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) {
            setNewPassword("");
            onClose();
          }
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-md p-0 overflow-hidden gap-0"
        >
          <div className="bg-green-600 text-white flex items-center justify-between px-5 py-3.5">
            <h2 className="text-base font-semibold">
              Staff Added Successfully
            </h2>
            <button
              type="button"
              onClick={() => {
                setNewPassword("");
                onClose();
              }}
              className="text-white hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
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
          <div className="border-t px-6 py-3 flex justify-end">
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => {
                setNewPassword("");
                onClose();
              }}
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-none sm:w-[min(92vw,860px)] p-0 overflow-hidden gap-0"
      >
        <div className="bg-blue-600 text-white flex items-center justify-between px-5 py-3.5">
          <h2 className="text-base font-semibold">
            {isEdit ? "Edit Staff Member" : "Add Staff Member"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-white hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Login account section — shown at top when editing a staff member with email */}
        {isEdit && staff?.email && (
          <div className="px-5 pt-4">
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-blue-800">
                    Login Account
                  </p>
                  <p className="text-xs text-blue-600 mt-0.5">{staff.email}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs h-8 border-blue-200 text-blue-700 hover:bg-blue-100"
                  onClick={handleResetPassword}
                  disabled={resetting}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  {resetting ? "Resetting…" : "Reset Password"}
                </Button>
              </div>
              {resetPassword && (
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <p className="text-xs text-blue-700 mb-1.5">
                    New password — copy and share with the staff member:
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
              <label className={lbl}>
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inp}
              />
            </div>
            <div>
              <label className={lbl}>
                Role <span className="text-red-500">*</span>
              </label>
              <select
                value={customRoleId}
                onChange={(e) => setCustomRoleId(e.target.value)}
                className={sel}
              >
                <option value="">Select role</option>
                {roles.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={lbl}>Designation</label>
              <input
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                className={inp}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={lbl}>Phone</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inp}
              />
            </div>
            <div>
              <label className={lbl}>Alternate Phone</label>
              <input
                value={alternatePhone}
                onChange={(e) => setAltPhone(e.target.value)}
                className={inp}
              />
            </div>
            <div>
              <label className={lbl}>
                Email
                {!isEdit && (
                  <span className="text-gray-400 font-normal ml-1 text-[11px]">
                    (creates login account)
                  </span>
                )}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inp}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={lbl}>Department</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className={sel}
              >
                <option value="">Select</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={lbl}>Floor</label>
              <select
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                className={sel}
              >
                <option value="">Select</option>
                {FLOORS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={lbl}>Salary</label>
              <input
                type="number"
                min="0"
                value={salary}
                onChange={(e) =>
                  setSalary(e.target.value === "" ? "" : Number(e.target.value))
                }
                className={inp}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Date of Birth</label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDob(e.target.value)}
                className={inp}
              />
            </div>
            <div>
              <label className={lbl}>Date of Joining</label>
              <input
                type="date"
                value={dateOfJoining}
                onChange={(e) => setDoj(e.target.value)}
                className={inp}
              />
            </div>
          </div>

          <div>
            <label className={lbl}>Address</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              className="border border-gray-300 rounded px-2.5 py-2 text-sm w-full focus:outline-none focus:border-blue-400 resize-none"
            />
          </div>
        </div>

        <div className="border-t px-5 py-3 flex items-center justify-between">
          {isEdit ? (
            confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-600">Are you sure?</span>
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
                  className="h-7 text-xs bg-red-600 hover:bg-red-700"
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
                className="gap-1.5 text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 h-8"
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
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? "Saving…" : isEdit ? "Update" : "Add Staff"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Staff Card ───────────────────────────────────────────────────────────────

function StaffCard({
  member,
  onClick,
}: {
  member: StaffMember;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-lg p-4 flex gap-4 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
    >
      <div className="w-20 h-20 shrink-0 rounded bg-gray-100 overflow-hidden flex items-center justify-center">
        {member.photoUrl ? (
          <img
            src={member.photoUrl}
            alt={member.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <User className="w-8 h-8 text-gray-300" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-gray-900 text-sm leading-tight">
          {member.name}
        </p>
        <p className="text-gray-500 text-xs mt-0.5">{member.staffCode}</p>
        {member.phone && (
          <p className="text-gray-500 text-xs">{member.phone}</p>
        )}
        {(member.floor || member.department) && (
          <p className="text-gray-400 text-xs mt-0.5 truncate">
            {[member.floor, member.department].filter(Boolean).join(", ")}
          </p>
        )}
        <div className="flex flex-wrap gap-1 mt-2">
          <span className="text-xs border border-gray-300 text-gray-600 px-1.5 py-0.5 rounded">
            {member.role}
          </span>
          {member.customRoleId && (
            <span className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded flex items-center gap-0.5">
              <Shield className="w-2.5 h-2.5" />
              {member.customRoleId.name}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HRPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"card" | "list">("card");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const limit = 100;

  // Load roles once
  useEffect(() => {
    fetch("/api/dashboard/settings/roles")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setRoles(d.data);
      });
  }, []);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search,
        page: String(page),
        limit: String(limit),
        ...(roleFilter && { role: roleFilter }),
      });
      const res = await fetch(`/api/dashboard/hr?${params}`);
      const data = await res.json();
      if (data.success) {
        setStaff(data.data.staff ?? []);
        setTotal(data.data.total ?? 0);
        setTotalPages(data.data.totalPages ?? 1);
      }
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, page]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  function handleSearch() {
    setSearch(searchInput);
    setPage(1);
  }

  function handleSaved() {
    fetchStaff();
  }

  const staffListColumns: ColumnDef<StaffMember>[] = [
    {
      key: "staffCode",
      header: "Staff ID",
      sortable: true,
      sortValue: (m) => m.staffCode,
      skeletonWidth: "w-12",
      render: (m) => (
        <span className="font-mono text-xs text-gray-500">{m.staffCode}</span>
      ),
    },
    {
      key: "name",
      header: "Name",
      sortable: true,
      sortValue: (m) => m.name,
      skeletonWidth: "w-36",
      render: (m) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
            {m.photoUrl ? (
              <img
                src={m.photoUrl}
                alt={m.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-4 h-4 text-gray-300" />
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-gray-900 whitespace-nowrap">
              {m.name}
            </p>
            {m.email && <p className="text-xs text-gray-400">{m.email}</p>}
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      sortable: true,
      sortValue: (m) => m.role,
      skeletonWidth: "w-20",
      render: (m) => (
        <div className="flex items-center gap-1.5">
          <span className="text-xs border border-gray-300 text-gray-600 px-1.5 py-0.5 rounded whitespace-nowrap">
            {m.role}
          </span>
          {m.customRoleId && (
            <span className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded flex items-center gap-0.5 whitespace-nowrap">
              <Shield className="w-2.5 h-2.5" />
              {m.customRoleId.name}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "designation",
      header: "Designation",
      sortable: true,
      sortValue: (m) => m.designation ?? "",
      skeletonWidth: "w-24",
      render: (m) => (
        <span className="text-xs text-gray-600">{m.designation || "—"}</span>
      ),
    },
    {
      key: "department",
      header: "Department",
      sortable: true,
      sortValue: (m) => m.department ?? "",
      skeletonWidth: "w-28",
      render: (m) => (
        <span className="text-xs text-gray-600">{m.department || "—"}</span>
      ),
    },
    {
      key: "floor",
      header: "Floor",
      skeletonWidth: "w-16",
      render: (m) => (
        <span className="text-xs text-gray-600">{m.floor || "—"}</span>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      skeletonWidth: "w-24",
      render: (m) => (
        <span className="text-xs font-mono text-gray-600">
          {m.phone || "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      skeletonWidth: "w-14",
      render: (m) => (
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${m.status === "active" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}
        >
          {m.status}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      skeletonWidth: "w-10",
      render: (m) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setEditingStaff(m);
          }}
          className="text-xs text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-400 rounded px-2 py-0.5"
        >
          Edit
        </button>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 pt-4 pb-3 flex items-center gap-3">
        <h1 className="text-lg font-semibold text-gray-800">Staff Directory</h1>
        <div className="ml-auto flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setShowAdd(true)}
            className="bg-blue-600 hover:bg-blue-700 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add Staff
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.info("Attendance coming soon")}
            className="flex items-center gap-1.5"
          >
            <CalendarDays className="w-4 h-4" /> Staff Attendance
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.info("Payroll coming soon")}
            className="flex items-center gap-1.5"
          >
            <Banknote className="w-4 h-4" /> Payroll
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.info("Leaves coming soon")}
            className="flex items-center gap-1.5"
          >
            <TreePalm className="w-4 h-4" /> Leaves
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b px-6 py-4">
        <div className="grid grid-cols-2 gap-6 max-w-2xl">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Filter by Role
            </label>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="w-full h-10 text-sm border border-gray-300 rounded px-3 bg-white focus:outline-none focus:border-blue-400"
            >
              <option value="">All Roles</option>
              {roles.map((r) => (
                <option key={r._id} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Search By Keyword
            </label>
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search By Staff ID, Name, Role etc..."
              className="w-full h-10 text-sm border border-gray-300 rounded px-3 focus:outline-none focus:border-blue-400"
            />
          </div>
        </div>
        <div className="mt-3 flex gap-3">
          <Button
            size="sm"
            onClick={handleSearch}
            className="bg-blue-600 hover:bg-blue-700 flex items-center gap-1.5"
          >
            <Search className="w-4 h-4" /> Search
          </Button>
          {(search || roleFilter) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("");
                setSearchInput("");
                setRoleFilter("");
                setPage(1);
              }}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* View toggle + count */}
      <div className="bg-white border-b px-6 py-2 flex items-center gap-1">
        <button
          onClick={() => setView("card")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded transition-colors ${view === "card" ? "text-blue-600 border-b-2 border-blue-600 font-medium" : "text-gray-500 hover:text-gray-700"}`}
        >
          <LayoutGrid className="w-4 h-4" /> Card View
        </button>
        <button
          onClick={() => setView("list")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded transition-colors ${view === "list" ? "text-blue-600 border-b-2 border-blue-600 font-medium" : "text-gray-500 hover:text-gray-700"}`}
        >
          <List className="w-4 h-4" /> List View
        </button>
        <span className="ml-auto text-xs text-gray-400">{total} members</span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-gray-400">
            Loading…
          </div>
        ) : staff.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-gray-400">
            <Users className="w-10 h-10" />
            <p>No staff members found</p>
            <Button
              size="sm"
              onClick={() => setShowAdd(true)}
              className="bg-blue-600 hover:bg-blue-700 mt-1"
            >
              Add First Staff Member
            </Button>
          </div>
        ) : view === "card" ? (
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {staff.map((m) => (
              <StaffCard
                key={m._id}
                member={m}
                onClick={() => setEditingStaff(m)}
              />
            ))}
          </div>
        ) : (
          <DataTable<StaffMember>
            columns={staffListColumns}
            data={staff}
            rowKey={(m) => m._id}
            loading={loading}
            emptyText="No staff members found"
            onRowClick={(m) => setEditingStaff(m)}
            downloadable
            printable
            fileName="staff-directory"
          />
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-4 text-sm">
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
      </div>

      <StaffModal
        open={showAdd}
        roles={roles}
        onClose={() => setShowAdd(false)}
        onSaved={handleSaved}
      />
      <StaffModal
        open={!!editingStaff}
        staff={editingStaff}
        roles={roles}
        onClose={() => setEditingStaff(null)}
        onSaved={() => {
          handleSaved();
          setEditingStaff(null);
        }}
        onDeleted={() => {
          setEditingStaff(null);
          fetchStaff();
        }}
      />
    </div>
  );
}
