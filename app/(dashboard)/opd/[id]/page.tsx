"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useApp } from "@/lib/context";
import { ArrowLeft, Printer, ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TabBar } from "@/components/common/TabBar";
import { useApiQuery } from "@/lib/useApiQuery";
import { printOpdReceipt } from "@/components/patients/OpdReceiptPrinter";
import { OpdOverviewTab } from "@/components/opd/OpdOverviewTab";
import { OpdVisitsTab } from "@/components/opd/OpdVisitsTab";
import { OpdMedicationTab } from "@/components/opd/OpdMedicationTab";
import { OpdLabInvestigationTab } from "@/components/opd/OpdLabInvestigationTab";
import { OpdChargesTab } from "@/components/opd/OpdChargesTab";
import { OpdPaymentsTab } from "@/components/opd/OpdPaymentsTab";
import { VitalsTab } from "@/components/ipd/VitalsTab";
import type {
  OpdVisitDetail,
  OpdPrescription,
  OpdPatientHistory,
} from "@/components/opd/types";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "visits", label: "Visits" },
  { key: "medication", label: "Medication" },
  { key: "lab-investigation", label: "Lab Investigation" },
  { key: "charges", label: "Charges" },
  { key: "payments", label: "Payments" },
  { key: "vitals", label: "Vitals" },
];

const STATUS_BADGE: Record<string, string> = {
  WAITING: "bg-warning-100 text-warning-700",
  IN_PROGRESS: "bg-primary-100 text-primary-700",
  COMPLETED: "bg-success-100 text-success-700",
};

export default function OpdVisitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { tenant } = useApp();

  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    setActiveTab("overview");
  }, [id]);

  const { data: visit, isPending: loading } = useApiQuery<OpdVisitDetail>(
    ["opd-visit", id],
    `/api/dashboard/opd/${id}`,
  );

  // Dependent queries — wait for the visit's patient id
  const patientId = visit?.patientId?._id;
  const { data: prescriptionsData } = useApiQuery<OpdPrescription[]>(
    ["prescriptions", patientId],
    `/api/dashboard/prescription?patientId=${patientId}`,
    { enabled: !!patientId },
  );
  const { data: historyData } = useApiQuery<OpdPatientHistory>(
    ["patient-history", patientId],
    `/api/dashboard/patients/${patientId}/history`,
    { enabled: !!patientId },
  );
  const prescriptions = prescriptionsData ?? [];
  const history = historyData ?? null;

  function printBill() {
    if (!visit) return;
    printOpdReceipt({
      opdNumber: visit.opdNumber,
      caseNumber: visit.caseNumber,
      visitDate: visit.visitDate,
      visitTime: new Date(visit.createdAt).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
      patientName: visit.patientId?.name ?? "",
      uhid: visit.patientId?.uhid,
      patientAge: visit.patientId?.age ?? 0,
      patientAgeMonths: visit.patientId?.ageMonths,
      patientDateOfBirth: visit.patientId?.dateOfBirth,
      patientGender: visit.patientId?.gender,
      patientBloodGroup: visit.patientId?.bloodGroup,
      patientAllergies: visit.patientId?.allergies,
      patientAddress: visit.patientId?.address,
      previousMedicalIssue: visit.previousMedicalIssue,
      doctorName: visit.doctorId?.name,
      doctorSpecialization: visit.doctorId?.specialization,
      chiefComplaint: visit.chiefComplaint,
      charges: visit.charges ?? [],
      appliedCharge: visit.appliedCharge,
      discount: visit.discount ?? 0,
      tax: visit.tax ?? 0,
      totalFee: visit.totalFee,
      clinicName: tenant?.name ?? "Clinic",
      clinicAddress: tenant?.address || undefined,
      logoUrl: tenant?.logoUrl || undefined,
      printLayouts: tenant?.printLayouts,
      printShowLogo: tenant?.printShowLogo,
      printHeaderImages: tenant?.printHeaderImages,
      printFooterContents: tenant?.printFooterContents,
      printLetterheads: tenant?.printLetterheads,
      printShowTitles: tenant?.printShowTitles,
      printTitleTexts: tenant?.printTitleTexts,
    });
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <ClipboardList className="w-10 h-10 animate-pulse" />
          <p className="text-sm">Loading visit…</p>
        </div>
      </div>
    );
  }

  if (!visit) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-gray-400">
          <p className="text-sm font-medium">OPD visit not found</p>
          <button
            onClick={() => router.push("/opd")}
            className="mt-2 text-xs text-primary-600 hover:underline"
          >
            ← Back to OPD
          </button>
        </div>
      </div>
    );
  }

  const p = visit.patientId;
  const prescription =
    prescriptions.find((rx) => rx.opdVisitId === visit._id) ?? null;

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-hidden">
      {/* ── Header + tab bar ── */}
      <div className="bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-3 px-4 pt-3 pb-2">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => router.push("/opd")}
            className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-sm font-bold text-gray-900 uppercase tracking-wide truncate">
              {p?.name ?? "Patient"}
            </h1>
            {visit.status && (
              <Badge
                className={`${STATUS_BADGE[visit.status] ?? "bg-gray-100 text-gray-600"} border-0 text-2xs`}
              >
                {visit.status.replace("_", " ")}
              </Badge>
            )}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={printBill}>
              <Printer className="w-3.5 h-3.5" /> Print Bill
            </Button>
            <span className="text-xs font-mono text-primary-600 font-semibold">
              OPDN{String(visit.opdNumber).padStart(4, "0")}
            </span>
          </div>
        </div>

        <div className="px-4 py-2">
          <TabBar tabs={TABS} active={activeTab} onChange={setActiveTab} />
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "overview" && (
          <OpdOverviewTab
            visit={visit}
            prescription={prescription}
            history={history}
          />
        )}
        {activeTab === "visits" && <OpdVisitsTab visits={history?.opd ?? []} />}
        {activeTab === "medication" && (
          <OpdMedicationTab
            prescriptions={prescriptions}
            currentVisitId={visit._id}
          />
        )}
        {activeTab === "lab-investigation" && (
          <OpdLabInvestigationTab
            history={history}
            prescription={prescription}
          />
        )}
        {activeTab === "charges" && (
          <OpdChargesTab visit={visit} history={history} />
        )}
        {activeTab === "payments" && (
          <OpdPaymentsTab visit={visit} history={history} />
        )}
        {activeTab === "vitals" && (
          <VitalsTab vitalsUrl={`/api/dashboard/opd/${visit._id}/vitals`} />
        )}
      </div>
    </div>
  );
}
