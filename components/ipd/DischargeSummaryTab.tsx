"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useApp } from "@/lib/context";
import { apiClient } from "@/lib/apiClient";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  printDischargeSummary,
  DischargeSummaryData,
} from "@/components/ipd/DischargeSummaryPrinter";
import type { IpdDetail } from "@/components/ipd/types";

interface DischargeSummaryFields {
  diagnosis: string;
  historyOfPresentIllness: string;
  examinationFindings: string;
  investigations: string;
  treatmentGiven: string;
  proceduresPerformed: string;
  conditionAtDischarge: string;
  followUpInstructions: string;
  medicationsAtDischarge: string;
  additionalNotes: string;
  writtenByName?: string;
}

const EMPTY_SUMMARY: DischargeSummaryFields = {
  diagnosis: "",
  historyOfPresentIllness: "",
  examinationFindings: "",
  investigations: "",
  treatmentGiven: "",
  proceduresPerformed: "",
  conditionAtDischarge: "",
  followUpInstructions: "",
  medicationsAtDischarge: "",
  additionalNotes: "",
};

export function DischargeSummaryTab({
  ipdId,
  admission,
}: {
  ipdId: string;
  admission: IpdDetail;
}) {
  const { tenant, user } = useApp();
  const [fields, setFields] = useState<DischargeSummaryFields>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiClient
      .get<Partial<DischargeSummaryFields> | null>(
        `/api/dashboard/ipd/${ipdId}/discharge-summary`,
      )
      .then((d) => {
        if (d.success && d.data) setFields((prev) => ({ ...prev, ...d.data }));
      })
      .finally(() => setLoading(false));
  }, [ipdId]);

  function setField(key: keyof DischargeSummaryFields, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const d = await apiClient.post<Partial<DischargeSummaryFields>>(
        `/api/dashboard/ipd/${ipdId}/discharge-summary`,
        fields,
      );
      if (d.success) {
        toast.success("Discharge summary saved");
        if (d.data) setFields((prev) => ({ ...prev, ...d.data }));
      } else {
        toast.error(d.error ?? "Failed to save");
      }
    } finally {
      setSaving(false);
    }
  }

  function handlePrint() {
    const p = admission.patientId;
    const data: DischargeSummaryData = {
      ipdNumber: admission.ipdNumber,
      admissionDate: admission.admissionDate,
      dischargeDate: admission.dischargeDate,
      caseNumber: admission.caseNumber,
      bedNumber: admission.bedNumber,
      bedGroup: admission.bedGroup,
      patientName: p?.name ?? "—",
      uhid: p?.uhid,
      patientAge: p?.age,
      patientAgeMonths: p?.ageMonths,
      patientAgeDays: p?.ageDays,
      patientGender: p?.gender,
      patientPhone: p?.phone,
      patientBloodGroup: p?.bloodGroup,
      doctorName: admission.doctorId?.name,
      doctorSpecialization: admission.doctorId?.specialization,
      ...fields,
      writtenByName: fields.writtenByName ?? user?.name,
      clinicName: tenant?.name ?? "Hospital",
      clinicAddress: tenant?.address,
      logoUrl: tenant?.logoUrl,
      printLayouts: tenant?.printLayouts,
    };
    printDischargeSummary(data);
  }

  const lbl = "block text-2xs font-semibold text-gray-500 uppercase mb-1";
  const ta =
    "w-full px-3 py-2 text-sm border border-gray-300 rounded resize-none focus:border-primary-400 focus:ring-1 focus:ring-primary-200 outline-none";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400">
        <p className="text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-800">Discharge Summary</p>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="w-3.5 h-3.5" /> Print
          </Button>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-4 bg-white border border-gray-200 rounded-lg p-5">
        <div>
          <label className={lbl}>
            Diagnosis <span className="text-danger-500">*</span>
          </label>
          <textarea
            rows={3}
            value={fields.diagnosis}
            onChange={(e) => setField("diagnosis", e.target.value)}
            className={ta}
            placeholder="Primary and secondary diagnoses…"
          />
        </div>
        <div>
          <label className={lbl}>History of Present Illness</label>
          <textarea
            rows={3}
            value={fields.historyOfPresentIllness}
            onChange={(e) =>
              setField("historyOfPresentIllness", e.target.value)
            }
            className={ta}
            placeholder="Brief history…"
          />
        </div>
        <div>
          <label className={lbl}>Examination Findings</label>
          <textarea
            rows={3}
            value={fields.examinationFindings}
            onChange={(e) => setField("examinationFindings", e.target.value)}
            className={ta}
            placeholder="Clinical examination on admission…"
          />
        </div>
        <div>
          <label className={lbl}>Investigations</label>
          <textarea
            rows={3}
            value={fields.investigations}
            onChange={(e) => setField("investigations", e.target.value)}
            className={ta}
            placeholder="Lab reports, imaging, etc…"
          />
        </div>
        <div>
          <label className={lbl}>Treatment Given</label>
          <textarea
            rows={3}
            value={fields.treatmentGiven}
            onChange={(e) => setField("treatmentGiven", e.target.value)}
            className={ta}
            placeholder="Medical treatment administered…"
          />
        </div>
        <div>
          <label className={lbl}>Procedures Performed</label>
          <textarea
            rows={2}
            value={fields.proceduresPerformed}
            onChange={(e) => setField("proceduresPerformed", e.target.value)}
            className={ta}
            placeholder="Surgeries, procedures, etc…"
          />
        </div>
        <div>
          <label className={lbl}>Condition at Discharge</label>
          <textarea
            rows={2}
            value={fields.conditionAtDischarge}
            onChange={(e) => setField("conditionAtDischarge", e.target.value)}
            className={ta}
            placeholder="Patient's condition at the time of discharge…"
          />
        </div>
        <div>
          <label className={lbl}>Medications at Discharge</label>
          <textarea
            rows={3}
            value={fields.medicationsAtDischarge}
            onChange={(e) => setField("medicationsAtDischarge", e.target.value)}
            className={ta}
            placeholder="Medications prescribed at discharge…"
          />
        </div>
        <div>
          <label className={lbl}>Follow-up Instructions</label>
          <textarea
            rows={3}
            value={fields.followUpInstructions}
            onChange={(e) => setField("followUpInstructions", e.target.value)}
            className={ta}
            placeholder="Diet, activity restrictions, follow-up date…"
          />
        </div>
        <div>
          <label className={lbl}>Additional Notes</label>
          <textarea
            rows={2}
            value={fields.additionalNotes}
            onChange={(e) => setField("additionalNotes", e.target.value)}
            className={ta}
            placeholder="Any other remarks…"
          />
        </div>
        <div>
          <label className={lbl}>Written by</label>
          <input
            value={fields.writtenByName ?? ""}
            onChange={(e) => setField("writtenByName", e.target.value)}
            className="w-full h-8 px-3 text-sm border border-gray-300 rounded focus:border-primary-400 focus:ring-1 focus:ring-primary-200 outline-none"
            placeholder="Doctor name for signature…"
          />
        </div>
      </div>

      {/* Bottom save + print */}
      <div className="flex justify-end gap-2">
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save Summary"}
        </Button>
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="w-3.5 h-3.5" /> Print Summary
        </Button>
      </div>
    </div>
  );
}
