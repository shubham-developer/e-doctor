"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useApp, useDateFormatter } from "@/lib/context";
import { useApiQuery } from "@/lib/useApiQuery";
import { Button } from "@/components/ui/button";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { TabBar } from "@/components/common/TabBar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Printer,
  ClipboardList,
  PenLine,
  BedDouble,
  ListOrdered,
  Ticket,
} from "lucide-react";
import { printOpdReceipt } from "@/components/patients/OpdReceiptPrinter";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  PrescriptionForm,
  type OpdVisitForPrescription,
} from "@/components/opd/PrescriptionForm";
import { ManualPrescriptionForm } from "@/components/opd/ManualPrescriptionForm";
import { OpdAddForm } from "@/components/opd/OpdAddForm";
import { MoveToIpdDialog } from "@/components/opd/MoveToIpdDialog";
import { printTokenSlip } from "@/components/opd/TokenPrinter";
import type { OpdVisit } from "@/components/opd/types";

// ── Tab list ──────────────────────────────────────────────────────────────────

type Tab = "today" | "upcoming" | "old" | "patients";

const TABS: { key: Tab; label: string }[] = [
  { key: "today", label: "Today OPD" },
  { key: "upcoming", label: "Upcoming OPD" },
  { key: "old", label: "Old OPD" },
  { key: "patients", label: "Patient View" },
];

export default function OpdPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, tenant } = useApp();
  const { formatDate } = useDateFormatter();
  const [activeTab, setActiveTab] = useState<Tab>("today");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState(""); // debounced — drives the fetch
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [showAdd, setShowAdd] = useState(false);
  const [moveToIpdVisit, setMoveToIpdVisit] = useState<OpdVisit | null>(null);
  const [prescriptionVisit, setPrescriptionVisit] =
    useState<OpdVisitForPrescription | null>(null);
  const [manualPrescriptionVisit, setManualPrescriptionVisit] =
    useState<OpdVisitForPrescription | null>(null);
  const canEdit = user?.role !== "VIEWER";

  useEffect(() => {
    const id = setTimeout(() => {
      setPage(1);
      setSearch(searchInput);
    }, 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  // Topbar quick-add links here with ?new=1 to auto-open the add modal.
  const autoOpenAdd = searchParams.get("new") === "1";

  const params = new URLSearchParams({
    tab: activeTab,
    page: String(page),
    limit: String(pageSize),
  });
  if (search) params.set("search", search);
  const {
    data,
    isPending: loading,
    refetch,
  } = useApiQuery<{ visits: OpdVisit[]; total: number; totalPages: number }>(
    ["opd-visits", activeTab, search, page, pageSize],
    `/api/dashboard/opd?${params}`,
    { keepPrevious: true },
  );
  const visits = data?.visits ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  function switchTab(tab: Tab) {
    setActiveTab(tab);
    setPage(1);
    setSearch("");
    setSearchInput("");
  }

  function toVisitForPrescription(visit: OpdVisit): OpdVisitForPrescription {
    return {
      _id: visit._id,
      opdNumber: visit.opdNumber,
      visitDate: visit.visitDate,
      createdAt: visit.createdAt,
      caseNumber: visit.caseNumber,
      patientId: visit.patientId
        ? {
            _id: visit.patientId._id,
            name: visit.patientId.name,
            age: visit.patientId.age,
            ageMonths: visit.patientId.ageMonths,
            ageDays: visit.patientId.ageDays,
            dateOfBirth: visit.patientId.dateOfBirth,
            uhid: visit.patientId.uhid,
            gender: visit.patientId.gender,
            phone: visit.patientId.phone,
            address: visit.patientId.address,
            bloodGroup: visit.patientId.bloodGroup,
            allergies: visit.patientId.allergies,
          }
        : null,
      doctorId: visit.doctorId,
    };
  }

  function openPrescription(visit: OpdVisit) {
    setPrescriptionVisit(toVisitForPrescription(visit));
  }

  function printVisitReceipt(visit: OpdVisit) {
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
      patientPhone: visit.patientId?.phone,
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
    });
  }

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const opdColumns: ColumnDef<OpdVisit>[] = [
    {
      key: "opdNumber",
      header: "OPD No",
      align: "center",
      width: "w-16",
      skeletonWidth: "w-10",
      sortable: true,
      sortValue: (v) => v.opdNumber,
      render: (v) => (
        <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-primary-50 border border-primary-100 text-primary-700 font-bold text-xs">
          {String(v.opdNumber).padStart(3, "0")}
        </span>
      ),
    },
    {
      key: "patient",
      header: "Patient Name",
      skeletonWidth: "w-32",
      sortable: true,
      sortValue: (v) => v.patientId?.name ?? "",
      render: (v) => {
        const p = v.patientId;
        const age = p ? [
          p.age ? `${p.age}y` : "",
          p.ageMonths ? `${p.ageMonths}m` : "",
          p.ageDays ? `${p.ageDays}d` : "",
        ].filter(Boolean).join(" ") : "";
        return (
          <div>
            <p className="text-xs font-medium text-gray-900 whitespace-nowrap">
              {p?.name ?? "—"}
            </p>
            {(age || p?.gender) && (
              <p className="text-2xs text-gray-400">
                {[age, p?.gender].filter(Boolean).join(" / ")}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: "uhid",
      header: "UHID",
      skeletonWidth: "w-16",
      render: (v) => (
        <span className="text-xs text-gray-600 whitespace-nowrap">
          {v.patientId?.uhid ? String(v.patientId.uhid) : "—"}
        </span>
      ),
    },
    {
      key: "visitDate",
      header: "Appt. Date & Time",
      skeletonWidth: "w-32",
      sortable: true,
      sortValue: (v) => v.visitDate,
      render: (v) => (
        <div className="whitespace-nowrap">
          <p className="text-xs text-gray-700">
            {v.visitDate ? formatDate(v.visitDate) : "—"}
          </p>
          {v.createdAt && (
            <p className="text-2xs text-gray-400">
              {new Date(v.createdAt)
                .toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })
                .toUpperCase()}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "generatedBy",
      header: "Generated By",
      skeletonWidth: "w-24",
      render: (v) => (
        <span className="text-xs text-gray-500 whitespace-nowrap">
          {v.createdBy?.name ?? "—"}
        </span>
      ),
    },
    {
      key: "consultant",
      header: "Consultant",
      skeletonWidth: "w-24",
      sortable: true,
      sortValue: (v) => v.doctorId?.name ?? "",
      render: (v) => (
        <span className="text-xs text-gray-600 whitespace-nowrap">
          {v.doctorId?.name ?? "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Action",
      align: "center",
      width: "w-28",
      skeletonWidth: "w-20",
      render: (v) => (
        <TooltipProvider delay={300}>
          <div className="flex items-center justify-center gap-1">
            <Tooltip>
              <TooltipTrigger
                onClick={(e) => {
                  e.stopPropagation();
                  printVisitReceipt(v);
                }}
                className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-primary-600 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
              </TooltipTrigger>
              <TooltipContent side="top">Print OPD Bill</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                onClick={(e) => {
                  e.stopPropagation();
                  printTokenSlip({
                    tokenNumber: v.opdNumber,
                    patientName: v.patientId?.name ?? "Patient",
                    uhid:
                      v.patientId?.uhid != null
                        ? String(v.patientId.uhid)
                        : undefined,
                    doctorName: v.doctorId?.name,
                    chiefComplaint: v.chiefComplaint || undefined,
                    visitDate: v.visitDate,
                    clinicName: tenant?.name ?? "Clinic",
                    clinicPhone: tenant?.phone,
                  });
                }}
                className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-warning-600 transition-colors"
              >
                <Ticket className="w-3.5 h-3.5" />
              </TooltipTrigger>
              <TooltipContent side="top">Print Token Slip</TooltipContent>
            </Tooltip>
            {canEdit && (
              <Tooltip>
                <TooltipTrigger
                  onClick={(e) => {
                    e.stopPropagation();
                    setManualPrescriptionVisit(toVisitForPrescription(v));
                  }}
                  className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-purple-600 transition-colors"
                >
                  <PenLine className="w-3.5 h-3.5" />
                </TooltipTrigger>
                <TooltipContent side="top">Manual Prescription</TooltipContent>
              </Tooltip>
            )}
            {canEdit && (
              <Tooltip>
                <TooltipTrigger
                  onClick={(e) => {
                    e.stopPropagation();
                    openPrescription(v);
                  }}
                  className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-primary-600 transition-colors"
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                </TooltipTrigger>
                <TooltipContent side="top">Add Prescription</TooltipContent>
              </Tooltip>
            )}
            {canEdit && (
              <Tooltip>
                <TooltipTrigger
                  onClick={(e) => {
                    e.stopPropagation();
                    setMoveToIpdVisit(v);
                  }}
                  className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-success-600 transition-colors"
                >
                  <BedDouble className="w-3.5 h-3.5" />
                </TooltipTrigger>
                <TooltipContent side="top">Move to IPD</TooltipContent>
              </Tooltip>
            )}
          </div>
        </TooltipProvider>
      ),
    },
  ];

  return (
    <>
      {(showAdd || autoOpenAdd) && (
        <OpdAddForm
          onClose={() => {
            setShowAdd(false);
            if (autoOpenAdd) router.replace(pathname);
          }}
          onSaved={() => refetch()}
        />
      )}

      {moveToIpdVisit && (
        <MoveToIpdDialog
          visit={moveToIpdVisit}
          onClose={() => setMoveToIpdVisit(null)}
          onDone={() => refetch()}
        />
      )}

      {prescriptionVisit && (
        <PrescriptionForm
          visit={prescriptionVisit}
          onClose={() => setPrescriptionVisit(null)}
          clinicName={tenant?.name ?? "Clinic"}
          clinicAddress={tenant?.address || undefined}
          logoUrl={tenant?.logoUrl || undefined}
        />
      )}

      {manualPrescriptionVisit && (
        <ManualPrescriptionForm
          visit={manualPrescriptionVisit}
          onClose={() => setManualPrescriptionVisit(null)}
          clinicName={tenant?.name ?? "Clinic"}
          clinicAddress={tenant?.address || undefined}
          logoUrl={tenant?.logoUrl || undefined}
        />
      )}

      <div className="h-full flex flex-col bg-white border border-gray-200 rounded-lg overflow-hidden">
        {/* ── Tab bar + Add button ── */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 shrink-0 bg-gray-50">
          <TabBar tabs={TABS} active={activeTab} onChange={switchTab} />
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1"
              onClick={() => {
                window.location.href = "/opd/queue";
              }}
            >
              <ListOrdered className="w-3.5 h-3.5" /> Queue
            </Button>
            {canEdit && (
              <Button
                size="sm"
                className="h-8 text-xs gap-1 bg-primary-600 hover:bg-primary-700"
                onClick={() => setShowAdd(true)}
              >
                <Plus className="w-3.5 h-3.5" /> Add Patient
              </Button>
            )}
          </div>
        </div>

        {/* ── Table ── */}
        <DataTable<OpdVisit>
          columns={opdColumns}
          data={visits}
          rowKey={(v) => v._id}
          onRowClick={(v) => router.push(`/opd/${v._id}`)}
          loading={loading}
          skeletonRows={6}
          emptyNode={
            <div className="flex flex-col items-center gap-2">
              <svg
                width="64"
                height="64"
                viewBox="0 0 80 80"
                fill="none"
                className="opacity-25"
              >
                <rect
                  x="8"
                  y="28"
                  width="64"
                  height="44"
                  rx="4"
                  fill="#94a3b8"
                />
                <rect
                  x="8"
                  y="20"
                  width="30"
                  height="12"
                  rx="3"
                  fill="#64748b"
                />
                <rect
                  x="20"
                  y="12"
                  width="18"
                  height="20"
                  rx="2"
                  fill="#cbd5e1"
                />
                <rect
                  x="42"
                  y="8"
                  width="18"
                  height="24"
                  rx="2"
                  fill="#cbd5e1"
                />
              </svg>
              <p className="text-sm font-medium text-danger-400">
                No data available in table
              </p>
              <p className="text-xs text-gray-400">
                Add a new record or try different search criteria.
              </p>
            </div>
          }
          wrapperClassName="flex-1 overflow-auto"
          searchValue={searchInput}
          onSearchChange={(v) => setSearchInput(v)}
          searchPlaceholder="Search by name or UHID…"
          toolbarRight={
            <Select
              value={String(pageSize)}
              onValueChange={(v) => {
                setPageSize(Number(v));
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-20 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["25", "50", "100"].map((n) => (
                  <SelectItem key={n} value={n}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
          downloadable
          printable
          fileName="opd-visits"
        />

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-3 py-1.5 border-t border-gray-200 shrink-0 bg-gray-50">
          <span className="text-xs text-gray-500">
            Records: {from} to {to} of {total}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-xs"
              className="text-gray-500 hover:bg-gray-200"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              className="text-gray-500 hover:bg-gray-200"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
