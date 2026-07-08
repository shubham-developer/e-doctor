"use client";

import { useApp, useDateFormatter } from "@/lib/context";
import { User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { InfoRow } from "@/components/ipd/InfoRow";
import type { IpdDetail } from "@/components/ipd/types";

export function OverviewTab({ admission }: { admission: IpdDetail }) {
  const { tenant } = useApp();
  const { formatDate } = useDateFormatter();
  const sym = tenant?.currencySymbol ?? "₹";
  const p = admission.patientId;

  const ageStr = p
    ? [
        p.age ? `${p.age} Year` : null,
        p.ageMonths ? `${p.ageMonths} Month` : null,
        p.ageDays ? `${p.ageDays} Day` : null,
      ]
        .filter(Boolean)
        .join(", ")
    : "—";

  const bedDisplay =
    [admission.bedNumber, admission.bedGroup].filter(Boolean).join(" - ") ||
    "—";

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex gap-4">
        {/* Patient card */}
        <div className="w-80 shrink-0 border border-gray-200 rounded-lg p-4 bg-white">
          {/* Photo + name */}
          <div className="flex gap-3 mb-4 pb-4 border-b border-gray-100">
            <div className="w-20 h-20 shrink-0 bg-gray-200 rounded-lg flex flex-col items-center justify-center text-2xs text-gray-500 text-center border border-gray-300">
              <User className="w-8 h-8 text-gray-400 mb-1" />
              <span>NO IMAGE</span>
              <span>AVAILABLE</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 leading-tight">
                {p?.name ?? "—"}
              </p>
              {p?.uhid && (
                <p className="text-xs text-gray-500 mt-0.5">
                  UHID: {p.uhid}
                </p>
              )}
              {admission.status === "ADMITTED" ? (
                <Badge className="mt-1.5 bg-success-100 text-success-700 border-0 text-2xs">
                  Admitted
                </Badge>
              ) : (
                <Badge className="mt-1.5 bg-warning-100 text-warning-700 border-0 text-2xs">
                  Discharged
                </Badge>
              )}
            </div>
          </div>
          {/* Details */}
          <div className="space-y-0">
            <InfoRow label="Gender" value={p?.gender} />
            <InfoRow label="Age" value={ageStr} />
            <InfoRow label="Guardian Name" value={p?.guardianName} />
            <InfoRow label="Phone" value={p?.phone} />
            <InfoRow label="TPA" value={p?.tpa} />
            <InfoRow label="TPA ID" value={p?.tpaId} />
            <InfoRow label="TPA Validity" value={p?.tpaValidity} />
          </div>
          {p?.nationalId && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-2xs text-gray-400 uppercase tracking-wide font-semibold mb-1">
                National ID
              </p>
              <p className="text-xs font-mono text-gray-700">{p.nationalId}</p>
            </div>
          )}
        </div>

        {/* Admission details */}
        <div className="flex-1 border border-gray-200 rounded-lg p-4 bg-white">
          <div className="grid grid-cols-2 gap-x-8 gap-y-2">
            <InfoRow label="Case ID" value={admission.caseNumber} />
            <InfoRow label="Reference" value={admission.reference} />
            <InfoRow label="IPD No" value={`IPDN${admission.ipdNumber}`} />
            <InfoRow label="Doctor" value={admission.doctorId?.name} />
            <InfoRow
              label="Admission Date"
              value={
                admission.admissionDate
                  ? formatDate(admission.admissionDate)
                  : undefined
              }
            />
            <InfoRow
              label="Specialty"
              value={admission.doctorId?.specialization}
            />
            <InfoRow label="Bed" value={bedDisplay} />
            {admission.dischargeDate && (
              <InfoRow
                label="Discharge Date"
                value={formatDate(admission.dischargeDate)}
              />
            )}
            <InfoRow label="Chief Complaint" value={admission.chiefComplaint} />
            <InfoRow label="Symptoms Type" value={admission.symptomsType} />
            <InfoRow label="Symptoms Title" value={admission.symptomsTitle} />
            <InfoRow
              label="Prev. Medical Issue"
              value={admission.previousMedicalIssue}
            />
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {admission.casualty && (
              <Badge className="bg-danger-100    text-danger-700    border-0 text-2xs">
                Casualty
              </Badge>
            )}
            {admission.isOldPatient && (
              <Badge className="bg-purple-100 text-purple-700 border-0 text-2xs">
                Old Patient
              </Badge>
            )}
            {admission.isAntenatal && (
              <Badge className="bg-pink-100   text-pink-700   border-0 text-2xs">
                Antenatal
              </Badge>
            )}
            {admission.liveConsultation && (
              <Badge className="bg-primary-100 text-primary-700 border-0 text-2xs">
                Live Consultation
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
