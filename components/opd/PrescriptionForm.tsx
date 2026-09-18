"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { X, Plus, Trash2, Printer, Loader2 } from "lucide-react";
import { printPrescription } from "./PrescriptionPrinter";
import { apiClient } from "@/lib/apiClient";
import { useApp } from "@/lib/context";
import { useMedicines, useMedicineDosages, usePharmacyMasters } from "@/lib/lookups";
import type { OpdPrescription } from "./types";

// ── Types ─────────────────────────────────────────────────────────────────

interface MedicineLine {
  category: string;
  name: string;
  dose: string;
  doseInterval: string;
  doseDuration: string;
  quantity: string;
  instruction: string;
}

interface VitalsForm {
  temperature: string;
  bpSystolic: string;
  bpDiastolic: string;
  pulseRate: string;
  spo2: string;
  respiratoryRate: string;
  rbs: string;
  weight: string;
}

const EMPTY_VITALS: VitalsForm = {
  temperature: "",
  bpSystolic: "",
  bpDiastolic: "",
  pulseRate: "",
  spo2: "",
  respiratoryRate: "",
  rbs: "",
  weight: "",
};

/** Shape returned by GET /api/dashboard/opd/[id]/vitals. */
interface VisitVital {
  recordedAt: string;
  temperature?: number;
  bpSystolic?: number;
  bpDiastolic?: number;
  pulseRate?: number;
  spo2?: number;
  respiratoryRate?: number;
  rbs?: number;
  weight?: number;
}

export interface OpdVisitForPrescription {
  _id: string;
  opdNumber: number;
  visitDate: string;
  createdAt?: string;
  caseNumber?: string;
  chiefComplaint?: string;
  patientId: {
    _id: string;
    name: string;
    age: number;
    uhid?: number;
    gender?: string;
    phone?: string;
    address?: string;
    bloodGroup?: string;
    allergies?: string;
    ageMonths?: number;
    ageDays?: number;
    dateOfBirth?: string;
  } | null;
  doctorId: { name: string; specialization: string } | null;
}

// ── Simple rich-text toolbar ──────────────────────────────────────────────

function RichText({ placeholder }: { placeholder?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  function exec(cmd: string, val?: string) {
    ref.current?.focus();
    document.execCommand(cmd, false, val ?? undefined);
  }

  const btnCls =
    "px-2 py-0.5 text-xs rounded hover:bg-gray-200 transition-colors";

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center gap-0.5 px-2 py-1 bg-gray-50 border-b border-gray-200 flex-wrap">
        <span className="text-xs text-gray-400 mr-1">A</span>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            exec("bold");
          }}
          className={`${btnCls} font-bold`}
        >
          Bold
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            exec("italic");
          }}
          className={`${btnCls} italic`}
        >
          Italic
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            exec("underline");
          }}
          className={`${btnCls} underline`}
        >
          Underline
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            exec("fontSize", "1");
          }}
          className={`${btnCls}`}
        >
          Small
        </button>
        <span className="w-px h-4 bg-gray-300 mx-1" />
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            exec("formatBlock", "blockquote");
          }}
          className={btnCls}
        >
          ❝
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            exec("insertUnorderedList");
          }}
          className={btnCls}
        >
          ≡
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            exec("insertOrderedList");
          }}
          className={btnCls}
        >
          ⊞
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            exec("indent");
          }}
          className={btnCls}
        >
          ⇥
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            exec("outdent");
          }}
          className={btnCls}
        >
          ⇤
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            exec("removeFormat");
          }}
          className={btnCls}
        >
          ↺
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        className="min-h-16 p-2.5 text-sm focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-gray-300"
      />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export function PrescriptionForm({
  visit,
  onClose,
  clinicName,
  clinicAddress,
  clinicPhone,
  logoUrl,
}: {
  visit: OpdVisitForPrescription;
  onClose: () => void;
  clinicName: string;
  clinicAddress?: string;
  clinicPhone?: string;
  logoUrl?: string;
}) {
  const { tenant } = useApp();
  const headerRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);

  const [vitals, setVitals] = useState<VitalsForm>(EMPTY_VITALS);
  const [medicines, setMedicines] = useState<MedicineLine[]>([
    {
      category: "",
      name: "",
      dose: "",
      doseInterval: "",
      doseDuration: "",
      quantity: "",
      instruction: "",
    },
  ]);
  const [chiefComplaint, setChiefComplaint] = useState(
    visit.chiefComplaint ?? "",
  );
  const [pastHistory, setPastHistory] = useState("");
  const [advice, setAdvice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(true);

  // ── Load any already-saved prescription + latest vitals for this visit ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingExisting(true);
      try {
        const [presRes, vitalsRes] = await Promise.all([
          apiClient.get<OpdPrescription | null>(
            `/api/dashboard/prescription?opdVisitId=${visit._id}`,
          ),
          apiClient.get<VisitVital[]>(
            `/api/dashboard/opd/${visit._id}/vitals`,
          ),
        ]);
        if (cancelled) return;

        if (presRes.success && presRes.data) {
          const p = presRes.data;
          setExistingId(p._id);
          setChiefComplaint(p.chiefComplaint ?? visit.chiefComplaint ?? "");
          setPastHistory(p.pastHistory ?? "");
          setAdvice(p.advice ?? "");
          if (p.medicines?.length) {
            setMedicines(
              p.medicines.map((m) => ({
                category: m.category ?? "",
                name: m.name ?? "",
                dose: m.dose ?? "",
                doseInterval: m.doseInterval ?? "",
                doseDuration: m.doseDuration ?? "",
                quantity: m.quantity ?? "",
                instruction: m.instruction ?? "",
              })),
            );
          }
          if (headerRef.current) headerRef.current.innerHTML = p.headerNote ?? "";
          if (footerRef.current) footerRef.current.innerHTML = p.footerNote ?? "";
        }

        if (vitalsRes.success && vitalsRes.data?.length) {
          const latest = vitalsRes.data[vitalsRes.data.length - 1];
          const str = (n?: number) => (n != null ? String(n) : "");
          setVitals({
            temperature: str(latest.temperature),
            bpSystolic: str(latest.bpSystolic),
            bpDiastolic: str(latest.bpDiastolic),
            pulseRate: str(latest.pulseRate),
            spo2: str(latest.spo2),
            respiratoryRate: str(latest.respiratoryRate),
            rbs: str(latest.rbs),
            weight: str(latest.weight),
          });
        }
      } finally {
        if (!cancelled) setLoadingExisting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visit._id]);

  // ── Options from configurable pharmacy settings (cached lookups) ─────────
  const { data: categoryMasters = [] } = usePharmacyMasters("category");
  const { data: medicineList = [] } = useMedicines();
  const { data: doses = [] } = useMedicineDosages();
  const { data: intervalMasters = [] } = usePharmacyMasters("dose_interval");
  const { data: durationMasters = [] } = usePharmacyMasters("dose_duration");

  const categoryOptions = categoryMasters.map((c) => ({
    value: c.name,
    label: c.name,
  }));
  const intervalOptions = intervalMasters.map((v) => ({
    value: v.name,
    label: v.name,
  }));
  const durationOptions = durationMasters.map((v) => ({
    value: v.name,
    label: v.name,
  }));

  function medicineOptionsFor(category: string) {
    const scoped = category
      ? medicineList.filter((x) => x.category === category)
      : medicineList;
    return scoped.map((x) => ({ value: x.name, label: x.name, sub: x.category }));
  }

  function doseOptionsFor(category: string) {
    const scoped = category
      ? doses.filter((d) => d.category === category)
      : doses;
    const labels = (scoped.length ? scoped : doses).map((d) =>
      d.unit ? `${d.dosage} ${d.unit}` : d.dosage,
    );
    return [...new Set(labels)].map((l) => ({ value: l, label: l }));
  }

  function addMedicine() {
    setMedicines((p) => [
      ...p,
      {
        category: "",
        name: "",
        dose: "",
        doseInterval: "",
        doseDuration: "",
        quantity: "",
        instruction: "",
      },
    ]);
  }
  function removeMedicine(i: number) {
    setMedicines((p) => p.filter((_, idx) => idx !== i));
  }
  function updateMed(i: number, field: keyof MedicineLine, v: string) {
    setMedicines((p) =>
      p.map((m, idx) => (idx === i ? { ...m, [field]: v } : m)),
    );
  }

  function toVitalNumbers() {
    const num = (v: string) => (v.trim() ? Number(v) : undefined);
    return {
      temperature: num(vitals.temperature),
      bpSystolic: num(vitals.bpSystolic),
      bpDiastolic: num(vitals.bpDiastolic),
      pulseRate: num(vitals.pulseRate),
      spo2: num(vitals.spo2),
      respiratoryRate: num(vitals.respiratoryRate),
      rbs: num(vitals.rbs),
      weight: num(vitals.weight),
    };
  }

  async function handleSubmit(print = false) {
    setSubmitting(true);
    try {
      const headerNote = headerRef.current?.innerHTML ?? "";
      const footerNote = footerRef.current?.innerHTML ?? "";
      const filledMeds = medicines.filter((m) => m.name.trim());
      const vitalNumbers = toVitalNumbers();
      const hasVital = Object.values(vitalNumbers).some((v) => v != null);

      // Update the existing prescription for this visit if one was loaded,
      // instead of creating a duplicate every time Save is clicked.
      const res = existingId
        ? await apiClient.patch(`/api/dashboard/prescription/${existingId}`, {
            headerNote,
            chiefComplaint: chiefComplaint.trim() || undefined,
            pastHistory: pastHistory.trim() || undefined,
            footerNote,
            medicines: filledMeds,
            advice: advice.trim() || undefined,
          })
        : await apiClient.post("/api/dashboard/prescription", {
            opdVisitId: visit._id,
            patientId: visit.patientId?._id,
            headerNote,
            chiefComplaint: chiefComplaint.trim() || undefined,
            pastHistory: pastHistory.trim() || undefined,
            footerNote,
            findings: [],
            medicines: filledMeds,
            advice: advice.trim() || undefined,
          });
      if (!res.success) {
        toast.error(res.error);
        return;
      }

      // Vitals belong to the OPD visit's own vitals record (same one shown in
      // the OPD detail page's Vitals tab), not the prescription document —
      // save separately so they show up there too.
      if (hasVital) {
        const vitalsRes = await apiClient.post(
          `/api/dashboard/opd/${visit._id}/vitals`,
          {
            recordedAt: new Date().toISOString().slice(0, 16),
            ...vitalNumbers,
          },
        );
        if (!vitalsRes.success) {
          toast.error(vitalsRes.error ?? "Failed to save vitals");
        }
      }

      toast.success("Prescription saved");

      if (print) {
        printPrescription({
          opdNumber: visit.opdNumber,
          caseNumber: visit.caseNumber,
          visitDate: visit.visitDate,
          patientName: visit.patientId?.name ?? "",
          uhid: visit.patientId?.uhid,
          patientAge: visit.patientId?.age ?? 0,
          patientAgeMonths: visit.patientId?.ageMonths,
          patientAgeDays: visit.patientId?.ageDays,
          patientGender: visit.patientId?.gender,
          patientPhone: visit.patientId?.phone,
          patientAddress: visit.patientId?.address,
          patientBloodGroup: visit.patientId?.bloodGroup,
          patientAllergies: visit.patientId?.allergies,
          doctorName: visit.doctorId?.name,
          headerNote,
          chiefComplaint: chiefComplaint.trim() || undefined,
          pastHistory: pastHistory.trim() || undefined,
          footerNote,
          medicines: filledMeds,
          findings: [],
          vitals: hasVital ? vitalNumbers : undefined,
          advice: advice.trim() || undefined,
          clinicName,
          clinicAddress,
          clinicPhone,
          logoUrl,
          printLayouts: tenant?.printLayouts,
          printShowLogo: tenant?.printShowLogo,
          printHeaderImages: tenant?.printHeaderImages,
          printFooterContents: tenant?.printFooterContents,
          printLetterheads: tenant?.printLetterheads,
          printShowTitles: tenant?.printShowTitles,
          printTitleTexts: tenant?.printTitleTexts,
        });
      }

      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  const thCls = "text-xs font-semibold text-gray-600 pb-1";

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col overflow-hidden">
      {/* ── Top bar ── */}
      <div className="h-10 bg-primary-600 flex items-center px-4 shrink-0">
        <span className="text-white font-semibold text-sm">
          Add Prescription
        </span>
        {loadingExisting ? (
          <span className="ml-3 text-white/70 text-xs">
            Loading saved values…
          </span>
        ) : existingId ? (
          <span className="ml-3 text-white/70 text-xs">
            Editing saved prescription
          </span>
        ) : null}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          className="ml-auto text-white/80 hover:text-white hover:bg-white/10"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 min-h-0">
        {/* Main */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Header Note */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Header Note
            </p>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="flex items-center gap-0.5 px-2 py-1 bg-gray-50 border-b border-gray-200 flex-wrap">
                <span className="text-xs text-gray-400 mr-1">A</span>
                {[
                  ["Bold", "bold", "font-bold"],
                  ["Italic", "italic", "italic"],
                  ["Underline", "underline", "underline"],
                  ["Small", "fontSize:1", ""],
                ].map(([label, cmd, cls]) => (
                  <button
                    key={label}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const [c, v] = cmd.split(":");
                      headerRef.current?.focus();
                      document.execCommand(c, false, v ?? undefined);
                    }}
                    className={`px-2 py-0.5 text-xs rounded hover:bg-gray-200 ${cls}`}
                  >
                    {label}
                  </button>
                ))}
                <span className="w-px h-4 bg-gray-300 mx-1" />
                {[
                  ["❝", "formatBlock:blockquote"],
                  ["≡", "insertUnorderedList"],
                  ["⊞", "insertOrderedList"],
                  ["⇥", "indent"],
                  ["⇤", "outdent"],
                  ["↺", "removeFormat"],
                ].map(([icon, cmd]) => (
                  <button
                    key={icon}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const [c, v] = cmd.split(":");
                      headerRef.current?.focus();
                      document.execCommand(c, false, v ?? undefined);
                    }}
                    className="px-1.5 py-0.5 text-xs rounded hover:bg-gray-200"
                  >
                    {icon}
                  </button>
                ))}
              </div>
              <div
                ref={headerRef}
                contentEditable
                suppressContentEditableWarning
                className="min-h-14 p-2.5 text-sm focus:outline-none"
              />
            </div>
          </div>

          {/* Chief Complaint / Past History */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Chief Complaint (C/O)
              </p>
              <textarea
                className="w-full h-20 text-sm border border-gray-200 rounded-md px-2.5 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                placeholder="e.g. Fever, Headache, Body ache"
                value={chiefComplaint}
                onChange={(e) => setChiefComplaint(e.target.value)}
              />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Past History
              </p>
              <textarea
                className="w-full h-20 text-sm border border-gray-200 rounded-md px-2.5 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                placeholder="e.g. Diabetes, Hypertension, Past surgeries"
                value={pastHistory}
                onChange={(e) => setPastHistory(e.target.value)}
              />
            </div>
          </div>

          {/* Vitals — same record the OPD detail page's Vitals tab reads/writes */}
          <div className="rounded-lg border border-gray-200 p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Vitals
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <p className={thCls}>Temp (°F)</p>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="98.6"
                  className="h-9 text-sm"
                  value={vitals.temperature}
                  onChange={(e) =>
                    setVitals((p) => ({ ...p, temperature: e.target.value }))
                  }
                />
              </div>
              <div>
                <p className={thCls}>Pulse (bpm)</p>
                <Input
                  type="number"
                  placeholder="80"
                  className="h-9 text-sm"
                  value={vitals.pulseRate}
                  onChange={(e) =>
                    setVitals((p) => ({ ...p, pulseRate: e.target.value }))
                  }
                />
              </div>
              <div>
                <p className={thCls}>BP Systolic</p>
                <Input
                  type="number"
                  placeholder="120"
                  className="h-9 text-sm"
                  value={vitals.bpSystolic}
                  onChange={(e) =>
                    setVitals((p) => ({ ...p, bpSystolic: e.target.value }))
                  }
                />
              </div>
              <div>
                <p className={thCls}>BP Diastolic</p>
                <Input
                  type="number"
                  placeholder="80"
                  className="h-9 text-sm"
                  value={vitals.bpDiastolic}
                  onChange={(e) =>
                    setVitals((p) => ({ ...p, bpDiastolic: e.target.value }))
                  }
                />
              </div>
              <div>
                <p className={thCls}>SpO₂ (%)</p>
                <Input
                  type="number"
                  placeholder="98"
                  className="h-9 text-sm"
                  value={vitals.spo2}
                  onChange={(e) =>
                    setVitals((p) => ({ ...p, spo2: e.target.value }))
                  }
                />
              </div>
              <div>
                <p className={thCls}>Resp. Rate (/min)</p>
                <Input
                  type="number"
                  placeholder="16"
                  className="h-9 text-sm"
                  value={vitals.respiratoryRate}
                  onChange={(e) =>
                    setVitals((p) => ({
                      ...p,
                      respiratoryRate: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <p className={thCls}>RBS (mg/dL)</p>
                <Input
                  type="number"
                  placeholder="120"
                  className="h-9 text-sm"
                  value={vitals.rbs}
                  onChange={(e) =>
                    setVitals((p) => ({ ...p, rbs: e.target.value }))
                  }
                />
              </div>
              <div>
                <p className={thCls}>Weight (kg)</p>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="70"
                  className="h-9 text-sm"
                  value={vitals.weight}
                  onChange={(e) =>
                    setVitals((p) => ({ ...p, weight: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>

          {/* Medicines */}
          <div className="rounded-lg border border-gray-200 p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Medicines
            </p>
            <div className="grid grid-cols-14 gap-2 mb-1">
              {[
                ["Medicine Category", "col-span-2"],
                ["Medicine", "col-span-2"],
                ["Dose", "col-span-2"],
                ["Dose Interval", "col-span-2"],
                ["Dose Duration", "col-span-2"],
                ["Quantity", "col-span-1"],
                ["Instruction", "col-span-2"],
              ].map(([h, span]) => (
                <p key={h} className={`${thCls} ${span}`}>
                  {h}
                </p>
              ))}
            </div>
            {medicines.map((m, i) => (
              <div key={i} className="grid grid-cols-14 gap-2 items-center">
                <div className="col-span-2">
                  <SearchableSelect
                    value={m.category}
                    onValueChange={(v) => {
                      setMedicines((p) =>
                        p.map((med, idx) =>
                          idx === i
                            ? {
                                ...med,
                                category: v,
                                // clear medicine if it doesn't belong to the new category
                                name:
                                  v &&
                                  !medicineList.some(
                                    (x) => x.name === med.name && x.category === v,
                                  )
                                    ? ""
                                    : med.name,
                              }
                            : med,
                        ),
                      );
                    }}
                    options={categoryOptions}
                    placeholder="Category"
                    triggerClassName="h-9 text-sm"
                    emptyText="No categories. Add in Settings → Pharmacy."
                  />
                </div>
                <div className="col-span-2">
                  <SearchableSelect
                    value={m.name}
                    onValueChange={(v) => {
                      const med = medicineList.find((x) => x.name === v);
                      setMedicines((p) =>
                        p.map((line, idx) =>
                          idx === i
                            ? {
                                ...line,
                                name: v,
                                category: line.category || med?.category || "",
                              }
                            : line,
                        ),
                      );
                    }}
                    options={medicineOptionsFor(m.category)}
                    placeholder="Medicine"
                    triggerClassName="h-9 text-sm"
                    emptyText="No medicines found. Add in Pharmacy."
                  />
                </div>
                <div className="col-span-2">
                  <SearchableSelect
                    value={m.dose}
                    onValueChange={(v) => updateMed(i, "dose", v)}
                    options={doseOptionsFor(m.category)}
                    placeholder="Dose"
                    triggerClassName="h-9 text-sm"
                    emptyText="No dosages. Add in Settings → Pharmacy."
                  />
                </div>
                <div className="col-span-2">
                  <SearchableSelect
                    value={m.doseInterval}
                    onValueChange={(v) => updateMed(i, "doseInterval", v)}
                    options={intervalOptions}
                    placeholder="Interval"
                    triggerClassName="h-9 text-sm"
                    emptyText="No intervals. Add in Settings → Pharmacy."
                  />
                </div>
                <div className="col-span-2">
                  <SearchableSelect
                    value={m.doseDuration}
                    onValueChange={(v) => updateMed(i, "doseDuration", v)}
                    options={durationOptions}
                    placeholder="Duration"
                    triggerClassName="h-9 text-sm"
                    emptyText="No durations. Add in Settings → Pharmacy."
                  />
                </div>
                <div className="col-span-1">
                  <Input
                    type="number"
                    min="1"
                    className="h-9 text-sm"
                    placeholder="Qty"
                    value={m.quantity}
                    onChange={(e) => updateMed(i, "quantity", e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    className="h-9 text-sm"
                    placeholder="Instruction"
                    value={m.instruction}
                    onChange={(e) =>
                      updateMed(i, "instruction", e.target.value)
                    }
                  />
                </div>
                <div className="col-span-1 flex justify-center">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => removeMedicine(i)}
                    className="text-danger-400 hover:text-danger-600 hover:bg-danger-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            <Button
              size="sm"
              type="button"
              onClick={addMedicine}
              className="h-8 text-xs gap-1.5 bg-primary-600 hover:bg-primary-700 mt-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add Medicine
            </Button>
          </div>

          {/* Advice */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Advice
            </p>
            <textarea
              className="w-full h-20 text-sm border border-gray-200 rounded-md px-2.5 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              placeholder="e.g. CBC, LFT, Urine RE, USG Whole Abdomen"
              value={advice}
              onChange={(e) => setAdvice(e.target.value)}
            />
          </div>

          {/* Footer Note */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Footer Note
            </p>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="flex items-center gap-0.5 px-2 py-1 bg-gray-50 border-b border-gray-200 flex-wrap">
                <span className="text-xs text-gray-400 mr-1">A</span>
                {[
                  ["Bold", "bold", "font-bold"],
                  ["Italic", "italic", "italic"],
                  ["Underline", "underline", "underline"],
                  ["Small", "fontSize:1", ""],
                ].map(([label, cmd, cls]) => (
                  <button
                    key={label}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const [c, v] = cmd.split(":");
                      footerRef.current?.focus();
                      document.execCommand(c, false, v ?? undefined);
                    }}
                    className={`px-2 py-0.5 text-xs rounded hover:bg-gray-200 ${cls}`}
                  >
                    {label}
                  </button>
                ))}
                <span className="w-px h-4 bg-gray-300 mx-1" />
                {[
                  ["❝", "formatBlock:blockquote"],
                  ["≡", "insertUnorderedList"],
                  ["⊞", "insertOrderedList"],
                  ["↺", "removeFormat"],
                ].map(([icon, cmd]) => (
                  <button
                    key={icon}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const [c, v] = cmd.split(":");
                      footerRef.current?.focus();
                      document.execCommand(c, false, v ?? undefined);
                    }}
                    className="px-1.5 py-0.5 text-xs rounded hover:bg-gray-200"
                  >
                    {icon}
                  </button>
                ))}
              </div>
              <div
                ref={footerRef}
                contentEditable
                suppressContentEditableWarning
                className="min-h-14 p-2.5 text-sm focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer bar ── */}
      <div className="h-14 bg-white border-t border-gray-200 flex items-center justify-end gap-3 px-5 shrink-0">
        <Button
          className="h-10 px-5 text-sm gap-2 bg-primary-600 hover:bg-primary-700"
          disabled={submitting || loadingExisting}
          onClick={() => handleSubmit(true)}
        >
          <Printer className="w-4 h-4" />{" "}
          {submitting ? "Saving…" : "Save & Print"}
        </Button>
        <Button
          className="h-10 px-6 text-sm bg-success-600 hover:bg-success-700"
          disabled={submitting || loadingExisting}
          onClick={() => handleSubmit(false)}
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
        </Button>
      </div>
    </div>
  );
}
