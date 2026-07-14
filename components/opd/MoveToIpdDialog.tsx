"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useApp } from "@/lib/context";
import { BedDouble } from "lucide-react";
import { FormDialog } from "@/components/common/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiClient } from "@/lib/apiClient";
import { useAvailableBeds, useBedGroups, useDoctors } from "@/lib/lookups";
import type { OpdVisit } from "@/components/opd/types";

export function MoveToIpdDialog({
  visit,
  onClose,
  onDone,
}: {
  visit: OpdVisit;
  onClose: () => void;
  onDone: () => void;
}) {
  const { tenant } = useApp();
  const symbol = tenant?.currencySymbol || "₹";

  const [form, setForm] = useState(() => {
    const n = new Date();
    const pad = (v: number) => String(v).padStart(2, "0");
    return {
      admissionDate: `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}T${pad(n.getHours())}:${pad(n.getMinutes())}`,
      caseNumber: visit.caseNumber ?? "",
      casualty: false,
      isOldPatient: false,
      creditLimit: "20000",
      reference: visit.reference ?? "",
      doctorId: visit.doctorId
        ? ((visit.doctorId as { _id?: string; name: string })._id ?? "")
        : "",
      bedGroupName: "",
      bedId: "",
      liveConsultation: false,
      isAntenatal: false,
      symptomsType: visit.symptomsType ?? "",
      symptomsTitle: visit.symptomsTitle ?? "",
      symptomsDesc: visit.chiefComplaint ?? "",
      note: "",
      prevMedical: visit.previousMedicalIssue ?? "",
    };
  });
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const { data: bedGroups = [] } = useBedGroups();
  const { data: beds = [] } = useAvailableBeds(form.bedGroupName);
  const { data: doctors = [] } = useDoctors();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const selectedBed = beds.find((b) => b._id === form.bedId);
      const res = await apiClient.post<{ ipdNumber: number }>(
        "/api/dashboard/ipd",
        {
          patientId: visit.patientId?._id,
          doctorId: form.doctorId || undefined,
          admissionDate: form.admissionDate,
          bedGroup: form.bedGroupName || undefined,
          bedNumber: selectedBed?.name || undefined,
          chiefComplaint: form.symptomsDesc.trim() || undefined,
          symptomsType: form.symptomsType.trim() || undefined,
          symptomsTitle: form.symptomsTitle.trim() || undefined,
          note: form.note.trim() || undefined,
          previousMedicalIssue: form.prevMedical.trim() || undefined,
          caseNumber: form.caseNumber.trim() || undefined,
          reference: form.reference.trim() || undefined,
          casualty: form.casualty,
          isOldPatient: form.isOldPatient,
          creditLimit: Number(form.creditLimit) || 20000,
          liveConsultation: form.liveConsultation,
          isAntenatal: form.isAntenatal,
          sourceOpdId: visit._id,
        },
      );
      if (!res.success) {
        toast.error(res.error ?? "Failed to admit");
        return;
      }
      toast.success(
        `IPD #${String(res.data.ipdNumber).padStart(3, "0")} created for ${visit.patientId?.name}`,
      );
      onDone();
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  const lbl = "text-xs font-medium text-gray-700 mb-1 whitespace-nowrap";

  const p = visit.patientId;
  const ageStr = p
    ? [
        p.age ? `${p.age} Year` : null,
        p.ageMonths ? `${p.ageMonths} Month` : null,
        p.ageDays ? `${p.ageDays} Day` : null,
      ]
        .filter(Boolean)
        .join(", ")
    : "";

  return (
    <FormDialog
      open
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <BedDouble className="w-4 h-4" />
          Move Patient to IPD
        </div>
      }
      contentClassName="sm:max-w-5xl w-full max-h-[92vh] flex flex-col"
      headerClassName="bg-primary-600 shrink-0"
      footerClassName="bg-white shrink-0"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            <BedDouble className="w-4 h-4" />
            {submitting ? "Admitting…" : "Move"}
          </Button>
        </>
      }
    >
      {/* Body */}
      <div className="flex flex-1 overflow-hidden min-h-100">
        {/* ── Left: patient info + clinical fields ── */}
        <div className="flex-1 overflow-y-auto px-5 pt-4 pb-5 border-r border-gray-200 bg-gray-50/40">
          {/* Patient header */}
          <div className="flex gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-gray-900">
                {p?.name ?? "—"}
                {p?.uhid ? ` (${p.uhid})` : ""}
              </h3>
              {p?.guardianName && (
                <p className="text-sm text-gray-500 mt-0.5">{p.guardianName}</p>
              )}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-sm text-gray-600">
                {p?.gender && <span>{p.gender}</span>}
                {p?.bloodGroup && <span>🩸 {p.bloodGroup}</span>}
              </div>
              {ageStr && <p className="text-sm text-gray-600 mt-1">{ageStr}</p>}
              {p?.phone && (
                <p className="text-sm text-gray-700 mt-1">📞 {p.phone}</p>
              )}
              {p?.email && (
                <p className="text-sm text-gray-700">✉️ {p.email}</p>
              )}
              {p?.address && (
                <p className="text-sm text-gray-600 mt-1">{p.address}</p>
              )}
              {p?.allergies && (
                <p className="text-sm text-gray-700 mt-1">
                  <span className="font-semibold">Any Known Allergies</span>{" "}
                  {p.allergies}
                </p>
              )}
            </div>
            <div className="w-24 h-24 shrink-0 bg-gray-200 rounded border border-gray-300 flex flex-col items-center justify-center gap-0.5">
              <span className="text-2xs text-gray-500 font-medium">
                NO IMAGE
              </span>
              <span className="text-2xs text-gray-500">AVAILABLE</span>
            </div>
          </div>

          {/* Symptoms row */}
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <Label className={lbl}>Symptoms Type</Label>
              <Input
                value={form.symptomsType}
                onChange={(e) => set("symptomsType", e.target.value)}
                className="h-9 bg-white"
              />
            </div>
            <div>
              <Label className={lbl}>Symptoms Title</Label>
              <Input
                value={form.symptomsTitle}
                onChange={(e) => set("symptomsTitle", e.target.value)}
                className="h-9 bg-white"
              />
            </div>
            <div>
              <Label className={lbl}>Symptoms Description</Label>
              <Input
                value={form.symptomsDesc}
                onChange={(e) => set("symptomsDesc", e.target.value)}
                className="h-9 bg-white"
              />
            </div>
          </div>

          <div className="mb-3">
            <Label className={lbl}>Note</Label>
            <Textarea
              value={form.note}
              onChange={(e) => set("note", e.target.value)}
              rows={3}
              className="text-sm resize-none bg-white"
            />
          </div>

          <div>
            <Label className={lbl}>Previous Medical Issue</Label>
            <Textarea
              value={form.prevMedical}
              onChange={(e) => set("prevMedical", e.target.value)}
              rows={2}
              className="text-sm resize-none bg-white"
            />
          </div>
        </div>

        {/* ── Right: admission form ── */}
        <div className="w-72 shrink-0 overflow-y-auto px-4 pt-4 pb-5 space-y-3">
          <div>
            <Label className={lbl}>
              Admission Date <span className="text-danger-500">*</span>
            </Label>
            <Input
              type="datetime-local"
              value={form.admissionDate}
              onChange={(e) => set("admissionDate", e.target.value)}
              className="h-9"
            />
          </div>

          <div>
            <Label className={lbl}>Case</Label>
            <Input
              value={form.caseNumber}
              onChange={(e) => set("caseNumber", e.target.value)}
              className="h-9"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className={lbl}>Casualty</Label>
              <Select
                value={form.casualty ? "Yes" : "No"}
                onValueChange={(v) => set("casualty", v === "Yes")}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className={lbl}>Old Patient</Label>
              <Select
                value={form.isOldPatient ? "Yes" : "No"}
                onValueChange={(v) => set("isOldPatient", v === "Yes")}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className={lbl}>
                Credit Limit ({symbol}){" "}
                <span className="text-danger-500">*</span>
              </Label>
              <Input
                type="number"
                value={form.creditLimit}
                onChange={(e) => set("creditLimit", e.target.value)}
                className="h-9"
              />
            </div>
            <div>
              <Label className={lbl}>Reference</Label>
              <Input
                value={form.reference}
                onChange={(e) => set("reference", e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          <div>
            <Label className={lbl}>
              Consultant Doctor <span className="text-danger-500">*</span>
            </Label>
            <Select
              value={form.doctorId}
              onValueChange={(v) => set("doctorId", v ?? "")}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {doctors.map((d) => (
                  <SelectItem key={d._id} value={d._id}>
                    {d.name}
                    {d.specialization ? ` (${d.specialization})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className={lbl}>Bed Group</Label>
            <Select
              value={form.bedGroupName}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, bedGroupName: v ?? "", bedId: "" }))
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {bedGroups.map((g) => (
                  <SelectItem key={g._id} value={g.name}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className={lbl}>
              Bed Number <span className="text-danger-500">*</span>
            </Label>
            <Select
              value={form.bedId}
              onValueChange={(v) => set("bedId", v ?? "")}
              disabled={!form.bedGroupName}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {beds.map((b) => (
                  <SelectItem key={b._id} value={b._id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Label className={lbl}>Live Consultation</Label>
              <Select
                value={form.liveConsultation ? "Yes" : "No"}
                onValueChange={(v) => set("liveConsultation", v === "Yes")}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Label className="gap-1.5 pb-2.5 text-xs text-gray-600 cursor-pointer whitespace-nowrap">
              <Checkbox
                checked={form.isAntenatal}
                onCheckedChange={(checked) => set("isAntenatal", !!checked)}
                className="size-3.5"
              />
              Is For Antenatal
            </Label>
          </div>
        </div>
      </div>
    </FormDialog>
  );
}
