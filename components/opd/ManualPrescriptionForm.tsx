"use client";

import { useRef } from "react";
import { X, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/context";
import type { OpdVisitForPrescription } from "./PrescriptionForm";
import { printPrescription } from "./PrescriptionPrinter";

export function ManualPrescriptionForm({
  visit,
  onClose,
  clinicName,
  clinicAddress,
  clinicPhone,
  clinicEmail,
  clinicWebsite,
  logoUrl,
}: {
  visit: OpdVisitForPrescription;
  onClose: () => void;
  clinicName: string;
  clinicAddress?: string;
  clinicPhone?: string;
  clinicEmail?: string;
  clinicWebsite?: string;
  logoUrl?: string;
}) {
  const { tenant } = useApp();
  const rxRef = useRef<HTMLDivElement>(null);

  const p = visit.patientId;
  const opdId = `OPDN${String(visit.opdNumber).padStart(4, "0")}`;

  const ageStr =
    [
      p?.age ? `${p.age} Year` : "",
      p?.ageMonths ? `${p.ageMonths} Month` : "",
      p?.ageDays ? `${p.ageDays} Day` : "",
    ]
      .filter(Boolean)
      .join(", ") || "—";

  function handlePrint() {
    printPrescription({
      opdNumber: visit.opdNumber,
      caseNumber: visit.caseNumber,
      visitDate: visit.visitDate,
      patientName: p?.name ?? "",
      uhid: p?.uhid,
      patientAge: p?.age ?? 0,
      patientAgeMonths: p?.ageMonths,
      patientAgeDays: p?.ageDays,
      patientGender: p?.gender,
      patientPhone: p?.phone,
      patientAddress: p?.address,
      patientBloodGroup: p?.bloodGroup,
      patientAllergies: p?.allergies,
      doctorName: visit.doctorId?.name,
      manualContent: rxRef.current?.innerHTML ?? "",
      medicines: [],
      findings: [],
      clinicName,
      clinicAddress,
      clinicPhone,
      clinicEmail,
      clinicWebsite,
      logoUrl,
      printLayouts: tenant?.printLayouts,
      layoutModule: "manualPrescription",
    });
  }

  const lbl = "text-gray-500 text-xs";
  const val = "text-gray-900 text-xs font-medium";

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div
        className="bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden"
        style={{ width: 820, maxHeight: "92vh" }}
      >
        {/* ── Modal header bar ── */}
        <div className="flex items-center px-4 py-2.5 bg-primary-600 shrink-0 rounded-t-lg">
          <span className="text-white font-semibold text-sm">Prescription</span>
          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handlePrint}
              title="Print"
              className="text-white/80 hover:text-white hover:bg-white/10"
            >
              <Printer className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              title="Close"
              className="text-white/80 hover:text-white hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* ── Prescription body (scrollable) ── */}
        <div className="flex-1 overflow-y-auto px-10 py-7 bg-white">
          {/* Clinic header */}
          <div className="flex justify-between items-start pb-2">
            <div>
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="logo"
                  className="h-14 max-w-45 object-contain block mb-1"
                />
              ) : (
                <div className="inline-block bg-danger-600 text-white text-2xs font-bold px-2 py-0.5 tracking-widest uppercase mb-1">
                  ▲ {clinicName.split(" ")[0].toUpperCase()}
                </div>
              )}
              <p className="text-2xl font-bold text-gray-900 leading-tight">
                {clinicName}
              </p>
            </div>
            <div className="text-right text-2xs text-gray-500 leading-[1.8]">
              {clinicAddress && <p>Address: {clinicAddress}</p>}
              {clinicPhone && <p>Phone No.: {clinicPhone}</p>}
              {clinicEmail && <p>Email: {clinicEmail}</p>}
              {clinicWebsite && <p>Website: {clinicWebsite}</p>}
            </div>
          </div>

          {/* OPD Prescription title bar */}
          <div className="bg-gray-900 text-white text-center text-xs font-bold py-1.5 my-3 tracking-wide">
            OPD Prescription
          </div>

          {/* OPD meta row */}
          <div className="flex justify-between text-xs mb-2">
            <div className="leading-[1.8]">
              <p>
                OPD No<span className="font-bold ml-1">{opdId}</span>
              </p>
            </div>
            <p className="font-bold text-xs">
              Date : {visit.visitDate}
              {visit.createdAt && (
                <span className="ml-1 font-normal">
                  {new Date(visit.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }).toUpperCase()}
                </span>
              )}
            </p>
          </div>

          <hr className="border-gray-300 my-2" />

          {/* Patient info grid */}
          <div className="flex gap-6 py-2 text-xs">
            <div className="flex-1 flex flex-col gap-1">
              {[
                ["UHID", p?.uhid ?? "—"],
                ["Patient Name", p?.name ?? "—"],
                ["Gender / Age", [p?.gender, p?.age ? `${p.age} Year` : ""].filter(Boolean).join(" / ") || "—"],
              ].map(([label, value]) => (
                <div key={label} className="flex gap-1">
                  <span className={lbl}>{label}</span>
                  <span className="text-gray-400">:</span>
                  <span className={val}>{value}</span>
                </div>
              ))}
            </div>
            <div className="w-56 flex flex-col gap-1">
              {[
                ["Mobile No", p?.phone ?? "—"],
                ["Consultant Doctor", visit.doctorId?.name ?? "—"],
                ...(p?.address ? [["Address", p.address]] : []),
              ].map(([label, value]) => (
                <div key={label} className="flex gap-1">
                  <span className={lbl}>{label}</span>
                  <span className="text-gray-400">:</span>
                  <span className={val}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          <hr className="border-gray-300 my-2" />

          {/* Rx area – doctor types here */}
          <div className="mt-3">
            <div
              ref={rxRef}
              className="min-h-48 p-1 text-xs leading-7 rounded border border-dashed border-gray-200"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
