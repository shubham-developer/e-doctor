"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useApp } from "@/lib/context";
import { X, Printer, Save, Loader2, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";

export interface ResultData<T> {
  _id: string | null;
  reportDate: string;
  status: "pending" | "completed";
  reportedByName: string;
  verifiedByName: string;
  tests: T[];
}

export interface EnterResultsDialogProps<
  T extends { testId?: string; testName: string },
> {
  billNo: string;
  billDate: string;
  patientName?: string;
  itemCount: number;
  resultsEndpoint: string;
  onClose: () => void;
  onSaved: (status: "pending" | "completed") => void;
  onPrint: (result: ResultData<T>) => void;
  icon: LucideIcon;
  iconClassName: string;
  loaderClassName: string;
  testHeaderClassName: string;
  testTitleClassName: string;
  dialogMaxWidthClassName?: string;
  reportedByPlaceholder: string;
  verifiedByPlaceholder: string;
  markCompleteClassName?: string;
  renderTest: (
    test: T,
    index: number,
    update: (patch: Partial<T>) => void,
    canWrite: boolean,
  ) => ReactNode;
}

export function EnterResultsDialog<
  T extends { testId?: string; testName: string },
>({
  billNo,
  billDate,
  patientName,
  itemCount,
  resultsEndpoint,
  onClose,
  onSaved,
  onPrint,
  icon: Icon,
  iconClassName,
  loaderClassName,
  testHeaderClassName,
  testTitleClassName,
  dialogMaxWidthClassName = "max-w-3xl",
  reportedByPlaceholder,
  verifiedByPlaceholder,
  markCompleteClassName = "bg-success-600 hover:bg-success-700 text-white",
  renderTest,
}: EnterResultsDialogProps<T>) {
  const { user } = useApp();
  const canWrite = user?.role !== "VIEWER";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<ResultData<T> | null>(null);

  useEffect(() => {
    apiClient
      .get<ResultData<T>>(resultsEndpoint)
      .then((d) => {
        if (d.success) setResult(d.data);
        else toast.error(d.error ?? "Failed to load results");
      })
      .finally(() => setLoading(false));
  }, [resultsEndpoint]);

  function setField<K extends keyof ResultData<T>>(
    key: K,
    val: ResultData<T>[K],
  ) {
    setResult((prev) => (prev ? { ...prev, [key]: val } : prev));
  }

  function updateTest(idx: number, patch: Partial<T>) {
    setResult((prev) => {
      if (!prev) return prev;
      const tests = prev.tests.map((t, i) =>
        i === idx ? { ...t, ...patch } : t,
      );
      return { ...prev, tests };
    });
  }

  async function handleSave(markComplete: boolean) {
    if (!result) return;
    setSaving(true);
    try {
      const res = await apiClient.post<ResultData<T>>(resultsEndpoint, {
        ...result,
        status: markComplete ? "completed" : result.status,
      });
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

  const metaInp =
    "h-7 text-xs md:text-xs border border-gray-200 rounded px-2 w-full bg-white focus-visible:border-primary-400 focus-visible:ring-1 focus-visible:ring-primary-100";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div
        className={`bg-white rounded-xl shadow-2xl w-full ${dialogMaxWidthClassName} max-h-[90vh] flex flex-col`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2">
            <Icon className={iconClassName} />
            <div>
              <p className="text-sm font-semibold text-gray-800">
                Enter Results — {billNo}
              </p>
              <p className="text-2xs text-gray-400">
                {patientName ?? "—"} · {billDate} · {itemCount} test
                {itemCount !== 1 ? "s" : ""}
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
              <Loader2 className={loaderClassName} />
            </div>
          ) : !result ? null : (
            <>
              {/* Meta */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-2xs font-semibold text-gray-500 uppercase mb-1">
                    Report Date
                  </label>
                  <Input
                    type="date"
                    value={result.reportDate}
                    onChange={(e) => setField("reportDate", e.target.value)}
                    disabled={!canWrite}
                    className={metaInp}
                  />
                </div>
                <div>
                  <label className="block text-2xs font-semibold text-gray-500 uppercase mb-1">
                    Reported By
                  </label>
                  <Input
                    type="text"
                    placeholder={reportedByPlaceholder}
                    value={result.reportedByName}
                    onChange={(e) => setField("reportedByName", e.target.value)}
                    disabled={!canWrite}
                    className={metaInp}
                  />
                </div>
                <div>
                  <label className="block text-2xs font-semibold text-gray-500 uppercase mb-1">
                    Verified By
                  </label>
                  <Input
                    type="text"
                    placeholder={verifiedByPlaceholder}
                    value={result.verifiedByName}
                    onChange={(e) => setField("verifiedByName", e.target.value)}
                    disabled={!canWrite}
                    className={metaInp}
                  />
                </div>
              </div>

              {/* Tests */}
              {result.tests.map((test, ti) => (
                <div
                  key={ti}
                  className="border border-gray-200 rounded-xl overflow-hidden"
                >
                  <div className={testHeaderClassName}>
                    <p className={testTitleClassName}>{test.testName}</p>
                  </div>
                  {renderTest(
                    test,
                    ti,
                    (patch) => updateTest(ti, patch),
                    canWrite,
                  )}
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
            onClick={() => result && onPrint(result)}
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
                className={markCompleteClassName}
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Icon className="w-3.5 h-3.5" />
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
