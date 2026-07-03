"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useApp } from "@/lib/context";
import { BedDouble, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { apiClient } from "@/lib/apiClient";
import type { OpdVisit, Doctor } from "@/components/opd/types";

interface BedGroupOption {
  _id: string;
  name: string;
}
interface BedOption {
  _id: string;
  name: string;
  bedGroup: string;
  status: string;
}

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
  const [admissionDate, setAdmissionDate] = useState(() => {
    const n = new Date();
    const pad = (v: number) => String(v).padStart(2, "0");
    return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}T${pad(n.getHours())}:${pad(n.getMinutes())}`;
  });
  const [caseNumber, setCaseNumber] = useState(visit.caseNumber ?? "");
  const [casualty, setCasualty] = useState(false);
  const [isOldPatient, setIsOldPatient] = useState(false);
  const [creditLimit, setCreditLimit] = useState("20000");
  const [reference, setReference] = useState(visit.reference ?? "");
  const [doctorId, setDoctorId] = useState(
    visit.doctorId
      ? ((visit.doctorId as { _id?: string; name: string })._id ?? "")
      : "",
  );
  const [bedGroupName, setBedGroupName] = useState("");
  const [bedId, setBedId] = useState("");
  const [liveConsultation, setLiveConsult] = useState(false);
  const [isAntenatal, setIsAntenatal] = useState(false);
  const [symptomsType, setSymptomsType] = useState(visit.symptomsType ?? "");
  const [symptomsTitle, setSymptomsTitle] = useState(visit.symptomsTitle ?? "");
  const [symptomsDesc, setSymptomsDesc] = useState(visit.chiefComplaint ?? "");
  const [note, setNote] = useState("");
  const [prevMedical, setPrevMedical] = useState(
    visit.previousMedicalIssue ?? "",
  );

  const [bedGroups, setBedGroups] = useState<BedGroupOption[]>([]);
  const [beds, setBeds] = useState<BedOption[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      apiClient.get<{ items: BedGroupOption[] }>("/api/dashboard/bed-groups"),
      apiClient.get<Doctor[]>("/api/dashboard/doctors"),
    ]).then(([bg, doc]) => {
      setBedGroups(bg.data?.items ?? []);
      if (doc.success) setDoctors(doc.data ?? []);
    });
  }, []);

  useEffect(() => {
    if (!bedGroupName) {
      setBeds([]);
      setBedId("");
      return;
    }
    apiClient
      .get<{
        beds: BedOption[];
      }>(`/api/dashboard/beds?bedGroup=${encodeURIComponent(bedGroupName)}&status=available`)
      .then((d) => {
        setBeds(d.data?.beds ?? []);
        setBedId("");
      });
  }, [bedGroupName]);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const selectedBed = beds.find((b) => b._id === bedId);
      const res = await apiClient.post<{ ipdNumber: number }>(
        "/api/dashboard/ipd",
        {
          patientId: visit.patientId?._id,
          doctorId: doctorId || undefined,
          admissionDate,
          bedGroup: bedGroupName || undefined,
          bedNumber: selectedBed?.name || undefined,
          chiefComplaint: symptomsDesc.trim() || undefined,
          symptomsType: symptomsType.trim() || undefined,
          symptomsTitle: symptomsTitle.trim() || undefined,
          note: note.trim() || undefined,
          previousMedicalIssue: prevMedical.trim() || undefined,
          caseNumber: caseNumber.trim() || undefined,
          reference: reference.trim() || undefined,
          casualty,
          isOldPatient,
          creditLimit: Number(creditLimit) || 20000,
          liveConsultation,
          isAntenatal,
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

  const inp =
    "h-9 text-sm border border-gray-200 rounded-md px-2.5 w-full focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100 bg-white";
  const sel = inp;
  const ta =
    "text-sm border border-gray-200 rounded-md px-2.5 py-2 w-full focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100 resize-none bg-white";
  const lbl = "block text-xs font-medium text-gray-600 mb-1";

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
    <Dialog
      open
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-5xl w-full p-0 overflow-hidden gap-0 flex flex-col"
        style={{ maxHeight: "92vh" }}
      >
        {/* Header */}
        <div className="bg-primary-600 text-white flex items-center justify-between px-5 py-3 shrink-0">
          <div className="flex items-center gap-2">
            <BedDouble className="w-4 h-4" />
            <DialogTitle>Move Patient to IPD</DialogTitle>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div
          className="flex flex-1 overflow-hidden"
          style={{ minHeight: "400px" }}
        >
          {/* ── Left: patient info + clinical fields ── */}
          <div className="flex-1 overflow-y-auto px-5 pt-4 pb-5 border-r border-gray-200 bg-gray-50/40">
            {/* Patient header */}
            <div className="flex gap-4 mb-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-gray-900">
                  {p?.name ?? "—"}
                  {p?.patientCode ? ` (${p.patientCode})` : ""}
                </h3>
                {p?.guardianName && (
                  <p className="text-sm text-gray-500 mt-0.5">
                    {p.guardianName}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-sm text-gray-600">
                  {p?.gender && <span>{p.gender}</span>}
                  {p?.bloodGroup && <span>🩸 {p.bloodGroup}</span>}
                </div>
                {ageStr && (
                  <p className="text-sm text-gray-600 mt-1">{ageStr}</p>
                )}
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

            <div className="mb-3">
              <label className={lbl}>Note</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className={ta}
              />
            </div>

            <div>
              <label className={lbl}>Previous Medical Issue</label>
              <textarea
                value={prevMedical}
                onChange={(e) => setPrevMedical(e.target.value)}
                rows={2}
                className={ta}
              />
            </div>
          </div>

          {/* ── Right: admission form ── */}
          <div className="w-72 shrink-0 overflow-y-auto px-4 pt-4 pb-5 space-y-3">
            <div>
              <label className={lbl}>
                Admission Date <span className="text-danger-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={admissionDate}
                onChange={(e) => setAdmissionDate(e.target.value)}
                className={inp}
              />
            </div>

            <div>
              <label className={lbl}>Case</label>
              <input
                value={caseNumber}
                onChange={(e) => setCaseNumber(e.target.value)}
                className={inp}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={lbl}>Casualty</label>
                <select
                  value={casualty ? "Yes" : "No"}
                  onChange={(e) => setCasualty(e.target.value === "Yes")}
                  className={sel}
                >
                  <option>Yes</option>
                  <option>No</option>
                </select>
              </div>
              <div>
                <label className={lbl}>Old Patient</label>
                <select
                  value={isOldPatient ? "Yes" : "No"}
                  onChange={(e) => setIsOldPatient(e.target.value === "Yes")}
                  className={sel}
                >
                  <option>Yes</option>
                  <option>No</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={lbl}>
                  Credit Limit ({symbol}){" "}
                  <span className="text-danger-500">*</span>
                </label>
                <input
                  type="number"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  className={inp}
                />
              </div>
              <div>
                <label className={lbl}>Reference</label>
                <input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className={inp}
                />
              </div>
            </div>

            <div>
              <label className={lbl}>
                Consultant Doctor <span className="text-danger-500">*</span>
              </label>
              <select
                value={doctorId}
                onChange={(e) => setDoctorId(e.target.value)}
                className={sel}
              >
                <option value="">Select</option>
                {doctors.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                    {d.specialization ? ` (${d.specialization})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={lbl}>Bed Group</label>
              <select
                value={bedGroupName}
                onChange={(e) => setBedGroupName(e.target.value)}
                className={sel}
              >
                <option value="">Select</option>
                {bedGroups.map((g) => (
                  <option key={g._id} value={g.name}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={lbl}>
                Bed Number <span className="text-danger-500">*</span>
              </label>
              <select
                value={bedId}
                onChange={(e) => setBedId(e.target.value)}
                className={sel}
                disabled={!bedGroupName}
              >
                <option value="">Select</option>
                {beds.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className={lbl}>Live Consultation</label>
                <select
                  value={liveConsultation ? "Yes" : "No"}
                  onChange={(e) => setLiveConsult(e.target.value === "Yes")}
                  className={sel}
                >
                  <option>Yes</option>
                  <option>No</option>
                </select>
              </div>
              <label className="flex items-center gap-1.5 pb-2 text-xs text-gray-600 cursor-pointer whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={isAntenatal}
                  onChange={(e) => setIsAntenatal(e.target.checked)}
                  className="w-3.5 h-3.5 accent-primary-600"
                />
                Is For Antenatal
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-5 py-3 flex justify-end gap-2 bg-white shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-5 py-2 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-60 transition-colors"
          >
            <BedDouble className="w-4 h-4" />
            {submitting ? "Admitting…" : "Move"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
