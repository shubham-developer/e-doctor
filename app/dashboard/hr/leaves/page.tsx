"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft, Palmtree, Plus, Check, X, Trash2, Loader2,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { useApp } from "@/lib/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

// ── Types ─────────────────────────────────────────────────────────────────────

type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";
type LeaveType = "casual" | "sick" | "earned" | "without_pay" | "other";

interface StaffOption {
  _id: string;
  name: string;
  staffCode: number;
  department: string;
}

interface Leave {
  _id: string;
  staffId: string;
  staffName: string;
  staffCode: number;
  department: string;
  leaveType: LeaveType;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  approvedBy?: string;
  approvedAt?: string;
  rejectedReason?: string;
  createdAt: string;
}

interface ApplyForm {
  staffId: string;
  leaveType: LeaveType | "";
  fromDate: string;
  toDate: string;
  reason: string;
}

// ── Config ────────────────────────────────────────────────────────────────────

const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  casual: "Casual Leave",
  sick: "Sick Leave",
  earned: "Earned Leave",
  without_pay: "Leave Without Pay",
  other: "Other",
};

const STATUS_CONFIG: Record<LeaveStatus, { label: string; bg: string; text: string }> = {
  pending:   { label: "Pending",   bg: "bg-amber-100",  text: "text-amber-700" },
  approved:  { label: "Approved",  bg: "bg-green-100",  text: "text-green-700" },
  rejected:  { label: "Rejected",  bg: "bg-red-100",    text: "text-red-700" },
  cancelled: { label: "Cancelled", bg: "bg-gray-100",   text: "text-gray-500" },
};

type TabKey = "pending" | "approved" | "rejected" | "all";
const TABS: { key: TabKey; label: string }[] = [
  { key: "pending",  label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "all",      label: "All" },
];

const EMPTY_FORM: ApplyForm = {
  staffId: "", leaveType: "", fromDate: "", toDate: "", reason: "",
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function LeavesPage() {
  const router = useRouter();
  const { can } = useApp();

  const [tab, setTab] = useState<TabKey>("pending");
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pendingCount, setPendingCount] = useState(0);
  const [staffList, setStaffList] = useState<StaffOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Apply leave dialog
  const [applyOpen, setApplyOpen] = useState(false);
  const [form, setForm] = useState<ApplyForm>(EMPTY_FORM);
  const [applying, setApplying] = useState(false);

  // Reject dialog
  const [rejectTarget, setRejectTarget] = useState<Leave | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  // Per-row action loading
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "20", page: String(page) });
    if (tab !== "all") params.set("status", tab);
    const res = await apiClient.get<{ leaves: Leave[]; total: number; totalPages: number; pendingCount: number; staff: StaffOption[] }>(
      `/api/dashboard/hr/leaves?${params}`
    );
    setLoading(false);
    if (res.success) {
      setLeaves(res.data?.leaves ?? []);
      setTotal(res.data?.total ?? 0);
      setTotalPages(res.data?.totalPages ?? 1);
      setPendingCount(res.data?.pendingCount ?? 0);
      setStaffList(res.data?.staff ?? []);
    } else {
      toast.error(res.error ?? "Failed to load leaves");
    }
  }, [tab, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [tab]);

  async function applyLeave() {
    if (!form.staffId) return toast.error("Please select a staff member");
    if (!form.leaveType) return toast.error("Please select leave type");
    if (!form.fromDate || !form.toDate) return toast.error("Please enter from and to dates");
    if (form.toDate < form.fromDate) return toast.error("To date must be on or after from date");

    setApplying(true);
    const res = await apiClient.post("/api/dashboard/hr/leaves", {
      staffId: form.staffId,
      leaveType: form.leaveType,
      fromDate: form.fromDate,
      toDate: form.toDate,
      reason: form.reason,
    });
    setApplying(false);
    if (res.success) {
      toast.success("Leave applied successfully");
      setApplyOpen(false);
      setForm(EMPTY_FORM);
      setTab("pending");
      load();
    } else {
      toast.error(res.error ?? "Failed to apply leave");
    }
  }

  async function action(leave: Leave, act: "approve" | "reject" | "cancel", extra?: { rejectedReason?: string }) {
    setActionLoading(leave._id + act);
    const res = await apiClient.patch(`/api/dashboard/hr/leaves/${leave._id}`, { action: act, ...extra });
    setActionLoading(null);
    if (res.success) {
      toast.success(act === "approve" ? "Leave approved" : act === "reject" ? "Leave rejected" : "Leave cancelled");
      load();
    } else {
      toast.error(res.error ?? "Action failed");
    }
  }

  async function deletLeave(leave: Leave) {
    setActionLoading(leave._id + "del");
    const res = await apiClient.delete(`/api/dashboard/hr/leaves/${leave._id}`);
    setActionLoading(null);
    if (res.success) { toast.success("Deleted"); load(); }
    else toast.error(res.error ?? "Delete failed");
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 lg:px-6 py-4 border-b border-gray-100 bg-white shrink-0 flex items-center gap-3">
        <button onClick={() => router.push("/dashboard/hr")} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Palmtree className="w-5 h-5 text-primary-600" />
            Leave Management
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">Apply, approve, and track staff leave requests</p>
        </div>
        {can("humanResource", "add") && (
          <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => { setForm(EMPTY_FORM); setApplyOpen(true); }}>
            <Plus className="w-3.5 h-3.5" /> Apply Leave
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 lg:px-6 py-5 space-y-4">
        {/* Tabs */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                tab === t.key ? "bg-white shadow-sm text-gray-800" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
              {t.key === "pending" && pendingCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-amber-500 text-white text-2xs rounded-full">{pendingCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-600">Staff</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Leave Type</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-600">From</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-600">To</th>
                  <th className="px-3 py-2.5 text-center font-semibold text-gray-600">Days</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Reason</th>
                  <th className="px-3 py-2.5 text-center font-semibold text-gray-600">Status</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={8} className="py-12 text-center text-gray-400"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></td></tr>
                ) : leaves.length === 0 ? (
                  <tr><td colSpan={8} className="py-12 text-center text-gray-400">No leave requests found</td></tr>
                ) : leaves.map((l) => {
                  const scfg = STATUS_CONFIG[l.status];
                  return (
                    <tr key={l._id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-2.5">
                        <p className="font-semibold text-gray-800">{l.staffName}</p>
                        <p className="text-gray-400">#{l.staffCode} · {l.department}</p>
                      </td>
                      <td className="px-3 py-2.5 text-gray-700">{LEAVE_TYPE_LABELS[l.leaveType]}</td>
                      <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{formatDate(l.fromDate)}</td>
                      <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{formatDate(l.toDate)}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full font-bold">{l.days}</span>
                      </td>
                      <td className="px-3 py-2.5 text-gray-500 max-w-xs">
                        <p className="truncate max-w-48" title={l.reason}>{l.reason || "—"}</p>
                        {l.status === "approved" && l.approvedBy && (
                          <p className="text-green-600 mt-0.5">Approved by {l.approvedBy}</p>
                        )}
                        {l.status === "rejected" && l.rejectedReason && (
                          <p className="text-red-500 mt-0.5" title={l.rejectedReason}>Reason: {l.rejectedReason}</p>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-semibold ${scfg.bg} ${scfg.text}`}>
                          {scfg.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {l.status === "pending" && can("humanResource", "edit") && (
                            <>
                              <button
                                onClick={() => action(l, "approve")}
                                disabled={!!actionLoading}
                                className="p-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 transition-colors disabled:opacity-50"
                                title="Approve"
                              >
                                {actionLoading === l._id + "approve" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                onClick={() => { setRejectTarget(l); setRejectReason(""); }}
                                disabled={!!actionLoading}
                                className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 transition-colors disabled:opacity-50"
                                title="Reject"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          {l.status === "approved" && can("humanResource", "edit") && (
                            <button
                              onClick={() => action(l, "cancel")}
                              disabled={!!actionLoading}
                              className="p-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors disabled:opacity-50 text-2xs font-medium px-2"
                              title="Cancel"
                            >
                              {actionLoading === l._id + "cancel" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Cancel"}
                            </button>
                          )}
                          {l.status !== "approved" && can("humanResource", "delete") && (
                            <button
                              onClick={() => deletLeave(l)}
                              disabled={!!actionLoading}
                              className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors disabled:opacity-50"
                              title="Delete"
                            >
                              {actionLoading === l._id + "del" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-500">{total} total records</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 text-gray-600 transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-gray-600 font-medium">{page} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 text-gray-600 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Apply Leave Dialog ─────────────────────────────────────────────── */}
      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>Apply Leave</DialogTitle>
          <div className="space-y-3 py-1">
            <div>
              <Label className="text-xs font-medium">Staff Member *</Label>
              <Select value={form.staffId} onValueChange={(v) => setForm(f => ({ ...f, staffId: v ?? "" }))}>
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue placeholder="Select staff" />
                </SelectTrigger>
                <SelectContent>
                  {staffList.map((s) => (
                    <SelectItem key={s._id} value={s._id} className="text-xs">
                      {s.name} (#{s.staffCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-medium">Leave Type *</Label>
              <Select value={form.leaveType} onValueChange={(v) => setForm(f => ({ ...f, leaveType: v as LeaveType }))}>
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(LEAVE_TYPE_LABELS) as [LeaveType, string][]).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium">From Date *</Label>
                <Input type="date" className="mt-1 h-8 text-xs" value={form.fromDate}
                  onChange={(e) => setForm(f => ({ ...f, fromDate: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs font-medium">To Date *</Label>
                <Input type="date" className="mt-1 h-8 text-xs" value={form.toDate}
                  min={form.fromDate}
                  onChange={(e) => setForm(f => ({ ...f, toDate: e.target.value }))} />
              </div>
            </div>

            {form.fromDate && form.toDate && form.toDate >= form.fromDate && (
              <p className="text-xs text-primary-600 font-medium">
                Duration: {(() => {
                  let days = 0;
                  const d = new Date(form.fromDate);
                  const end = new Date(form.toDate);
                  while (d <= end) { if (d.getDay() !== 0) days++; d.setDate(d.getDate() + 1); }
                  return `${days} working day${days !== 1 ? "s" : ""}`;
                })()}
              </p>
            )}

            <div>
              <Label className="text-xs font-medium">Reason</Label>
              <textarea
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-xs resize-none outline-none focus:ring-2 focus:ring-primary-300 h-20"
                placeholder="Reason for leave..."
                value={form.reason}
                onChange={(e) => setForm(f => ({ ...f, reason: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setApplyOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={applyLeave} disabled={applying}>
              {applying ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              Apply Leave
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Reject Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={!!rejectTarget} onOpenChange={(o) => { if (!o) setRejectTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogTitle>Reject Leave</DialogTitle>
          {rejectTarget && (
            <div className="space-y-3 py-1">
              <p className="text-xs text-gray-600">
                Rejecting leave for <strong>{rejectTarget.staffName}</strong>{" "}
                ({formatDate(rejectTarget.fromDate)} – {formatDate(rejectTarget.toDate)}, {rejectTarget.days} days)
              </p>
              <div>
                <Label className="text-xs font-medium">Reason for rejection</Label>
                <textarea
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-xs resize-none outline-none focus:ring-2 focus:ring-primary-300 h-20"
                  placeholder="Enter reason..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button variant="destructive" size="sm" disabled={rejecting}
              onClick={async () => {
                if (!rejectTarget) return;
                setRejecting(true);
                await action(rejectTarget, "reject", { rejectedReason: rejectReason });
                setRejecting(false);
                setRejectTarget(null);
              }}>
              {rejecting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              Reject Leave
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
