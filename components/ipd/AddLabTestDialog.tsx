"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Search, X, CheckCircle2 } from "lucide-react";
import { useCurrency } from "@/lib/context";
import { apiClient } from "@/lib/apiClient";
import { useApiQuery } from "@/lib/useApiQuery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface PathologyTestOption {
  _id: string;
  name: string;
  chargeName?: string | null;
  standardCharge: number;
  amount: number;
}

interface SelectedTest {
  test: PathologyTestOption;
  amount: string;
}

export function AddLabTestDialog({
  ipdId,
  open,
  onClose,
  onSaved,
}: {
  ipdId: string;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { fmt } = useCurrency();
  const [testSearch, setTestSearch] = useState("");
  const [selected, setSelected] = useState<SelectedTest[]>([]);
  const [labDate, setLabDate] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  // Test catalogue — only fetched once the dialog opens
  const { data: allTestsData, isFetching: loadingTests } = useApiQuery<{
    tests: PathologyTestOption[];
  }>(["pathology-tests"], "/api/dashboard/pathology/tests", {
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });
  const allTests = allTestsData?.tests ?? [];

  useEffect(() => {
    if (!open) return;
    setSelected([]);
    setTestSearch("");
    setLabDate("");
    setNote("");
  }, [open]);

  function toggleTest(t: PathologyTestOption) {
    setSelected((prev) => {
      const exists = prev.find((s) => s.test._id === t._id);
      if (exists) return prev.filter((s) => s.test._id !== t._id);
      return [
        ...prev,
        { test: t, amount: String(t.amount || t.standardCharge || 0) },
      ];
    });
  }

  function updateAmount(testId: string, val: string) {
    setSelected((prev) =>
      prev.map((s) => (s.test._id === testId ? { ...s, amount: val } : s)),
    );
  }

  async function handleAdd() {
    if (selected.length === 0) {
      toast.error("Select at least one test");
      return;
    }
    setSaving(true);
    try {
      const results = await Promise.all(
        selected.map((s) =>
          apiClient.post(`/api/dashboard/ipd/${ipdId}/lab-tests`, {
            testId: s.test._id,
            testName: s.test.name,
            categoryName: s.test.chargeName,
            amount: Number(s.amount) || 0,
            note,
            date: labDate,
          }),
        ),
      );
      const failed = results.filter((r) => !r.success);
      if (failed.length) {
        toast.error(`${failed.length} test(s) failed to add`);
      } else {
        toast.success(
          `${selected.length} test${selected.length > 1 ? "s" : ""} added`,
        );
      }
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const filteredTests = testSearch.trim()
    ? allTests.filter(
        (t) =>
          t.name.toLowerCase().includes(testSearch.toLowerCase()) ||
          (t.chargeName ?? "").toLowerCase().includes(testSearch.toLowerCase()),
      )
    : allTests;

  const selectedIds = new Set(selected.map((s) => s.test._id));
  const inp = "h-8 text-xs w-full";
  const lbl = "block text-2xs font-semibold text-gray-500 uppercase mb-1";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-none sm:w-[min(92vw,560px)] p-0 overflow-hidden gap-0">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <DialogTitle>Select Pathology Tests</DialogTitle>
        </div>

        <div className="p-5 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <Input
              value={testSearch}
              onChange={(e) => setTestSearch(e.target.value)}
              className={`${inp} pl-7`}
              placeholder="Search tests…"
              autoComplete="off"
            />
          </div>

          {/* Test list */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            {loadingTests ? (
              <div className="flex items-center justify-center h-32 text-xs text-gray-400">
                Loading tests…
              </div>
            ) : filteredTests.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-xs text-gray-400">
                {testSearch
                  ? "No tests match your search"
                  : "No pathology tests found"}
              </div>
            ) : (
              <div className="max-h-56 overflow-y-auto divide-y divide-gray-100">
                {filteredTests.map((t) => {
                  const isSelected = selectedIds.has(t._id);
                  return (
                    <button
                      key={t._id}
                      type="button"
                      onClick={() => toggleTest(t)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                        isSelected
                          ? "bg-primary-50 hover:bg-primary-100"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? "border-primary-500 bg-primary-500"
                            : "border-gray-300"
                        }`}
                      >
                        {isSelected && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate">
                          {t.name}
                        </p>
                        {t.chargeName && (
                          <p className="text-2xs text-gray-400">
                            {t.chargeName}
                          </p>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-primary-700 shrink-0">
                        {fmt(t.amount || t.standardCharge || 0)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected tests with editable amounts */}
          {selected.length > 0 && (
            <div className="space-y-2">
              <p className="text-2xs font-semibold text-gray-500 uppercase">
                Selected ({selected.length}) — adjust amounts if needed
              </p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {selected.map((s) => (
                  <div
                    key={s.test._id}
                    className="flex items-center gap-2 bg-primary-50 border border-primary-100 rounded px-2 py-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary-500 shrink-0" />
                    <span className="flex-1 text-xs font-medium text-gray-800 truncate">
                      {s.test.name}
                    </span>
                    <Input
                      type="number"
                      min={0}
                      value={s.amount}
                      onChange={(e) => updateAmount(s.test._id, e.target.value)}
                      className="h-6 w-24 text-xs text-right"
                    />
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => toggleTest(s.test)}
                      className="text-primary-400 hover:bg-primary-200"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Date + Note */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Date</label>
              <Input
                type="date"
                value={labDate}
                onChange={(e) => setLabDate(e.target.value)}
                className={inp}
              />
            </div>
            <div>
              <label className={lbl}>Note (optional)</label>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className={inp}
                placeholder="Optional note…"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 px-5 py-3 flex items-center justify-between">
          <span className="text-2xs text-gray-400">
            {selected.length === 0
              ? "No tests selected"
              : `${selected.length} test${selected.length > 1 ? "s" : ""} · Total: ${fmt(selected.reduce((s, x) => s + (Number(x.amount) || 0), 0))}`}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={saving || selected.length === 0}
            >
              {saving
                ? "Adding…"
                : `Add${selected.length > 1 ? ` ${selected.length} Tests` : " Test"}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
