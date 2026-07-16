"use client";

import { Printer } from "lucide-react";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { useApp, useCurrency } from "@/lib/context";
import { printOpdReceipt } from "@/components/patients/OpdReceiptPrinter";
import type { OpdVisit, Patient } from "./types";

export function OpdHistoryTable({
  visits,
  patient,
  loading,
}: {
  visits: OpdVisit[];
  patient: Patient | null;
  loading: boolean;
}) {
  const { tenant } = useApp();
  const { fmt } = useCurrency();

  function printOpd(visit: OpdVisit) {
    if (!patient) return;
    printOpdReceipt({
      opdNumber: visit.opdNumber,
      visitDate: visit.visitDate,
      visitTime: visit.createdAt
        ? new Date(visit.createdAt)
            .toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })
            .toUpperCase()
        : "",
      patientName: patient.name,
      uhid: patient.uhid,
      patientPhone: patient.phone,
      patientAge: patient.age,
      patientAgeMonths: patient.ageMonths,
      patientAgeDays: patient.ageDays,
      patientDateOfBirth: patient.dateOfBirth,
      patientGender: patient.gender,
      patientBloodGroup: patient.bloodGroup,
      patientAllergies: patient.allergies,
      patientAddress: patient.address,
      doctorName: visit.doctorId?.name,
      doctorSpecialization: visit.doctorId?.specialization,
      chiefComplaint: visit.chiefComplaint ?? "",
      charges: visit.charges,
      totalFee: visit.paidAmount,
      clinicName: tenant?.name ?? "Clinic",
      clinicAddress: tenant?.address,
      clinicPhone: tenant?.phone,
      logoUrl: tenant?.logoUrl,
      printLayouts: tenant?.printLayouts,
      printShowLogo: tenant?.printShowLogo,
      printHeaderImages: tenant?.printHeaderImages,
      printFooterContents: tenant?.printFooterContents,
      printLetterheads: tenant?.printLetterheads,
      printShowTitles: tenant?.printShowTitles,
      printTitleTexts: tenant?.printTitleTexts,
    });
  }

  const columns: ColumnDef<OpdVisit>[] = [
    {
      key: "opdNumber",
      header: "OPD No",
      width: "w-20",
      skeletonWidth: "w-16",
      render: (v) => (
        <span className="text-xs font-mono text-primary-700">
          OPD{String(v.opdNumber).padStart(3, "0")}
        </span>
      ),
    },
    {
      key: "visitDate",
      header: "Date",
      width: "w-24",
      skeletonWidth: "w-20",
      render: (v) => (
        <span className="text-xs text-gray-500">{v.visitDate}</span>
      ),
    },
    {
      key: "doctor",
      header: "Doctor",
      skeletonWidth: "w-28",
      render: (v) => (
        <span className="text-xs text-gray-700">{v.doctorId?.name ?? "—"}</span>
      ),
    },
    {
      key: "complaint",
      header: "Complaint",
      skeletonWidth: "w-36",
      render: (v) => (
        <span className="text-xs text-gray-500 max-w-xs truncate">
          {v.chiefComplaint || "—"}
        </span>
      ),
    },
    {
      key: "paid",
      header: "Paid",
      align: "right",
      width: "w-24",
      skeletonWidth: "w-16",
      render: (v) => (
        <span className="text-xs font-mono text-gray-800">
          {fmt(v.paidAmount)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "center",
      width: "w-10",
      skeletonWidth: "w-6",
      render: (v) => (
        <button
          onClick={() => printOpd(v)}
          title="Print"
          className="p-1 rounded hover:bg-primary-50 text-gray-400 hover:text-primary-600"
        >
          <Printer className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ];

  return (
    <DataTable<OpdVisit>
      columns={columns}
      data={visits}
      rowKey={(v) => v._id}
      loading={loading}
      emptyText="No OPD visits found"
      wrapperClassName="border-0"
    />
  );
}
