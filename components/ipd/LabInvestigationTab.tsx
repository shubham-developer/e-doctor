"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { useCurrency } from "@/lib/context";
import { apiClient } from "@/lib/apiClient";
import { Plus, Trash2, FileText, Search, X, CheckCircle2 } from "lucide-react";

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

interface IpdLabTest {
  _id: string;
  testName: string;
  categoryName?: string;
  amount: number;
  date: string;
  note?: string;
  addedByName?: string;
}

export function LabInvestigationTab({ ipdId }: { ipdId: string }) {
  const { fmt } = useCurrency();
  const [labTests, setLabTests] = useState<IpdLabTest[]>([]);
  const [allTests, setAllTests] = useState<PathologyTestOption[]>([]);
  const [testSearch, setTestSearch] = useState("");
  const [selected, setSelected] = useState<SelectedTest[]>([]);
  const [labDate, setLabDate] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [loadingTests, setLoadingTests] = useState(false);

  const loadLabTests = useCallback(async () => {
    const d = await apiClient.get<IpdLabTest[]>(
      `/api/dashboard/ipd/${ipdId}/lab-tests`,
    );
    if (d.success) setLabTests(d.data);
  }, [ipdId]);

  useEffect(() => {
    loadLabTests();
  }, [loadLabTests]);

  async function loadAllTests() {
    if (allTests.length > 0) return;
    setLoadingTests(true);
    const d = await apiClient.get<{ tests: PathologyTestOption[] }>(
      `/api/dashboard/pathology/tests`,
    );
    if (d.success) setAllTests(d.data.tests ?? []);
    else toast.error("Failed to load pathology tests");
    setLoadingTests(false);
  }

  function openForm() {
    resetForm();
    setShowForm(true);
    loadAllTests();
  }

  function resetForm() {
    setSelected([]);
    setTestSearch("");
    setLabDate("");
    setNote("");
  }

  function toggleTest(t: PathologyTestOption) {
    setSelected((prev) => {
      const exists = prev.find((s) => s.test._id === t._id);
      if (exists) return prev.filter((s) => s.test._id !== t._id);
      return [...prev, { test: t, amount: String(t.amount || t.standardCharge || 0) }];
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
      await loadLabTests();
      setShowForm(false);
      resetForm();
    } finally {
      setSaving(false);
    }
  }

  async function deleteLabTest(id: string) {
    const d = await apiClient.delete(
      `/api/dashboard/ipd/${ipdId}/lab-tests/${id}`,
    );
    if (d.success) loadLabTests();
  }

  const filteredTests = testSearch.trim()
    ? allTests.filter((t) =>
        t.name.toLowerCase().includes(testSearch.toLowerCase()) ||
        (t.chargeName ?? "").toLowerCase().includes(testSearch.toLowerCase()),
      )
    : allTests;

  const selectedIds = new Set(selected.map((s) => s.test._id));
  const total = labTests.reduce((s, t) => s + t.amount, 0);

  const inp =
    "h-8 w-full px-2 text-xs border border-gray-300 rounded focus:border-primary-400 focus:ring-1 focus:ring-primary-100 outline-none bg-white";
  const lbl = "block text-2xs font-semibold text-gray-500 uppercase mb-1";

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-800">
            Total Lab Charges:
          </span>
          <span className="text-sm font-bold text-primary-700">{fmt(total)}</span>
          <span className="text-xs text-gray-400">
            (added to Charges automatically)
          </span>
        </div>
        <button
          onClick={openForm}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add Test
        </button>
      </div>

      {showForm && (
        <div className="border border-primary-200 bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-primary-50 border-b border-primary-100">
            <p className="text-xs font-semibold text-primary-700">Select Pathology Tests</p>
            <button
              onClick={() => { setShowForm(false); resetForm(); }}
              className="p-0.5 rounded hover:bg-primary-100 text-primary-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <input
                value={testSearch}
                onChange={(e) => setTestSearch(e.target.value)}
                className="h-8 w-full pl-7 pr-3 text-xs border border-gray-300 rounded focus:border-primary-400 focus:ring-1 focus:ring-primary-100 outline-none bg-white"
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
                  {testSearch ? "No tests match your search" : "No pathology tests found"}
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
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? "border-primary-500 bg-primary-500" : "border-gray-300"
                        }`}>
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-800 truncate">{t.name}</p>
                          {t.chargeName && (
                            <p className="text-2xs text-gray-400">{t.chargeName}</p>
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
                      <input
                        type="number"
                        min={0}
                        value={s.amount}
                        onChange={(e) => updateAmount(s.test._id, e.target.value)}
                        className="w-24 h-6 px-2 text-xs border border-gray-300 rounded focus:border-primary-400 outline-none bg-white text-right"
                      />
                      <button
                        onClick={() => toggleTest(s.test)}
                        className="p-0.5 rounded hover:bg-primary-200 text-primary-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Date + Note */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Date</label>
                <input
                  type="date"
                  value={labDate}
                  onChange={(e) => setLabDate(e.target.value)}
                  className={inp}
                />
              </div>
              <div>
                <label className={lbl}>Note (optional)</label>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className={inp}
                  placeholder="Optional note…"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-2xs text-gray-400">
                {selected.length === 0
                  ? "No tests selected"
                  : `${selected.length} test${selected.length > 1 ? "s" : ""} · Total: ${fmt(selected.reduce((s, x) => s + (Number(x.amount) || 0), 0))}`}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowForm(false); resetForm(); }}
                  className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  disabled={saving || selected.length === 0}
                  className="px-3 py-1.5 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50 font-medium"
                >
                  {saving ? "Adding…" : `Add${selected.length > 1 ? ` ${selected.length} Tests` : " Test"}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {labTests.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
          <FileText className="w-10 h-10 opacity-20" />
          <p className="text-sm">No lab tests added yet</p>
          <p className="text-xs">Added tests are automatically billed in Charges</p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Date
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Test
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Category
                </th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Amount
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  By
                </th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {labTests.map((t) => (
                <tr key={t._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {t.date || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-800">
                      {t.testName}
                    </p>
                    {t.note && (
                      <p className="text-xs text-gray-400">{t.note}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {t.categoryName || "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                    {fmt(t.amount)}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {t.addedByName || "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => deleteLabTest(t._id)}
                      className="p-1 rounded hover:bg-danger-50 text-gray-400 hover:text-danger-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t border-gray-200">
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-2.5 text-xs font-semibold text-gray-600 text-right uppercase tracking-wide"
                >
                  Grand Total
                </td>
                <td className="px-4 py-2.5 text-right text-sm font-bold text-primary-700">
                  {fmt(total)}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
