"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft, Banknote, Users, CheckCircle2, Clock, IndianRupee,
  Play, Pencil, X, Check, Printer, ChevronLeft, ChevronRight,
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { useCurrency } from "@/lib/context";
import { useApp } from "@/lib/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Allowances { hra: number; da: number; medical: number; transport: number; other: number }
interface Deductions { pf: number; esi: number; tds: number; advance: number; other: number }

interface PayrollEntry {
  _id: string;
  staffId: string;
  staffName: string;
  staffCode: number;
  role: string;
  department: string;
  month: string;
  basicSalary: number;
  allowances: Allowances;
  deductions: Deductions;
  workingDays: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  halfDays: number;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  paymentStatus: "pending" | "paid";
  paymentDate?: string;
  paymentMode?: string;
  paymentRef?: string;
  notes?: string;
}

interface Summary {
  total: number;
  paid: number;
  pending: number;
  totalNetSalary: number;
  totalPaid: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function monthLabel(m: string) {
  const [y, mo] = m.split("-");
  return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function prevMonth(m: string) {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(y, mo - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function nextMonth(m: string) {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(y, mo, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PayrollPage() {
  const router = useRouter();
  const { fmt } = useCurrency();
  const { can } = useApp();

  const [month, setMonth] = useState(currentMonth());
  const [payrolls, setPayrolls] = useState<PayrollEntry[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const [editEntry, setEditEntry] = useState<PayrollEntry | null>(null);
  const [editForm, setEditForm] = useState<Partial<PayrollEntry & { allowances: Allowances; deductions: Deductions }>>({});
  const [editSaving, setEditSaving] = useState(false);

  const [payEntry, setPayEntry] = useState<PayrollEntry | null>(null);
  const [payForm, setPayForm] = useState({ paymentDate: new Date().toISOString().slice(0, 10), paymentMode: "cash", paymentRef: "" });
  const [paySaving, setPaySaving] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiClient.get<{ payrolls: PayrollEntry[]; summary: Summary }>(
      `/api/dashboard/hr/payroll?month=${month}`
    );
    setLoading(false);
    if (res.success) {
      setPayrolls(res.data?.payrolls ?? []);
      setSummary(res.data?.summary ?? null);
    } else {
      toast.error(res.error ?? "Failed to load payroll");
    }
  }, [month]);

  useEffect(() => { load(); }, [load]);

  async function handleGenerate() {
    if (!confirm(`Generate payroll for all active staff for ${monthLabel(month)}?`)) return;
    setGenerating(true);
    const res = await apiClient.post("/api/dashboard/hr/payroll/generate", { month });
    setGenerating(false);
    if (res.success) {
      toast.success(`Payroll generated for ${(res.data as { generated: number }).generated} staff`);
      load();
    } else {
      toast.error(res.error ?? "Failed to generate");
    }
  }

  function openEdit(entry: PayrollEntry) {
    setEditEntry(entry);
    setEditForm({
      basicSalary: entry.basicSalary,
      workingDays: entry.workingDays,
      presentDays: entry.presentDays,
      absentDays: entry.absentDays,
      leaveDays: entry.leaveDays,
      halfDays: entry.halfDays,
      allowances: { ...entry.allowances },
      deductions: { ...entry.deductions },
      notes: entry.notes ?? "",
    });
  }

  async function handleEditSave() {
    if (!editEntry) return;
    setEditSaving(true);
    const res = await apiClient.put(`/api/dashboard/hr/payroll/${editEntry._id}`, editForm);
    setEditSaving(false);
    if (res.success) {
      toast.success("Payslip updated");
      setEditEntry(null);
      load();
    } else {
      toast.error(res.error ?? "Failed to save");
    }
  }

  async function handleMarkPaid(entry: PayrollEntry) {
    setPayEntry(entry);
    setPayForm({ paymentDate: new Date().toISOString().slice(0, 10), paymentMode: "cash", paymentRef: "" });
  }

  async function handlePaySave() {
    if (!payEntry) return;
    setPaySaving(true);
    const res = await apiClient.patch(`/api/dashboard/hr/payroll/${payEntry._id}`, {
      paymentStatus: "paid",
      ...payForm,
    });
    setPaySaving(false);
    if (res.success) {
      toast.success("Marked as paid");
      setPayEntry(null);
      load();
    } else {
      toast.error(res.error ?? "Failed");
    }
  }

  async function handleMarkUnpaid(entry: PayrollEntry) {
    if (!confirm("Mark this payslip as unpaid?")) return;
    const res = await apiClient.patch(`/api/dashboard/hr/payroll/${entry._id}`, { paymentStatus: "pending" });
    if (res.success) { toast.success("Marked as pending"); load(); }
    else toast.error(res.error ?? "Failed");
  }

  function printPayslip(entry: PayrollEntry) {
    const win = window.open("", "_blank", "width=600,height=800");
    if (!win) return;
    const totalAllowances = Object.values(entry.allowances).reduce((s, v) => s + v, 0);
    win.document.write(`
      <html><head><title>Payslip - ${entry.staffName} - ${monthLabel(entry.month)}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; margin: 24px; color: #111; }
        h2 { margin: 0 0 4px; font-size: 18px; } h3 { margin: 16px 0 8px; font-size: 14px; color: #444; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #333; padding-bottom: 12px; margin-bottom: 16px; }
        .badge { display: inline-block; background: #dcfce7; color: #166534; padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; }
        table { width: 100%; border-collapse: collapse; }
        td, th { padding: 5px 8px; border: 1px solid #e5e7eb; font-size: 12px; }
        th { background: #f9fafb; font-weight: 600; text-align: left; }
        .right { text-align: right; }
        .total-row { background: #f0fdf4; font-weight: bold; }
        .net { font-size: 16px; font-weight: bold; margin-top: 16px; text-align: right; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; margin-bottom: 16px; }
        .info-row { display: flex; gap: 8px; } .label { color: #6b7280; min-width: 120px; }
      </style></head><body>
      <div class="header">
        <div><h2>PAYSLIP</h2><p style="margin:0;color:#666">${monthLabel(entry.month)}</p></div>
        <span class="badge">${entry.paymentStatus === "paid" ? "PAID" : "PENDING"}</span>
      </div>
      <div class="info-grid">
        <div class="info-row"><span class="label">Staff Name:</span><strong>${entry.staffName}</strong></div>
        <div class="info-row"><span class="label">Staff Code:</span><span>${entry.staffCode}</span></div>
        <div class="info-row"><span class="label">Role:</span><span>${entry.role}</span></div>
        <div class="info-row"><span class="label">Department:</span><span>${entry.department || "—"}</span></div>
        <div class="info-row"><span class="label">Working Days:</span><span>${entry.workingDays}</span></div>
        <div class="info-row"><span class="label">Present Days:</span><span>${entry.presentDays}</span></div>
        ${entry.absentDays > 0 ? `<div class="info-row"><span class="label">Absent Days:</span><span style="color:#dc2626">${entry.absentDays}</span></div>` : ""}
        ${entry.leaveDays > 0 ? `<div class="info-row"><span class="label">Leave Days:</span><span style="color:#2563eb">${entry.leaveDays}</span></div>` : ""}
        ${entry.halfDays > 0 ? `<div class="info-row"><span class="label">Half Days:</span><span style="color:#d97706">${entry.halfDays}</span></div>` : ""}
      </div>
      <h3>Earnings</h3>
      <table>
        <tr><th>Component</th><th class="right">Amount (₹)</th></tr>
        <tr><td>Basic Salary</td><td class="right">${fmt(entry.basicSalary)}</td></tr>
        <tr><td>HRA</td><td class="right">${fmt(entry.allowances.hra)}</td></tr>
        <tr><td>DA</td><td class="right">${fmt(entry.allowances.da)}</td></tr>
        <tr><td>Medical Allowance</td><td class="right">${fmt(entry.allowances.medical)}</td></tr>
        <tr><td>Transport Allowance</td><td class="right">${fmt(entry.allowances.transport)}</td></tr>
        ${entry.allowances.other > 0 ? `<tr><td>Other Allowances</td><td class="right">${fmt(entry.allowances.other)}</td></tr>` : ""}
        <tr class="total-row"><td>Gross Salary</td><td class="right">${fmt(entry.grossSalary)}</td></tr>
      </table>
      <h3>Deductions</h3>
      <table>
        <tr><th>Component</th><th class="right">Amount (₹)</th></tr>
        <tr><td>Provident Fund (PF)</td><td class="right">${fmt(entry.deductions.pf)}</td></tr>
        <tr><td>ESI</td><td class="right">${fmt(entry.deductions.esi)}</td></tr>
        <tr><td>TDS / Income Tax</td><td class="right">${fmt(entry.deductions.tds)}</td></tr>
        <tr><td>Advance Recovery</td><td class="right">${fmt(entry.deductions.advance)}</td></tr>
        ${entry.deductions.other > 0 ? `<tr><td>Other Deductions</td><td class="right">${fmt(entry.deductions.other)}</td></tr>` : ""}
        <tr class="total-row"><td>Total Deductions</td><td class="right">${fmt(entry.totalDeductions)}</td></tr>
      </table>
      <p class="net">Net Pay: ${fmt(entry.netSalary)}</p>
      ${entry.paymentStatus === "paid" ? `<p style="color:#166534;font-size:11px">Paid on ${entry.paymentDate ? new Date(entry.paymentDate).toLocaleDateString("en-IN") : "—"} via ${entry.paymentMode ?? "—"} ${entry.paymentRef ? "· Ref: " + entry.paymentRef : ""}</p>` : ""}
      <p style="margin-top:32px;font-size:10px;color:#9ca3af">Generated on ${new Date().toLocaleDateString("en-IN")} · This is a system generated payslip.</p>
      </body></html>
    `);
    win.document.close();
    setTimeout(() => win.print(), 300);
    void totalAllowances;
  }

  const noPayroll = !loading && payrolls.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 lg:px-6 py-4 border-b border-gray-100 bg-white shrink-0 flex items-center gap-3">
        <button onClick={() => router.push("/dashboard/hr")} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Banknote className="w-5 h-5 text-primary-600" />
            Payroll
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">Monthly salary processing &amp; payslips</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 lg:px-6 py-5 space-y-5">
        {/* Month navigator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => setMonth(prevMonth(month))} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-4 py-1.5 bg-white border border-gray-200 rounded-lg min-w-36 text-center">
              <span className="text-sm font-semibold text-gray-800">{monthLabel(month)}</span>
            </div>
            <button
              onClick={() => setMonth(nextMonth(month))}
              disabled={month >= currentMonth()}
              className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {can("humanResource", "add") && noPayroll && (
            <Button size="sm" className="h-8 text-xs gap-1.5" onClick={handleGenerate} disabled={generating}>
              <Play className="w-3.5 h-3.5" />
              {generating ? "Generating…" : "Generate Payroll"}
            </Button>
          )}
        </div>

        {/* Summary cards */}
        {summary && summary.total > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <SummaryCard icon={Users} iconBg="bg-blue-100" iconColor="text-blue-600" label="Total Staff" value={String(summary.total)} />
            <SummaryCard icon={CheckCircle2} iconBg="bg-green-100" iconColor="text-green-600" label="Paid" value={String(summary.paid)} />
            <SummaryCard icon={Clock} iconBg="bg-amber-100" iconColor="text-amber-600" label="Pending" value={String(summary.pending)} />
            <SummaryCard icon={IndianRupee} iconBg="bg-purple-100" iconColor="text-purple-600" label="Total Payable" value={fmt(summary.totalNetSalary)} small />
            <SummaryCard icon={Banknote} iconBg="bg-teal-100" iconColor="text-teal-600" label="Total Paid" value={fmt(summary.totalPaid)} small />
          </div>
        )}

        {/* Payroll table */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="divide-y divide-gray-50">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3">
                  <div className="h-8 w-8 bg-gray-100 rounded-full animate-pulse shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-gray-100 rounded animate-pulse w-1/3" />
                    <div className="h-2.5 bg-gray-100 rounded animate-pulse w-1/5" />
                  </div>
                  <div className="h-3 bg-gray-100 rounded animate-pulse w-20" />
                </div>
              ))}
            </div>
          ) : noPayroll ? (
            <div className="px-4 py-16 text-center">
              <Banknote className="w-10 h-10 mx-auto mb-3 text-gray-200" />
              <p className="text-sm font-medium text-gray-500">No payroll generated for {monthLabel(month)}</p>
              <p className="text-xs text-gray-400 mt-1 mb-4">Click &ldquo;Generate Payroll&rdquo; to create payslips for all active staff</p>
              {can("humanResource", "add") && (
                <Button size="sm" onClick={handleGenerate} disabled={generating} className="gap-1.5">
                  <Play className="w-3.5 h-3.5" />
                  {generating ? "Generating…" : "Generate Payroll"}
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Staff</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Role / Dept</th>
                    <th className="text-right px-4 py-2.5 font-semibold text-gray-600">Basic</th>
                    <th className="text-right px-4 py-2.5 font-semibold text-gray-600">Gross</th>
                    <th className="text-right px-4 py-2.5 font-semibold text-gray-600">Deductions</th>
                    <th className="text-right px-4 py-2.5 font-semibold text-gray-600">Net Pay</th>
                    <th className="text-right px-4 py-2.5 font-semibold text-gray-600">Days</th>
                    <th className="text-center px-4 py-2.5 font-semibold text-gray-600">Status</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {payrolls.map((entry) => (
                    <tr key={entry._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-800">{entry.staffName}</p>
                        <p className="text-gray-400">#{entry.staffCode}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-700">{entry.role}</p>
                        <p className="text-gray-400">{entry.department || "—"}</p>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">{fmt(entry.basicSalary)}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{fmt(entry.grossSalary)}</td>
                      <td className="px-4 py-3 text-right text-red-600">
                        {entry.totalDeductions > 0 ? `- ${fmt(entry.totalDeductions)}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">{fmt(entry.netSalary)}</td>
                      <td className="px-4 py-3 text-right">
                        <p className="text-gray-700 font-medium">{entry.presentDays}/{entry.workingDays}</p>
                        <div className="flex items-center justify-end gap-1 mt-0.5 flex-wrap">
                          {entry.absentDays > 0 && <span className="px-1 py-0 bg-red-100 text-red-600 rounded text-2xs font-semibold">{entry.absentDays}A</span>}
                          {entry.leaveDays > 0  && <span className="px-1 py-0 bg-blue-100 text-blue-600 rounded text-2xs font-semibold">{entry.leaveDays}L</span>}
                          {entry.halfDays > 0   && <span className="px-1 py-0 bg-amber-100 text-amber-600 rounded text-2xs font-semibold">{entry.halfDays}H</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {entry.paymentStatus === "paid" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-2xs font-semibold">
                            <Check className="w-2.5 h-2.5" /> Paid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-2xs font-semibold">
                            <Clock className="w-2.5 h-2.5" /> Pending
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => printPayslip(entry)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors" title="Print payslip">
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          {can("humanResource", "edit") && entry.paymentStatus === "pending" && (
                            <button onClick={() => openEdit(entry)} className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors" title="Edit">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {entry.paymentStatus === "pending" ? (
                            <button onClick={() => handleMarkPaid(entry)} className="px-2 py-1 rounded bg-green-50 hover:bg-green-100 text-green-700 text-2xs font-semibold transition-colors">
                              Mark Paid
                            </button>
                          ) : (
                            <button onClick={() => handleMarkUnpaid(entry)} className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-500 text-2xs font-semibold transition-colors">
                              Undo
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                    <td colSpan={5} className="px-4 py-2.5 text-xs text-gray-700 text-right">Total Net Payable</td>
                    <td className="px-4 py-2.5 text-right text-sm font-bold text-gray-900">{fmt(summary?.totalNetSalary ?? 0)}</td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Edit payslip dialog */}
      <Dialog open={!!editEntry} onOpenChange={(o) => { if (!o) setEditEntry(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogTitle>Edit Payslip — {editEntry?.staffName}</DialogTitle>
          {editEntry && (
            <div className="space-y-4 py-2">
              {/* Attendance summary from attendance module */}
              {(editEntry.absentDays > 0 || editEntry.leaveDays > 0 || editEntry.halfDays > 0) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs">
                  <p className="font-semibold text-blue-700 mb-1">Attendance Summary (from Attendance Module)</p>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-700">Present: <strong>{editEntry.presentDays}</strong></span>
                    {editEntry.absentDays > 0 && <span className="text-red-600">Absent: <strong>{editEntry.absentDays}</strong></span>}
                    {editEntry.leaveDays > 0 && <span className="text-blue-600">Leave: <strong>{editEntry.leaveDays}</strong></span>}
                    {editEntry.halfDays > 0 && <span className="text-amber-600">Half Day: <strong>{editEntry.halfDays}</strong></span>}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Basic Salary</label>
                  <Input type="number" min="0" value={editForm.basicSalary ?? 0} onChange={(e) => setEditForm((f) => ({ ...f, basicSalary: Number(e.target.value) }))} className="h-8 text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Working Days</label>
                  <Input type="number" min="1" max="31" value={editForm.workingDays ?? 26} onChange={(e) => setEditForm((f) => ({ ...f, workingDays: Number(e.target.value) }))} className="h-8 text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Present Days</label>
                  <Input type="number" min="0" max={editForm.workingDays ?? 26} value={editForm.presentDays ?? 26} onChange={(e) => setEditForm((f) => ({ ...f, presentDays: Number(e.target.value) }))} className="h-8 text-xs" />
                </div>
              </div>

              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Allowances</p>
              <div className="grid grid-cols-2 gap-3">
                {(["hra", "da", "medical", "transport", "other"] as const).map((k) => (
                  <div key={k}>
                    <label className="block text-xs font-medium text-gray-700 mb-1 capitalize">{k === "hra" ? "HRA" : k === "da" ? "DA" : k}</label>
                    <Input type="number" min="0" value={editForm.allowances?.[k] ?? 0}
                      onChange={(e) => setEditForm((f) => ({ ...f, allowances: { ...f.allowances!, [k]: Number(e.target.value) } }))}
                      className="h-8 text-xs" />
                  </div>
                ))}
              </div>

              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Deductions</p>
              <div className="grid grid-cols-2 gap-3">
                {(["pf", "esi", "tds", "advance", "other"] as const).map((k) => (
                  <div key={k}>
                    <label className="block text-xs font-medium text-gray-700 mb-1 capitalize">{k === "pf" ? "PF" : k === "esi" ? "ESI" : k === "tds" ? "TDS / Income Tax" : k}</label>
                    <Input type="number" min="0" value={editForm.deductions?.[k] ?? 0}
                      onChange={(e) => setEditForm((f) => ({ ...f, deductions: { ...f.deductions!, [k]: Number(e.target.value) } }))}
                      className="h-8 text-xs" />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <Input value={editForm.notes ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} className="h-8 text-xs" placeholder="Optional" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditEntry(null)}>Cancel</Button>
            <Button size="sm" onClick={handleEditSave} disabled={editSaving}>
              {editSaving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark paid dialog */}
      <Dialog open={!!payEntry} onOpenChange={(o) => { if (!o) setPayEntry(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogTitle>Mark as Paid — {payEntry?.staffName}</DialogTitle>
          <div className="space-y-3 py-2">
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500">Net Pay</p>
              <p className="text-2xl font-bold text-gray-900">{fmt(payEntry?.netSalary ?? 0)}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Payment Date</label>
              <Input type="date" value={payForm.paymentDate} onChange={(e) => setPayForm((f) => ({ ...f, paymentDate: e.target.value }))} className="h-8 text-xs" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Payment Mode</label>
              <Select value={payForm.paymentMode} onValueChange={(v) => setPayForm((f) => ({ ...f, paymentMode: v ?? "cash" }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Reference / Cheque No.</label>
              <Input value={payForm.paymentRef} onChange={(e) => setPayForm((f) => ({ ...f, paymentRef: e.target.value }))} placeholder="Optional" className="h-8 text-xs" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setPayEntry(null)}>Cancel</Button>
            <Button size="sm" onClick={handlePaySave} disabled={paySaving} className="bg-green-600 hover:bg-green-700">
              {paySaving ? "Saving…" : "Confirm Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div ref={printRef} />
    </div>
  );
}

// ── Summary card ──────────────────────────────────────────────────────────────

function SummaryCard({
  icon: Icon, iconBg, iconColor, label, value, small,
}: { icon: React.ElementType; iconBg: string; iconColor: string; label: string; value: string; small?: boolean }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center mb-2`}>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <p className={`font-bold text-gray-900 ${small ? "text-base" : "text-2xl"}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}
