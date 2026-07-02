"use client";

import { useEffect, useState } from "react";
import { ChevronDown, User, X } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import type { IpdDetail } from "@/components/ipd/types";

interface BedGroupOption {
  _id: string;
  name: string;
}
interface BedOption {
  _id: string;
  name: string;
  status: string;
}
interface DoctorOption {
  _id: string;
  name: string;
  specialization: string;
}

export function EditDialog({
  admission,
  onClose,
  onSaved,
}: {
  admission: IpdDetail;
  onClose: () => void;
  onSaved: (updated: IpdDetail) => void;
}) {
  // Form state
  const [symptomsType, setSymptomsType] = useState(
    admission.symptomsType ?? "",
  );
  const [symptomsTitle, setSymptomsTitle] = useState(
    admission.symptomsTitle ?? "",
  );
  const [symptomsDesc, setSymptomsDesc] = useState(
    admission.chiefComplaint ?? "",
  );
  const [note, setNote] = useState(admission.note ?? "");
  const [previousMedicalIssue, setPreviousMedicalIssue] = useState(
    admission.previousMedicalIssue ?? "",
  );
  const [admissionDate, setAdmissionDate] = useState(
    admission.admissionDate ?? "",
  );
  const [caseNumber, setCaseNumber] = useState(admission.caseNumber ?? "");
  const [tpa, setTpa] = useState(admission.tpa ?? "");
  const [casualty, setCasualty] = useState(admission.casualty ? "Yes" : "No");
  const [isOldPatient, setIsOldPatient] = useState(
    admission.isOldPatient ? "Yes" : "No",
  );
  const [creditLimit, setCreditLimit] = useState(
    String(admission.creditLimit ?? 20000),
  );
  const [reference, setReference] = useState(admission.reference ?? "");
  const [doctorId, setDoctorId] = useState("");
  const [bedGroup, setBedGroup] = useState(admission.bedGroup ?? "");
  const [bedNumber, setBedNumber] = useState(admission.bedNumber ?? "");
  const [liveConsultation, setLiveConsultation] = useState(
    admission.liveConsultation ? "Yes" : "No",
  );

  // API data
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [bedGroups, setBedGroups] = useState<BedGroupOption[]>([]);
  const [beds, setBeds] = useState<BedOption[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      apiClient.get<DoctorOption[]>("/api/dashboard/doctors"),
      apiClient.get<{ items: BedGroupOption[] }>("/api/dashboard/bed-groups"),
    ]).then(([d, g]) => {
      if (d.success) setDoctors(d.data);
      if (g.success) setBedGroups(g.data.items ?? []);
    });
  }, []);

  useEffect(() => {
    if (!bedGroup) {
      setBeds([]);
      return;
    }
    apiClient
      .get<{
        beds: BedOption[];
      }>(`/api/dashboard/beds?bedGroup=${encodeURIComponent(bedGroup)}`)
      .then((d) => {
        if (d.success) setBeds(d.data.beds ?? []);
      });
  }, [bedGroup]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await apiClient.patch<IpdDetail>(
        `/api/dashboard/ipd/${admission._id}`,
        {
          symptomsType,
          symptomsTitle,
          chiefComplaint: symptomsDesc,
          note,
          previousMedicalIssue,
          admissionDate,
          caseNumber,
          tpa,
          casualty: casualty === "Yes",
          isOldPatient: isOldPatient === "Yes",
          liveConsultation: liveConsultation === "Yes",
          creditLimit: Number(creditLimit) || 20000,
          reference,
          doctorId: doctorId || undefined,
          bedGroup: bedGroup || undefined,
          bedNumber: bedNumber || undefined,
        },
      );
      if (res.success) {
        onSaved(res.data);
        onClose();
      }
    } finally {
      setSaving(false);
    }
  }

  const lbl = "block text-xs font-semibold text-gray-600 mb-1";
  const inp =
    "w-full h-9 px-3 text-sm border border-gray-300 rounded focus:border-blue-400 focus:ring-1 focus:ring-blue-200 outline-none bg-white";
  const sel =
    "w-full h-9 px-3 text-sm border border-gray-300 rounded focus:border-blue-400 focus:ring-1 focus:ring-blue-200 outline-none bg-white appearance-none cursor-pointer";

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-blue-600 text-white shrink-0">
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <User className="w-4 h-4 shrink-0 opacity-70" />
          <span className="text-sm font-medium truncate">
            {admission.patientId?.name ?? "Patient"} — IPDN{admission.ipdNumber}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded hover:bg-blue-700 transition-colors ml-auto"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Two-panel body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left panel */}
        <div className="flex-1 overflow-y-auto p-6 border-r border-gray-200">
          {/* Symptoms row */}
          <div className="grid grid-cols-3 gap-4 mb-5">
            <div>
              <label className={lbl}>Symptoms Type</label>
              <input
                value={symptomsType}
                onChange={(e) => setSymptomsType(e.target.value)}
                className={inp}
              />
            </div>
            <div>
              <label className={lbl}>Symptoms Title</label>
              <input
                value={symptomsTitle}
                onChange={(e) => setSymptomsTitle(e.target.value)}
                className={inp}
              />
            </div>
            <div>
              <label className={lbl}>Symptoms Description</label>
              <input
                value={symptomsDesc}
                onChange={(e) => setSymptomsDesc(e.target.value)}
                className={inp}
              />
            </div>
          </div>

          {/* Note */}
          <div className="mb-5">
            <label className={lbl}>Note</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded resize-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 outline-none"
            />
          </div>

          {/* Previous Medical Issue */}
          <div>
            <label className={lbl}>Previous Medical Issue</label>
            <textarea
              value={previousMedicalIssue}
              onChange={(e) => setPreviousMedicalIssue(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded resize-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 outline-none"
            />
          </div>
        </div>

        {/* Right sidebar */}
        <div className="w-80 shrink-0 overflow-y-auto p-5 flex flex-col gap-4">
          {/* Admission Date */}
          <div>
            <label className={lbl}>
              Admission Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={admissionDate}
              onChange={(e) => setAdmissionDate(e.target.value)}
              className={inp}
            />
          </div>

          {/* Case + TPA */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Case</label>
              <input
                value={caseNumber}
                onChange={(e) => setCaseNumber(e.target.value)}
                className={inp}
              />
            </div>
            <div>
              <label className={lbl}>TPA</label>
              <input
                value={tpa}
                onChange={(e) => setTpa(e.target.value)}
                className={inp}
              />
            </div>
          </div>

          {/* Casualty + Old Patient */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Casualty</label>
              <div className="relative">
                <select
                  value={casualty}
                  onChange={(e) => setCasualty(e.target.value)}
                  className={sel}
                >
                  <option>No</option>
                  <option>Yes</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className={lbl}>Old Patient</label>
              <div className="relative">
                <select
                  value={isOldPatient}
                  onChange={(e) => setIsOldPatient(e.target.value)}
                  className={sel}
                >
                  <option>No</option>
                  <option>Yes</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Reference */}
          <div>
            <label className={lbl}>Reference</label>
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className={inp}
            />
          </div>

          {/* Consultant Doctor */}
          <div>
            <label className={lbl}>
              Consultant Doctor <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={doctorId}
                onChange={(e) => setDoctorId(e.target.value)}
                className={sel}
              >
                <option value="">Select</option>
                {doctors.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name} — {d.specialization}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Bed Group */}
          <div>
            <label className={lbl}>Bed Group</label>
            <div className="relative">
              <select
                value={bedGroup}
                onChange={(e) => {
                  setBedGroup(e.target.value);
                  setBedNumber("");
                }}
                className={sel}
              >
                <option value="">Select</option>
                {bedGroups.map((g) => (
                  <option key={g._id} value={g.name}>
                    {g.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Bed Number */}
          <div>
            <label className={lbl}>
              Bed Number <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={bedNumber}
                onChange={(e) => setBedNumber(e.target.value)}
                className={sel}
                disabled={!bedGroup}
              >
                <option value="">Select</option>
                {beds.map((b) => (
                  <option
                    key={b._id}
                    value={b.name}
                    disabled={
                      b.status === "allotted" && b.name !== admission.bedNumber
                    }
                  >
                    {b.name}{" "}
                    {b.status === "allotted" && b.name !== admission.bedNumber
                      ? "(Occupied)"
                      : ""}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Live Consultation */}
          <div>
            <label className={lbl}>Live Consultation</label>
            <div className="relative">
              <select
                value={liveConsultation}
                onChange={(e) => setLiveConsultation(e.target.value)}
                className={sel}
              >
                <option>No</option>
                <option>Yes</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-auto w-full h-10 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded transition-colors"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
