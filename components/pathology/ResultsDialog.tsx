"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/context";
import { X, Printer, Save, FlaskConical, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";
import { printPathologyReport } from "./ResultsPrinter";
import type { PathologyBill } from "./types";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Parameter {
  name: string;
  value: string;
  unit: string;
  referenceRange: string;
  flag: "H" | "L" | "N" | "";
}

interface ResultTest {
  testId?: string;
  testName: string;
  parameters: Parameter[];
  remarks: string;
}

interface ResultData {
  _id: string | null;
  reportDate: string;
  status: "pending" | "completed";
  reportedByName: string;
  verifiedByName: string;
  tests: ResultTest[];
}

// ── Flag auto-calculation from reference range ─────────────────────────────────

function autoFlag(value: string, refRange: string): "H" | "L" | "N" | "" {
  const num = parseFloat(value);
  if (isNaN(num) || !refRange.trim()) return "";

  const rangeMatch = refRange.match(/^(\d+\.?\d*)\s*[-–]\s*(\d+\.?\d*)/);
  if (rangeMatch) {
    const lo = parseFloat(rangeMatch[1]);
    const hi = parseFloat(rangeMatch[2]);
    if (num < lo) return "L";
    if (num > hi) return "H";
    return "N";
  }
  const ltMatch = refRange.match(/^[<≤]\s*(\d+\.?\d*)/);
  if (ltMatch) return num >= parseFloat(ltMatch[1]) ? "H" : "N";

  const gtMatch = refRange.match(/^[>≥]\s*(\d+\.?\d*)/);
  if (gtMatch) return num <= parseFloat(gtMatch[1]) ? "L" : "N";

  return "N";
}

// ── Component ──────────────────────────────────────────────────────────────────

export function PathologyResultsDialog({
  bill,
  clinicName,
  clinicAddress,
  clinicPhone,
  logoUrl,
  printLayouts,
  onClose,
  onSaved,
}: {
  bill: PathologyBill;
  clinicName: string;
  clinicAddress?: string;
  clinicPhone?: string;
  logoUrl?: string;
  printLayouts?: Record<string, string>;
  onClose: () => void;
  onSaved: (status: "pending" | "completed") => void;
}) {
  const { user } = useApp();
  const canWrite = user?.role !== "VIEWER";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<ResultData | null>(null);

  useEffect(() => {
    apiClient
      .get<ResultData>(`/api/dashboard/pathology/bills/${bill._id}/results`)
      .then((d) => {
        if (d.success) setResult(d.data);
        else toast.error(d.error ?? "Failed to load results");
      })
      .finally(() => setLoading(false));
  }, [bill._id]);

  function setField<K extends keyof ResultData>(key: K, val: ResultData[K]) {
    setResult((prev) => (prev ? { ...prev, [key]: val } : prev));
  }

  function setParam(
    testIdx: number,
    paramIdx: number,
    key: keyof Parameter,
    val: string,
  ) {
    setResult((prev) => {
      if (!prev) return prev;
      const tests = prev.tests.map((t, ti) => {
        if (ti !== testIdx) return t;
        const parameters = t.parameters.map((p, pi) => {
          if (pi !== paramIdx) return p;
          const updated = { ...p, [key]: val };
          if (key === "value") {
            updated.flag = autoFlag(val, p.referenceRange);
          }
          return updated;
        });
        return { ...t, parameters };
      });
      return { ...prev, tests };
    });
  }

  function setTestRemarks(testIdx: number, remarks: string) {
    setResult((prev) => {
      if (!prev) return prev;
      const tests = prev.tests.map((t, ti) =>
        ti === testIdx ? { ...t, remarks } : t,
      );
      return { ...prev, tests };
    });
  }

  async function handleSave(markComplete: boolean) {
    if (!result) return;
    setSaving(true);
    try {
      const res = await apiClient.post<ResultData>(
        `/api/dashboard/pathology/bills/${bill._id}/results`,
        {
          ...result,
          status: markComplete ? "completed" : result.status,
        },
      );
      if (res.success) {
        setResult(res.data);
        onSaved(res.data.status);
        toast.success(markComplete ? "Report marked as completed" : "Results saved");
        if (markComplete) onClose();
      } else {
        toast.error(res.error ?? "Save failed");
      }
    } finally {
      setSaving(false);
    }
  }

  function handlePrint() {
    if (!result) return;
    printPathologyReport({
      billNo: bill.billNo,
      billDate: bill.billDate,
      reportDate: result.reportDate,
      patientName: bill.patientId?.name,
      patientCode: bill.patientId?.patientCode,
      referenceDoctor: bill.referenceDoctor,
      reportedByName: result.reportedByName,
      verifiedByName: result.verifiedByName,
      tests: result.tests,
      clinicName,
      clinicAddress,
      clinicPhone,
      logoUrl,
      printLayouts,
    });
  }

  const inp =
    "h-7 w-full px-2 text-xs border border-gray-200 rounded focus:border-primary-400 focus:ring-1 focus:ring-primary-100 outline-none bg-white";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-primary-600" />
            <div>
              <p className="text-sm font-semibold text-gray-800">
                Enter Results — {bill.billNo}
              </p>
              <p className="text-2xs text-gray-400">
                {bill.patientId?.name ?? "—"} · {bill.billDate} ·{" "}
                {bill.items.length} test{bill.items.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {result && (
              <span
                className={`text-2xs px-2 py-0.5 rounded-full font-medium ${
                  result.status === "completed"
                    ? "bg-success-100 text-success-700"
                    : "bg-warning-100 text-warning-700"
                }`}
              >
                {result.status === "completed" ? "Completed" : "Pending"}
              </span>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
            </div>
          ) : !result ? null : (
            <>
              {/* Meta row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-2xs font-semibold text-gray-500 uppercase mb-1">
                    Report Date
                  </label>
                  <input
                    type="date"
                    value={result.reportDate}
                    onChange={(e) => setField("reportDate", e.target.value)}
                    disabled={!canWrite}
                    className={inp}
                  />
                </div>
                <div>
                  <label className="block text-2xs font-semibold text-gray-500 uppercase mb-1">
                    Reported By
                  </label>
                  <input
                    type="text"
                    placeholder="Technician name"
                    value={result.reportedByName}
                    onChange={(e) => setField("reportedByName", e.target.value)}
                    disabled={!canWrite}
                    className={inp}
                  />
                </div>
                <div>
                  <label className="block text-2xs font-semibold text-gray-500 uppercase mb-1">
                    Verified By
                  </label>
                  <input
                    type="text"
                    placeholder="Pathologist name"
                    value={result.verifiedByName}
                    onChange={(e) => setField("verifiedByName", e.target.value)}
                    disabled={!canWrite}
                    className={inp}
                  />
                </div>
              </div>

              {/* Tests */}
              {result.tests.map((test, ti) => (
                <div
                  key={ti}
                  className="border border-gray-200 rounded-xl overflow-hidden"
                >
                  <div className="bg-primary-50 border-b border-primary-100 px-4 py-2">
                    <p className="text-xs font-semibold text-primary-700">
                      {test.testName}
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs min-w-[560px]">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wide text-2xs w-48">
                            Parameter
                          </th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wide text-2xs w-28">
                            Value
                          </th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wide text-2xs w-24">
                            Unit
                          </th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wide text-2xs">
                            Reference Range
                          </th>
                          <th className="px-3 py-2 text-center font-semibold text-gray-500 uppercase tracking-wide text-2xs w-16">
                            Flag
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {test.parameters.map((param, pi) => (
                          <tr key={pi} className="hover:bg-gray-50">
                            <td className="px-3 py-1.5 font-medium text-gray-700">
                              {param.name}
                            </td>
                            <td className="px-3 py-1.5">
                              <input
                                type="text"
                                value={param.value}
                                onChange={(e) =>
                                  setParam(ti, pi, "value", e.target.value)
                                }
                                disabled={!canWrite}
                                placeholder="—"
                                className={`${inp} ${
                                  param.flag === "H"
                                    ? "border-danger-300 bg-danger-50 text-danger-700"
                                    : param.flag === "L"
                                      ? "border-primary-300 bg-primary-50 text-primary-700"
                                      : ""
                                }`}
                              />
                            </td>
                            <td className="px-3 py-1.5">
                              <input
                                type="text"
                                value={param.unit}
                                onChange={(e) =>
                                  setParam(ti, pi, "unit", e.target.value)
                                }
                                disabled={!canWrite}
                                placeholder="unit"
                                className={inp}
                              />
                            </td>
                            <td className="px-3 py-1.5">
                              <input
                                type="text"
                                value={param.referenceRange}
                                onChange={(e) =>
                                  setParam(ti, pi, "referenceRange", e.target.value)
                                }
                                disabled={!canWrite}
                                placeholder="e.g. 70-140"
                                className={inp}
                              />
                            </td>
                            <td className="px-3 py-1.5 text-center">
                              {param.flag ? (
                                <span
                                  className={`inline-block px-1.5 py-0.5 rounded text-2xs font-bold ${
                                    param.flag === "H"
                                      ? "bg-danger-100 text-danger-700"
                                      : param.flag === "L"
                                        ? "bg-primary-100 text-primary-700"
                                        : "bg-success-100 text-success-700"
                                  }`}
                                >
                                  {param.flag}
                                </span>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="px-3 py-2 border-t border-gray-100 bg-gray-50">
                    <input
                      type="text"
                      value={test.remarks}
                      onChange={(e) => setTestRemarks(ti, e.target.value)}
                      disabled={!canWrite}
                      placeholder="Remarks (optional)…"
                      className="h-7 w-full px-2 text-xs border border-gray-200 rounded focus:border-primary-400 outline-none bg-white"
                    />
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-gray-200 shrink-0 bg-gray-50">
          <button
            onClick={handlePrint}
            disabled={loading || !result}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 disabled:opacity-40"
          >
            <Printer className="w-3.5 h-3.5" /> Print Report
          </button>
          {canWrite && (
            <div className="flex gap-2">
              <button
                onClick={() => handleSave(false)}
                disabled={saving || loading || !result}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 disabled:opacity-40"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                Save Draft
              </button>
              <button
                onClick={() => handleSave(true)}
                disabled={saving || loading || !result}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-success-600 hover:bg-success-700 text-white rounded-lg disabled:opacity-40"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FlaskConical className="w-3.5 h-3.5" />
                )}
                Mark Complete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
