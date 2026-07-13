"use client";

import { useEffect, useState, useRef } from "react";
import { useApiQuery } from "@/lib/useApiQuery";
import { toast } from "sonner";
import { useApp, useCurrency } from "@/lib/context";
import { apiClient } from "@/lib/apiClient";
import { formatDateTime } from "@/lib/format";
import { Plus, X, Search, Printer, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useDoctors } from "@/lib/lookups";
import type {
  PatientOption,
  DiagnosticTest,
  TestRow,
  DiagnosticBill,
  BillReceiptData,
} from "@/lib/types/diagnostics";

export interface GenerateBillDialogProps {
  onClose: () => void;
  onSaved: (b: DiagnosticBill) => void;
  clinicName: string;
  clinicAddress?: string;
  clinicPhone?: string;
  logoUrl?: string;
  initialPatient?: PatientOption;
  /** e.g. "/api/dashboard/radiology/tests" */
  testsEndpoint: string;
  /** React Query cache key for the tests lookup, e.g. "radiology-tests" */
  testsQueryKey: string;
  /** e.g. "/api/dashboard/radiology/bills" */
  billsEndpoint: string;
  printReceipt: (data: BillReceiptData) => void;
  /**
   * Pathology-style extras: a "New Patient" button and an "Apply TPA"
   * checkbox in the top bar, a Prescription No search field (top bar,
   * separate from Case ID), and a dedicated Case ID field in the info bar.
   * Radiology doesn't have these — its top-bar search box doubles as Case ID.
   */
  extendedPatientBar?: boolean;
}

export function GenerateBillDialog({
  onClose,
  onSaved,
  clinicName,
  clinicAddress,
  clinicPhone,
  logoUrl,
  initialPatient,
  testsEndpoint,
  testsQueryKey,
  billsEndpoint,
  printReceipt,
  extendedPatientBar = false,
}: GenerateBillDialogProps) {
  const { tenant } = useApp();
  const { sym } = useCurrency();
  const now = new Date();
  const dateLabel =
    now.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }) +
    " " +
    now
      .toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
      .toUpperCase();

  const [patientQuery, setPatientQuery] = useState("");
  const [patientOptions, setPatientOptions] = useState<PatientOption[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientOption | null>(
    initialPatient ?? null,
  );
  const [showPatientDrop, setShowPatientDrop] = useState(false);
  const patientRef = useRef<HTMLDivElement>(null);

  const { data: testsData } = useApiQuery<{ tests: DiagnosticTest[] }>(
    [testsQueryKey],
    testsEndpoint,
    { staleTime: 5 * 60 * 1000 },
  );
  const tests = testsData?.tests ?? [];
  const { data: doctors = [] } = useDoctors();

  const [caseId, setCaseId] = useState("");
  const [prescriptionNo, setPrescriptionNo] = useState("");
  const [applyTpa, setApplyTpa] = useState(false);
  const [rows, setRows] = useState<TestRow[]>([]);
  const [referralDoctor, setReferralDoctor] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [note, setNote] = useState("");
  const [previousReportValue, setPreviousReportValue] = useState("");
  const [discountAmt, setDiscountAmt] = useState("");
  const [discountPct, setDiscountPct] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [paidAmount, setPaidAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const subtotal = rows.reduce((s, r) => s + r.amount, 0);
  const taxTotal = rows.reduce((s, r) => s + (r.charge * r.tax) / 100, 0);
  const disc = Number(discountAmt) || 0;
  const netAmount = Math.max(0, subtotal - disc);

  function onDiscAmtChange(v: string) {
    setDiscountAmt(v);
    if (subtotal > 0 && v !== "")
      setDiscountPct(((Number(v) / subtotal) * 100).toFixed(2));
    else setDiscountPct("");
  }
  function onDiscPctChange(v: string) {
    setDiscountPct(v);
    if (subtotal > 0 && v !== "")
      setDiscountAmt(((Number(v) / 100) * subtotal).toFixed(2));
    else setDiscountAmt("");
  }

  useEffect(() => {
    if (patientQuery.length < 2) {
      setPatientOptions([]);
      setShowPatientDrop(false);
      return;
    }
    const t = setTimeout(async () => {
      const res = await apiClient.get<{
        patients: {
          _id: string;
          name: string;
          uhid?: string;
          age?: number;
          gender?: string;
        }[];
      }>(
        `/api/dashboard/patients?search=${encodeURIComponent(patientQuery)}&limit=10`,
      );
      if (res.success) {
        const list = (res.data?.patients ?? []).map((p) => ({
          id: p._id,
          name: p.name,
          code: p.uhid,
          age: p.age,
          gender: p.gender,
        }));
        setPatientOptions(list);
        setShowPatientDrop(list.length > 0);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [patientQuery]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        patientRef.current &&
        !patientRef.current.contains(e.target as Node)
      ) {
        setShowPatientDrop(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function addRow() {
    setRows((prev) => [
      ...prev,
      {
        testId: "",
        testName: "",
        reportDays: 0,
        reportDate: "",
        tax: 0,
        charge: 0,
        amount: 0,
      },
    ]);
  }

  function pickTest(idx: number, testId: string) {
    const t = tests.find((x) => x._id === testId);
    if (!t) return;
    if (rows.some((r, i) => i !== idx && r.testId === testId)) {
      toast.error("Test already added");
      return;
    }
    setRows((prev) =>
      prev.map((r, i) =>
        i === idx
          ? {
              testId: t._id,
              testName: t.name,
              reportDays: t.reportDays,
              reportDate: r.reportDate,
              tax: t.tax,
              charge: t.standardCharge,
              amount: t.amount,
            }
          : r,
      ),
    );
  }

  function setReportDate(idx: number, date: string) {
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, reportDate: date } : r)),
    );
  }

  function removeRow(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSave(print = false) {
    if (!selectedPatient) {
      toast.error("Select a patient");
      return;
    }
    if (!rows.length || rows.every((r) => !r.testId)) {
      toast.error("Add at least one test");
      return;
    }
    const validRows = rows.filter((r) => r.testId);
    setSubmitting(true);
    try {
      const res = await apiClient.post<DiagnosticBill>(billsEndpoint, {
        patientId: selectedPatient.id,
        caseId: caseId || undefined,
        referenceDoctor: doctorName || referralDoctor || undefined,
        previousReportValue: previousReportValue || undefined,
        note: note || undefined,
        ...(extendedPatientBar ? { applyTpa } : {}),
        items: validRows.map((r) => ({
          testId: r.testId,
          testName: r.testName,
          reportDate: r.reportDate || undefined,
          charge: r.charge,
          tax: r.tax,
          amount: r.amount,
        })),
        discount: disc,
        paidAmount: Number(paidAmount) || 0,
        paymentMode,
      });
      if (!res.success) {
        toast.error(res.error ?? "Failed");
        return;
      }
      toast.success(`Bill ${res.data.billNo} generated`);
      const bill = res.data;
      onSaved(bill);
      if (print) {
        const totalTax = validRows.reduce(
          (s, r) => s + (r.charge * r.tax) / 100,
          0,
        );
        printReceipt({
          billNo: bill.billNo,
          billDate: bill.createdAt ? formatDateTime(bill.createdAt) : bill.billDate,
          caseId: bill.caseId,
          patientName: selectedPatient.name,
          uhid: selectedPatient.code,
          referenceDoctor: bill.referenceDoctor,
          note: bill.note,
          previousReportValue: bill.previousReportValue,
          items: bill.items,
          totalAmount: bill.amount,
          discountAmount: bill.discount,
          taxAmount: totalTax,
          netAmount: bill.netAmount,
          paidAmount: bill.paidAmount,
          balance: bill.balance,
          paymentMode: bill.paymentMode,
          clinicName,
          clinicAddress,
          clinicPhone,
          logoUrl,
          printLayouts: tenant?.printLayouts,
          printShowLogo: tenant?.printShowLogo,
          currencySymbol: sym,
        });
      }
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  const inp =
    "h-8 text-xs md:text-xs border border-gray-300 rounded px-2 w-full bg-white focus-visible:border-primary-400 focus-visible:ring-0";
  const ro =
    "h-8 text-xs md:text-xs border border-gray-200 rounded px-2 w-full bg-gray-100 text-gray-500 cursor-default focus-visible:ring-0";
  const lbl = "text-xs text-gray-600 mb-0.5 block";

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2">
      <div
        className="bg-white w-full max-w-5xl flex flex-col rounded shadow-2xl"
        style={{ maxHeight: "95vh" }}
      >
        {/* Top bar */}
        <div className="bg-primary-600 flex items-center gap-2 px-3 py-2 shrink-0">
          <div className="relative flex-1 min-w-0" ref={patientRef}>
            <div className="flex items-center gap-0 border border-white/40 rounded bg-white/10">
              <input
                value={
                  selectedPatient
                    ? selectedPatient.name +
                      (selectedPatient.code ? ` (${selectedPatient.code})` : "")
                    : patientQuery
                }
                onChange={(e) => {
                  setSelectedPatient(null);
                  setPatientQuery(e.target.value);
                }}
                onFocus={() => {
                  if (patientOptions.length > 0) setShowPatientDrop(true);
                }}
                placeholder="Select Patient…"
                className="h-8 text-xs bg-transparent text-white placeholder-white/60 outline-none flex-1 px-3"
              />
              <div className="px-2 text-white/60">▾</div>
            </div>
            {showPatientDrop && patientOptions.length > 0 && (
              <div className="absolute z-50 top-full mt-1 left-0 w-72 bg-white border border-gray-200 rounded shadow-lg max-h-52 overflow-y-auto">
                {patientOptions.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedPatient(p);
                      setPatientQuery("");
                      setShowPatientDrop(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-primary-50 text-gray-800"
                  >
                    <span className="font-medium">{p.name}</span>
                    {p.code ? (
                      <span className="text-gray-400 ml-1">({p.code})</span>
                    ) : null}
                    {p.age ? (
                      <span className="text-gray-500 ml-1.5">{p.age} yr</span>
                    ) : null}
                    {p.gender ? (
                      <span className="text-gray-400 ml-1">· {p.gender}</span>
                    ) : null}
                  </button>
                ))}
              </div>
            )}
          </div>

          {extendedPatientBar && (
            <Button
              size="sm"
              className="bg-white text-primary-700 hover:bg-primary-50 shrink-0"
            >
              <Plus className="w-3 h-3" /> New Patient
            </Button>
          )}

          <div className="flex items-center gap-1 border border-white/40 rounded bg-white/10 h-8 px-2 w-44 shrink-0">
            <input
              value={extendedPatientBar ? prescriptionNo : caseId}
              onChange={(e) =>
                extendedPatientBar
                  ? setPrescriptionNo(e.target.value)
                  : setCaseId(e.target.value)
              }
              placeholder={extendedPatientBar ? "Prescription No" : "Case ID"}
              className="bg-transparent text-xs text-white placeholder-white/60 outline-none flex-1"
            />
            <Search className="w-3.5 h-3.5 text-white/60 shrink-0" />
          </div>

          {extendedPatientBar && (
            <label className="flex items-center gap-1.5 text-xs text-white cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={applyTpa}
                onChange={(e) => setApplyTpa(e.target.checked)}
                className="w-3.5 h-3.5 rounded accent-white"
              />
              Apply TPA
            </label>
          )}

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/10 shrink-0"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Info bar */}
        <div className="bg-gray-100 border-b border-gray-300 flex items-center gap-6 px-4 py-1.5 text-xs shrink-0">
          <span className="font-medium text-gray-700">
            Bill No <span className="text-gray-400 font-normal ml-1">Auto</span>
          </span>
          {extendedPatientBar && (
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-700">Case ID</span>
              <Input
                value={caseId}
                onChange={(e) => setCaseId(e.target.value)}
                className="h-6 text-xs md:text-xs border border-gray-300 rounded px-2 w-28 bg-white focus-visible:border-primary-400 focus-visible:ring-0"
              />
            </div>
          )}
          <span className="ml-auto text-gray-500">
            Date{" "}
            <span className="text-gray-700 font-medium ml-1">{dateLabel}</span>
          </span>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-4">
          {/* Test rows */}
          <div>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border border-gray-200">
                  <th className="text-left px-3 py-2 font-medium text-gray-600 border-r border-gray-200">
                    Test Name <span className="text-danger-500">*</span>
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600 border-r border-gray-200 w-28">
                    Report Days
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600 border-r border-gray-200 w-36">
                    Report Date{" "}
                    {extendedPatientBar && (
                      <span className="text-danger-500">*</span>
                    )}
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600 border-r border-gray-200 w-24">
                    Tax
                  </th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600 w-32">
                    Amount ({sym})
                  </th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="border border-gray-200 border-t-0">
                    <td className="px-2 py-1.5 border-r border-gray-200">
                      <SearchableSelect
                        value={row.testId}
                        onValueChange={(v) => pickTest(i, v)}
                        options={tests.map((t) => ({
                          value: t._id,
                          label: t.name,
                        }))}
                        placeholder="Select"
                        clearable={false}
                        triggerClassName="h-8 text-xs px-2"
                      />
                    </td>
                    <td className="px-2 py-1.5 border-r border-gray-200">
                      <Input
                        value={row.reportDays || ""}
                        readOnly
                        className={ro}
                      />
                    </td>
                    <td className="px-2 py-1.5 border-r border-gray-200">
                      <Input
                        type="date"
                        value={row.reportDate}
                        onChange={(e) => setReportDate(i, e.target.value)}
                        className={inp}
                      />
                    </td>
                    <td className="px-2 py-1.5 border-r border-gray-200">
                      <div className="flex items-center gap-1">
                        <Input
                          value={row.tax || ""}
                          readOnly
                          className={ro + " flex-1"}
                        />
                        <span className="text-gray-400 text-xs">%</span>
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <Input
                        value={row.amount ? row.amount.toFixed(2) : ""}
                        readOnly
                        className={ro + " text-right"}
                      />
                    </td>
                    <td className="px-1 py-1.5 text-center">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => removeRow(i)}
                        className="text-danger-400 hover:text-danger-600 hover:bg-danger-50"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Button
              size="xs"
              onClick={addRow}
              className="mt-2 bg-primary-600 hover:bg-primary-700"
            >
              <Plus className="w-3 h-3" /> Add
            </Button>
          </div>

          {/* Bottom two-column */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <div>
                <label className={lbl}>Referral Doctor</label>
                <Input
                  value={referralDoctor}
                  onChange={(e) => setReferralDoctor(e.target.value)}
                  className={inp}
                />
              </div>
              <div>
                <label className={lbl}>Doctor Name</label>
                <SearchableSelect
                  value={doctorName}
                  onValueChange={setDoctorName}
                  options={doctors.map((d) => ({
                    value: d.name,
                    label: d.name,
                  }))}
                  placeholder="Select doctor"
                  emptyText="No doctors found — add in HR"
                  triggerClassName="h-8 text-xs px-2"
                />
              </div>
              <div>
                <label className={lbl}>Note</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className="text-xs border border-gray-300 rounded px-2 py-1.5 w-full focus:outline-none focus:border-primary-400 bg-white resize-none"
                />
              </div>
              <div>
                <label className={lbl}>Previous Report Value</label>
                <Input
                  value={previousReportValue}
                  onChange={(e) => setPreviousReportValue(e.target.value)}
                  className={inp}
                />
              </div>
            </div>

            <div className="space-y-0">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-xs text-gray-600">Total ({sym})</span>
                <span className="text-sm font-bold text-gray-900 w-36 text-right">
                  {subtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100 gap-2">
                <span className="text-xs text-gray-600 shrink-0">
                  Discount ({sym})
                </span>
                <div className="flex items-center gap-1 ml-auto">
                  <Input
                    type="number"
                    min="0"
                    value={discountAmt}
                    onChange={(e) => onDiscAmtChange(e.target.value)}
                    className="h-7 text-xs md:text-xs border border-gray-300 rounded px-2 w-24 text-right focus-visible:border-primary-400 focus-visible:ring-0"
                  />
                  <span className="text-xs text-gray-400 shrink-0">
                    Discount %
                  </span>
                  <Input
                    type="number"
                    min="0"
                    value={discountPct}
                    onChange={(e) => onDiscPctChange(e.target.value)}
                    className="h-7 text-xs md:text-xs border border-gray-300 rounded px-2 w-20 text-right focus-visible:border-primary-400 focus-visible:ring-0"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-xs text-gray-600">Tax ({sym})</span>
                <span className="text-sm font-bold text-gray-900 w-36 text-right">
                  {taxTotal.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-xs text-gray-600">
                  Net Amount ({sym})
                </span>
                <span className="text-sm font-bold text-gray-900 w-36 text-right">
                  {netAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex items-end gap-3 pt-3">
                <div className="flex-1">
                  <label className={lbl}>Payment Mode</label>
                  <SearchableSelect
                    value={paymentMode}
                    onValueChange={setPaymentMode}
                    options={["Cash", "Online", "Card", "Cheque", "UPI"].map(
                      (m) => ({ value: m, label: m }),
                    )}
                    placeholder="Payment mode"
                    clearable={false}
                    triggerClassName="h-8 text-xs px-2"
                  />
                </div>
                <div className="flex-1">
                  <label className={lbl}>
                    Amount ({sym}) <span className="text-danger-500">*</span>
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    className={inp}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-4 py-2.5 flex justify-end gap-2 shrink-0 bg-gray-50">
          <Button
            variant="outline"
            className="border-primary-600 text-primary-600 hover:bg-primary-50 hover:text-primary-700"
            onClick={() => handleSave(true)}
            disabled={submitting}
          >
            <Printer className="w-3.5 h-3.5" /> Save &amp; Print
          </Button>
          <Button
            className="bg-primary-600 hover:bg-primary-700"
            onClick={() => handleSave(false)}
            disabled={submitting}
          >
            <CheckCircle className="w-3.5 h-3.5" />{" "}
            {submitting ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
