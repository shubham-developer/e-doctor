"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/context";
import { X, Printer, Save, Loader2, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";
import { printRadiologyReport } from "./ResultsPrinter";
import type { RadiologyBill } from "./types";

interface ResultTest {
  testId?: string;
  testName: string;
  findings: string;
  impression: string;
}

interface ResultData {
  _id: string | null;
  reportDate: string;
  status: "pending" | "completed";
  reportedByName: string;
  verifiedByName: string;
  tests: ResultTest[];
}

export function RadiologyResultsDialog({
  bill,
  clinicName,
  clinicAddress,
  clinicPhone,
  logoUrl,
  printLayouts,
  onClose,
  onSaved,
}: {
  bill: RadiologyBill;
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
      .get<ResultData>(`/api/dashboard/radiology/bills/${bill._id}/results`)
      .then((d) => {
        if (d.success) setResult(d.data);
        else toast.error(d.error ?? "Failed to load results");
      })
      .finally(() => setLoading(false));
  }, [bill._id]);

  function setField<K extends keyof ResultData>(key: K, val: ResultData[K]) {
    setResult((prev) => (prev ? { ...prev, [key]: val } : prev));
  }

  function setTestField(idx: number, key: keyof ResultTest, val: string) {
    setResult((prev) => {
      if (!prev) return prev;
      const tests = prev.tests.map((t, i) =>
        i === idx ? { ...t, [key]: val } : t,
      );
      return { ...prev, tests };
    });
  }

  async function handleSave(markComplete: boolean) {
    if (!result) return;
    setSaving(true);
    try {
      const res = await apiClient.post<ResultData>(
        `/api/dashboard/radiology/bills/${bill._id}/results`,
        { ...result, status: markComplete ? "completed" : result.status },
      );
      if (res.success) {
        setResult(res.data);
        onSaved(res.data.status);
        toast.success(
          markComplete ? "Report marked as completed" : "Results saved",
        );
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
    printRadiologyReport({
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

  const ta =
    "w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:border-primary-400 focus:ring-1 focus:ring-primary-100 outline-none bg-white resize-none";
  const inp =
    "h-7 w-full px-2 text-xs border border-gray-200 rounded focus:border-primary-400 outline-none bg-white";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2">
            <ScanLine className="w-4 h-4 text-purple-600" />
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
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              className="text-gray-400 hover:bg-gray-100"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
            </div>
          ) : !result ? null : (
            <>
              {/* Meta */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
                    placeholder="Radiographer name"
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
                    placeholder="Radiologist name"
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
                  <div className="bg-purple-50 border-b border-purple-100 px-4 py-2">
                    <p className="text-xs font-semibold text-purple-700">
                      {test.testName}
                    </p>
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <label className="block text-2xs font-semibold text-gray-500 uppercase mb-1.5">
                        Findings
                      </label>
                      <textarea
                        rows={4}
                        value={test.findings}
                        onChange={(e) =>
                          setTestField(ti, "findings", e.target.value)
                        }
                        disabled={!canWrite}
                        placeholder="Describe the radiological findings…"
                        className={ta}
                      />
                    </div>
                    <div>
                      <label className="block text-2xs font-semibold text-gray-500 uppercase mb-1.5">
                        Impression / Conclusion
                      </label>
                      <textarea
                        rows={3}
                        value={test.impression}
                        onChange={(e) =>
                          setTestField(ti, "impression", e.target.value)
                        }
                        disabled={!canWrite}
                        placeholder="Clinical impression or diagnosis…"
                        className={ta}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-gray-200 shrink-0 bg-gray-50">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            disabled={loading || !result}
          >
            <Printer className="w-3.5 h-3.5" /> Print Report
          </Button>
          {canWrite && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSave(false)}
                disabled={saving || loading || !result}
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                Save Draft
              </Button>
              <Button
                size="sm"
                onClick={() => handleSave(true)}
                disabled={saving || loading || !result}
                className="bg-success-600 hover:bg-success-700 text-white"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ScanLine className="w-3.5 h-3.5" />
                )}
                Mark Complete
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
