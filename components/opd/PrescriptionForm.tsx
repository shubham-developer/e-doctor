"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { X, Plus, Trash2, Printer, Loader2 } from "lucide-react";
import { printPrescription } from "./PrescriptionPrinter";
import { apiClient } from "@/lib/apiClient";
import { useApp } from "@/lib/context";
import {
  useMedicines,
  useMedicineDosages,
  usePharmacyMasters,
} from "@/lib/lookups";

const NOTIFICATION_ROLES = [
  "Admin",
  "Accountant",
  "Doctor",
  "Pharmacist",
  "Pathologist",
  "Radiologist",
  "Super Admin",
  "Receptionist",
  "Nurse",
];

// ── Types ─────────────────────────────────────────────────────────────────

interface MedicineLine {
  category: string;
  name: string;
  dose: string;
  doseInterval: string;
  doseDuration: string;
  instruction: string;
}

interface Finding {
  category: string;
  list: string;
  description: string;
  print: boolean;
}

export interface OpdVisitForPrescription {
  _id: string;
  opdNumber: number;
  visitDate: string;
  caseNumber?: string;
  patientId: {
    _id: string;
    name: string;
    age: number;
    patientCode?: number;
    gender?: string;
    address?: string;
    bloodGroup?: string;
    allergies?: string;
    ageMonths?: number;
    ageDays?: number;
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

  const [finding, setFinding] = useState<Finding>({
    category: "",
    list: "",
    description: "",
    print: true,
  });
  const [medicines, setMedicines] = useState<MedicineLine[]>([
    {
      category: "",
      name: "",
      dose: "",
      doseInterval: "",
      doseDuration: "",
      instruction: "",
    },
  ]);
  const [pathology, setPathology] = useState("");
  const [radiology, setRadiology] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  async function handleSubmit(print = false) {
    setSubmitting(true);
    try {
      const headerNote = headerRef.current?.innerHTML ?? "";
      const footerNote = footerRef.current?.innerHTML ?? "";
      const filledMeds = medicines.filter((m) => m.name.trim());
      const filledFind =
        finding.category || finding.description ? [finding] : [];

      const res = await apiClient.post("/api/dashboard/prescription", {
        opdVisitId: visit._id,
        patientId: visit.patientId?._id,
        headerNote,
        footerNote,
        findings: filledFind,
        medicines: filledMeds,
        pathology: pathology.trim() || undefined,
        radiology: radiology.trim() || undefined,
      });
      if (!res.success) {
        toast.error(res.error);
        return;
      }

      toast.success("Prescription saved");

      if (print) {
        printPrescription({
          opdNumber: visit.opdNumber,
          caseNumber: visit.caseNumber,
          visitDate: visit.visitDate,
          patientName: visit.patientId?.name ?? "",
          patientCode: visit.patientId?.patientCode,
          patientAge: visit.patientId?.age ?? 0,
          patientAgeMonths: visit.patientId?.ageMonths,
          patientAgeDays: visit.patientId?.ageDays,
          patientGender: visit.patientId?.gender,
          patientAddress: visit.patientId?.address,
          patientBloodGroup: visit.patientId?.bloodGroup,
          patientAllergies: visit.patientId?.allergies,
          doctorName: visit.doctorId?.name,
          headerNote,
          footerNote,
          medicines: filledMeds,
          findings: filledFind,
          clinicName,
          clinicAddress,
          clinicPhone,
          logoUrl,
          printLayouts: tenant?.printLayouts,
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
        <button
          onClick={onClose}
          className="ml-auto text-white/80 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
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

          {/* Findings */}
          <div className="rounded-lg border border-gray-200 p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Findings
            </p>
            <div className="grid grid-cols-12 gap-3 items-start">
              <div className="col-span-3">
                <p className={thCls}>Finding Category</p>
                <Input
                  className="h-9 text-sm"
                  value={finding.category}
                  onChange={(e) =>
                    setFinding((p) => ({ ...p, category: e.target.value }))
                  }
                  placeholder="Category"
                />
              </div>
              <div className="col-span-3">
                <p className={thCls}>Finding List</p>
                <Input
                  className="h-9 text-sm"
                  value={finding.list}
                  onChange={(e) =>
                    setFinding((p) => ({ ...p, list: e.target.value }))
                  }
                />
              </div>
              <div className="col-span-5">
                <p className={thCls}>Finding Description</p>
                <textarea
                  className="w-full h-20 text-sm border border-gray-200 rounded-md px-2.5 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                  value={finding.description}
                  onChange={(e) =>
                    setFinding((p) => ({ ...p, description: e.target.value }))
                  }
                />
              </div>
              <div className="col-span-1 pt-6 flex items-center gap-1.5">
                <Checkbox
                  checked={finding.print}
                  onCheckedChange={(v) =>
                    setFinding((p) => ({ ...p, print: Boolean(v) }))
                  }
                />
                <span className="text-xs text-gray-500">Print</span>
              </div>
            </div>
          </div>

          {/* Medicines */}
          <div className="rounded-lg border border-gray-200 p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Medicines
            </p>
            <div className="grid grid-cols-12 gap-2 mb-1">
              {[
                "Medicine Category",
                "Medicine",
                "Dose",
                "Dose Interval",
                "Dose Duration",
                "Instruction",
              ].map((h, i) => (
                <p
                  key={h}
                  className={`${thCls} ${i === 0 ? "col-span-2" : i === 1 ? "col-span-2" : "col-span-2"}`}
                >
                  {h}
                </p>
              ))}
            </div>
            {medicines.map((m, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
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
                    className="h-9 text-sm"
                    placeholder="Instruction"
                    value={m.instruction}
                    onChange={(e) =>
                      updateMed(i, "instruction", e.target.value)
                    }
                  />
                </div>
                <div className="col-span-1 flex justify-center">
                  <button
                    type="button"
                    onClick={() => removeMedicine(i)}
                    className="text-danger-400 hover:text-danger-600 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
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

          {/* Attachment */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Attachment
            </p>
            <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-lg p-4 text-sm text-gray-400 cursor-pointer hover:border-gray-300 hover:text-gray-500 transition-colors">
              ☁ Drop a file here or click
              <input type="file" className="hidden" multiple />
            </label>
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

        {/* ── Right sidebar ── */}
        <div className="w-64 shrink-0 border-l border-gray-200 p-4 space-y-5 overflow-y-auto bg-gray-50">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Pathology
            </p>
            <Input
              className="h-9 text-sm"
              placeholder="Select"
              value={pathology}
              onChange={(e) => setPathology(e.target.value)}
            />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Radiology
            </p>
            <Input
              className="h-9 text-sm"
              placeholder="Select"
              value={radiology}
              onChange={(e) => setRadiology(e.target.value)}
            />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Notification To
            </p>
            <div className="space-y-2">
              {NOTIFICATION_ROLES.map((role) => (
                <label
                  key={role}
                  className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer select-none"
                >
                  <Checkbox /> {role}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer bar ── */}
      <div className="h-14 bg-white border-t border-gray-200 flex items-center justify-end gap-3 px-5 shrink-0">
        <Button
          className="h-10 px-5 text-sm gap-2 bg-primary-600 hover:bg-primary-700"
          disabled={submitting}
          onClick={() => handleSubmit(true)}
        >
          <Printer className="w-4 h-4" />{" "}
          {submitting ? "Saving…" : "Save & Print"}
        </Button>
        <Button
          className="h-10 px-6 text-sm bg-success-600 hover:bg-success-700"
          disabled={submitting}
          onClick={() => handleSubmit(false)}
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
        </Button>
      </div>
    </div>
  );
}
