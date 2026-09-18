"use client";

import {
  User,
  Phone,
  Mail,
  MapPin,
  Heart,
  Shield,
  AlertCircle,
  Hash,
  Users,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Patient } from "./types";

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value?: string | null;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <Icon className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-2xs text-gray-400 leading-none">{label}</p>
        <p className="text-xs text-gray-800 mt-0.5 break-words">{value}</p>
      </div>
    </div>
  );
}

export function PatientInfoPanel({
  patient,
  loading,
  counts,
  countsLoading,
}: {
  patient: Patient | null;
  loading: boolean;
  counts: { opd: number; ipd: number; pharmacy: number; pathology: number };
  countsLoading: boolean;
}) {
  const ageParts = patient
    ? [
        patient.age ? `${patient.age}y` : null,
        patient.ageMonths ? `${patient.ageMonths}m` : null,
        patient.ageDays ? `${patient.ageDays}d` : null,
      ]
        .filter(Boolean)
        .join(" ")
    : "";

  const initials =
    patient?.name
      ?.split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? "?";

  return (
    <div className="w-64 shrink-0 flex flex-col gap-3 overflow-y-auto">
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        {/* Avatar */}
        <div className="flex flex-col items-center mb-3">
          <div className="w-16 h-16 rounded-full bg-primary-600 flex items-center justify-center text-white text-xl font-bold mb-2">
            {initials}
          </div>
          {loading ? (
            <Skeleton className="h-4 w-24" />
          ) : (
            <p className="text-sm font-semibold text-gray-900 text-center">
              {patient?.name}
            </p>
          )}
          {patient?.uhid && (
            <p className="text-2xs text-gray-400 font-mono">
              UHID{patient.uhid}
            </p>
          )}
        </div>

        <div className="border-t border-gray-100 pt-3 space-y-0.5">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full mb-1" />
            ))
          ) : (
            <>
              <InfoRow icon={User} label="Gender" value={patient?.gender} />
              <InfoRow icon={User} label="Age" value={ageParts || undefined} />
              <InfoRow
                icon={Users}
                label="Guardian"
                value={patient?.guardianName}
              />
              <InfoRow icon={Phone} label="Phone" value={patient?.phone} />
              <InfoRow
                icon={Phone}
                label="Alt. Phone"
                value={patient?.alternateNumber}
              />
              <InfoRow icon={Mail} label="Email" value={patient?.email} />
              <InfoRow icon={MapPin} label="Address" value={patient?.address} />
              <InfoRow
                icon={Heart}
                label="Blood Group"
                value={patient?.bloodGroup}
              />
              <InfoRow
                icon={AlertCircle}
                label="Allergies"
                value={patient?.allergies}
              />
              <InfoRow icon={Shield} label="TPA" value={patient?.tpa} />
              <InfoRow icon={Hash} label="TPA ID" value={patient?.tpaId} />
              <InfoRow
                icon={Hash}
                label="TPA Validity"
                value={patient?.tpaValidity}
              />
              <InfoRow
                icon={Hash}
                label="National ID"
                value={patient?.nationalId}
              />
              {patient?.remarks && (
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <p className="text-2xs text-gray-400 mb-1">Remarks</p>
                  <p className="text-xs text-gray-600">{patient.remarks}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Visit summary */}
      {!countsLoading && (
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-gray-600 mb-2">
            Visit Summary
          </p>
          <div className="space-y-1.5">
            {[
              { label: "OPD Visits", count: counts.opd },
              { label: "IPD Admissions", count: counts.ipd },
              { label: "Pharmacy Bills", count: counts.pharmacy },
              { label: "Pathology Bills", count: counts.pathology },
            ].map((r) => (
              <div key={r.label} className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{r.label}</span>
                <span className="text-xs font-semibold text-gray-800">
                  {r.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
