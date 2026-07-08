"use client";

import { User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useCurrency } from "@/lib/context";
import { formatDate } from "@/lib/format";
import { InfoRow } from "@/components/ipd/InfoRow";
import type {
  OpdVisitDetail,
  OpdPrescription,
  OpdPatientHistory,
} from "./types";

function BillingBar({
  label,
  billed,
  paid,
}: {
  label: string;
  billed: number;
  paid: number;
}) {
  const { fmt } = useCurrency();
  const pct = billed > 0 ? Math.min(100, (paid / billed) * 100) : 0;
  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-white">
      <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
        {label} Payment/Billing
      </h3>
      <div className="flex items-center justify-between mt-1.5 mb-1">
        <span className="text-xs text-gray-500">{pct.toFixed(2)}%</span>
        <span className="text-xs font-medium text-gray-800">
          {fmt(paid)}/{fmt(billed)}
        </span>
      </div>
      <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full bg-primary-500 rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
      {children}
    </h3>
  );
}

const th = "text-left text-2xs font-semibold text-gray-400 uppercase tracking-wide pb-1.5";
const td = "py-1.5 text-xs text-gray-700 border-t border-gray-100";

export function OpdOverviewTab({
  visit,
  prescription,
  history,
}: {
  visit: OpdVisitDetail;
  prescription: OpdPrescription | null;
  history: OpdPatientHistory | null;
}) {
  const { fmt } = useCurrency();
  const p = visit.patientId;

  const ageStr = p
    ? [
        p.age ? `${p.age} Year` : null,
        p.ageMonths ? `${p.ageMonths} Month` : null,
        p.ageDays ? `${p.ageDays} Day` : null,
      ]
        .filter(Boolean)
        .join(", ")
    : "—";

  // Patient-wide billing totals per module
  const opdBilled = (history?.opd ?? []).reduce((s, v) => s + (v.totalFee ?? 0), 0);
  const opdPaid = (history?.opd ?? []).reduce((s, v) => s + (v.paidAmount ?? 0), 0);
  const sum = (rows: { netAmount: number; paidAmount: number }[]) => ({
    billed: rows.reduce((s, r) => s + (r.netAmount ?? 0), 0),
    paid: rows.reduce((s, r) => s + (r.paidAmount ?? 0), 0),
  });
  const pharmacy = sum(history?.pharmacy ?? []);
  const pathology = sum(history?.pathology ?? []);
  const radiology = sum(history?.radiology ?? []);

  const labItems = [
    ...(history?.pathology ?? []).flatMap((b) =>
      b.items.map((it) => ({ ...it, lab: "Pathology", billNo: b.billNo })),
    ),
    ...(history?.radiology ?? []).flatMap((b) =>
      b.items.map((it) => ({ ...it, lab: "Radiology", billNo: b.billNo })),
    ),
  ].slice(0, 8);

  return (
    <div className="flex flex-col xl:flex-row gap-4 p-4 items-start">
      {/* ── Left column: patient + visit ── */}
      <div className="w-full xl:w-96 shrink-0 space-y-4">
        {/* Patient card */}
        <div className="border border-gray-200 rounded-lg p-4 bg-white">
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
            </div>
          </div>
          <div className="space-y-0">
            <InfoRow label="Gender" value={p?.gender} />
            <InfoRow label="Age" value={ageStr} />
            <InfoRow label="Guardian Name" value={p?.guardianName} />
            <InfoRow label="Phone" value={p?.phone} />
            <InfoRow label="Blood Group" value={p?.bloodGroup} />
            <InfoRow label="Known Allergies" value={p?.allergies} />
            <InfoRow label="TPA" value={p?.tpa} />
            <InfoRow label="TPA ID" value={p?.tpaId} />
            <InfoRow label="TPA Validity" value={p?.tpaValidity} />
            <InfoRow label="Address" value={p?.address} />
          </div>
        </div>

        {/* Visit details */}
        <div className="border border-gray-200 rounded-lg p-4 bg-white">
          <div className="space-y-0">
            <InfoRow label="OPD No" value={`OPDN${String(visit.opdNumber).padStart(4, "0")}`} />
            <InfoRow label="Case ID" value={visit.caseNumber} />
            <InfoRow
              label="Appointment Date"
              value={visit.visitDate ? formatDate(visit.visitDate) : undefined}
            />
            <InfoRow label="Consultant Doctor" value={visit.doctorId?.name} />
            <InfoRow label="Specialty" value={visit.doctorId?.specialization} />
            <InfoRow label="Reference" value={visit.reference} />
            <InfoRow label="Symptoms" value={visit.chiefComplaint} />
            <InfoRow label="Symptoms Type" value={visit.symptomsType} />
            <InfoRow
              label="Prev. Medical Issue"
              value={visit.previousMedicalIssue}
            />
            <InfoRow label="Note" value={visit.note} />
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {visit.casualty && (
              <Badge className="bg-danger-100 text-danger-700 border-0 text-2xs">
                Casualty
              </Badge>
            )}
            {visit.isOldPatient && (
              <Badge className="bg-purple-100 text-purple-700 border-0 text-2xs">
                Old Patient
              </Badge>
            )}
            {visit.isAntenatal && (
              <Badge className="bg-pink-100 text-pink-700 border-0 text-2xs">
                Antenatal
              </Badge>
            )}
            {visit.liveConsultation && (
              <Badge className="bg-primary-100 text-primary-700 border-0 text-2xs">
                Live Consultation
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* ── Right column: billing bars + medication + lab + charges ── */}
      <div className="flex-1 min-w-0 w-full space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <BillingBar label="OPD" billed={opdBilled} paid={opdPaid} />
          <BillingBar label="Pharmacy" billed={pharmacy.billed} paid={pharmacy.paid} />
          <BillingBar label="Pathology" billed={pathology.billed} paid={pathology.paid} />
          <BillingBar label="Radiology" billed={radiology.billed} paid={radiology.paid} />
        </div>

        {/* Medication */}
        <div className="border border-gray-200 rounded-lg p-4 bg-white">
          <SectionTitle>Medication</SectionTitle>
          {prescription && prescription.medicines.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr>
                  <th className={th}>Medicine Name</th>
                  <th className={th}>Dose</th>
                  <th className={th}>Interval</th>
                  <th className={th}>Duration</th>
                </tr>
              </thead>
              <tbody>
                {prescription.medicines.map((m, i) => (
                  <tr key={i}>
                    <td className={td}>{m.name}</td>
                    <td className={td}>{m.dose || "—"}</td>
                    <td className={td}>{m.doseInterval || "—"}</td>
                    <td className={td}>{m.doseDuration || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-xs text-gray-400">
              No prescription recorded for this visit.
            </p>
          )}
        </div>

        {/* Lab investigation */}
        <div className="border border-gray-200 rounded-lg p-4 bg-white">
          <SectionTitle>Lab Investigation</SectionTitle>
          {labItems.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr>
                  <th className={th}>Test Name</th>
                  <th className={th}>Lab</th>
                  <th className={th}>Bill No</th>
                  <th className={th}>Report Date</th>
                </tr>
              </thead>
              <tbody>
                {labItems.map((it, i) => (
                  <tr key={i}>
                    <td className={td}>{it.testName}</td>
                    <td className={td}>{it.lab}</td>
                    <td className={td}>{it.billNo}</td>
                    <td className={td}>
                      {it.reportDate ? formatDate(it.reportDate) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-xs text-gray-400">No lab tests found.</p>
          )}
        </div>

        {/* Charges */}
        <div className="border border-gray-200 rounded-lg p-4 bg-white">
          <SectionTitle>Charges</SectionTitle>
          {visit.charges.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr>
                  <th className={th}>Name</th>
                  <th className={`${th} text-right`}>Fee</th>
                </tr>
              </thead>
              <tbody>
                {visit.charges.map((c, i) => (
                  <tr key={i}>
                    <td className={td}>{c.name}</td>
                    <td className={`${td} text-right`}>{fmt(c.fee)}</td>
                  </tr>
                ))}
                <tr>
                  <td className={`${td} font-semibold text-gray-900`}>Total</td>
                  <td className={`${td} text-right font-semibold text-gray-900`}>
                    {fmt(visit.totalFee ?? 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          ) : (
            <p className="text-xs text-gray-400">No charges recorded.</p>
          )}
        </div>
      </div>
    </div>
  );
}
