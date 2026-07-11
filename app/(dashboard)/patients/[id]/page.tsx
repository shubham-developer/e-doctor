"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useApiQuery } from "@/lib/useApiQuery";
import { useParams, useRouter } from "next/navigation";
import { useApp, useCurrency, useDateFormatter } from "@/lib/context";
import {
  ArrowLeft,
  Pencil,
  User,
  Phone,
  Mail,
  MapPin,
  Heart,
  Shield,
  AlertCircle,
  Hash,
  Users,
  Plus,
  Activity,
  Clock,
  Trash2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { TabBar } from "@/components/common/TabBar";
import { printOpdReceipt } from "@/components/patients/OpdReceiptPrinter";
import { printPathologyBillReceipt } from "@/components/pathology/PathologyBillPrinter";
import { printPharmacyBillReceipt } from "@/components/pharmacy/PharmacyBillPrinter";
import {
  PatientForm,
  type PatientFormData,
} from "@/components/patients/PatientForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Printer } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Patient {
  _id: string;
  uhid?: number;
  name: string;
  guardianName?: string;
  gender?: string;
  age: number;
  ageMonths?: number;
  ageDays?: number;
  dateOfBirth?: string;
  bloodGroup?: string;
  maritalStatus?: string;
  phone?: string;
  email?: string;
  address?: string;
  remarks?: string;
  allergies?: string;
  tpa?: string;
  tpaId?: string;
  tpaValidity?: string;
  nationalId?: string;
  alternateNumber?: string;
  createdAt: string;
}

interface OpdVisit {
  _id: string;
  opdNumber: number;
  visitDate: string;
  doctorId?: { name: string; specialization?: string } | null;
  chiefComplaint?: string;
  charges: { name: string; fee: number }[];
  paidAmount: number;
  createdAt: string;
}

interface IpdAdmission {
  _id: string;
  ipdn?: string;
  admissionDate: string;
  dischargeDate?: string;
  status: "ADMITTED" | "DISCHARGED";
  bedGroup?: string;
  bedNumber?: string;
  doctorId?: { name: string; specialization?: string } | null;
  creditLimit?: number;
  caseType?: string;
}

interface PharmacyBill {
  _id: string;
  billNumber: number;
  caseId?: string;
  doctorName?: string;
  lines: {
    medicineName: string;
    quantity: number;
    salePrice: number;
    taxPercent: number;
    discountPercent: number;
    amount: number;
    batchNo?: string;
    expiryDate?: string;
  }[];
  totalAmount: number;
  discountAmount: number;
  taxAmount: number;
  netAmount: number;
  paidAmount: number;
  paymentMode: string;
  createdAt: string;
}

interface NurseNote {
  _id: string;
  note: string;
  vitalSigns?: {
    bp?: string;
    pulse?: number;
    temp?: number;
    weight?: number;
    o2Sat?: number;
    respRate?: number;
  };
  addedByName: string;
  addedByRole: string;
  createdAt: string;
}

interface PathologyBill {
  _id: string;
  billNo: string;
  billDate: string;
  items: {
    testName: string;
    reportDate?: string;
    charge: number;
    tax: number;
    amount: number;
  }[];
  amount: number;
  discount: number;
  netAmount: number;
  paidAmount: number;
  balance: number;
  referenceDoctor?: string;
  paymentMode?: string;
  note?: string;
  previousReportValue?: string;
  caseId?: string;
}

interface History {
  opd: OpdVisit[];
  ipd: IpdAdmission[];
  pharmacy: PharmacyBill[];
  pathology: PathologyBill[];
  nurseNotes: NurseNote[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

type TabKey = "opd" | "ipd" | "pharmacy" | "pathology" | "nurseNotes";
const TABS: { key: TabKey; label: string }[] = [
  { key: "opd", label: "OPD History" },
  { key: "ipd", label: "IPD History" },
  { key: "pharmacy", label: "Pharmacy Bills" },
  { key: "pathology", label: "Pathology Bills" },
  { key: "nurseNotes", label: "Nurse Notes" },
];

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

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ADMITTED: "bg-primary-100 text-primary-700",
    DISCHARGED: "bg-success-100 text-success-700",
  };
  return (
    <span
      className={`inline-flex px-1.5 py-0.5 rounded text-2xs font-semibold ${colors[status] ?? "bg-gray-100 text-gray-600"}`}
    >
      {status}
    </span>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="py-12 text-center text-sm text-gray-400">
      No {label} found
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PatientProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { tenant } = useApp();
  const { sym, fmt } = useCurrency();
  const { formatDate } = useDateFormatter();

  const [tab, setTab] = useState<TabKey>("opd");
  const [editOpen, setEditOpen] = useState(false);
  const [addNoteOpen, setAddNoteOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: patientData, isPending: loading } = useApiQuery<Patient>(
    ["patient", id],
    `/api/dashboard/patients/${id}`,
  );
  const patient = patientData ?? null;

  const {
    data: historyData,
    isPending: hLoading,
    refetch: refetchHistory,
  } = useApiQuery<History>(
    ["patient-history", id],
    `/api/dashboard/patients/${id}/history`,
  );
  const history = historyData ?? null;

  async function handleEdit(body: PatientFormData) {
    const res = await fetch(`/api/dashboard/patients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.success) {
      queryClient.setQueryData(["patient", id], data.data);
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      setEditOpen(false);
    }
  }

  function printOpd(visit: OpdVisit) {
    if (!patient) return;
    printOpdReceipt({
      opdNumber: visit.opdNumber,
      visitDate: visit.visitDate,
      visitTime: visit.createdAt
        ? new Date(visit.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }).toUpperCase()
        : "",
      patientName: patient.name,
      uhid: patient.uhid,
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
    });
  }

  function printPath(bill: PathologyBill) {
    if (!patient) return;
    const taxTotal = bill.items.reduce(
      (s, i) => s + (i.charge * i.tax) / 100,
      0,
    );
    printPathologyBillReceipt({
      billNo: bill.billNo,
      billDate: bill.billDate,
      caseId: bill.caseId,
      patientName: patient.name,
      uhid: patient.uhid
        ? String(patient.uhid)
        : undefined,
      referenceDoctor: bill.referenceDoctor,
      note: bill.note,
      previousReportValue: bill.previousReportValue,
      items: bill.items,
      totalAmount: bill.amount,
      discountAmount: bill.discount,
      taxAmount: taxTotal,
      netAmount: bill.netAmount,
      paidAmount: bill.paidAmount,
      balance: bill.balance,
      paymentMode: bill.paymentMode,
      clinicName: tenant?.name ?? "Clinic",
      clinicAddress: tenant?.address,
      clinicPhone: tenant?.phone,
      logoUrl: tenant?.logoUrl,
      printLayouts: tenant?.printLayouts,
      currencySymbol: sym,
    });
  }

  function printPhar(bill: PharmacyBill) {
    if (!patient) return;
    printPharmacyBillReceipt({
      billNumber: bill.billNumber,
      billDate: bill.createdAt
        ? new Date(bill.createdAt).toLocaleDateString("en-IN")
        : "",
      patientName: patient.name,
      uhid: patient.uhid
        ? String(patient.uhid)
        : undefined,
      doctorName: bill.doctorName,
      lines: (bill.lines ?? []).map((l) => ({
        medicineName: l.medicineName,
        batchNo: l.batchNo,
        expiryDate: l.expiryDate,
        quantity: l.quantity,
        salePrice: l.salePrice,
        taxPercent: l.taxPercent,
        discountPercent: l.discountPercent,
        amount: l.amount,
      })),
      totalAmount: bill.totalAmount,
      discountAmount: bill.discountAmount,
      taxAmount: bill.taxAmount,
      netAmount: bill.netAmount,
      paidAmount: bill.paidAmount,
      paymentMode: bill.paymentMode,
      clinicName: tenant?.name ?? "Clinic",
      clinicAddress: tenant?.address,
      clinicPhone: tenant?.phone,
      logoUrl: tenant?.logoUrl,
      printLayouts: tenant?.printLayouts,
    });
  }

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

  // ── Tab counts ──
  const counts = {
    opd: history?.opd.length ?? 0,
    ipd: history?.ipd.length ?? 0,
    pharmacy: history?.pharmacy.length ?? 0,
    pathology: history?.pathology.length ?? 0,
    nurseNotes: history?.nurseNotes.length ?? 0,
  };

  async function handleDeleteNote(noteId: string) {
    if (!confirm("Delete this note?")) return;
    const res = await fetch(`/api/dashboard/nurse-notes/${noteId}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (data.success) refetchHistory();
  }

  function handleNoteSaved(_note: NurseNote) {
    refetchHistory();
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Edit dialog */}
      {editOpen && patient && (
        <Dialog open onOpenChange={setEditOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Patient</DialogTitle>
            </DialogHeader>
            <PatientForm
              initial={patient as unknown as Partial<PatientFormData>}
              onSave={handleEdit}
              onClose={() => setEditOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* ── Top bar ── */}
      <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center gap-3 shrink-0">
        <button
          onClick={() => router.push("/patients")}
          className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        {loading ? (
          <Skeleton className="h-5 w-40" />
        ) : (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <h1 className="text-sm font-bold text-gray-900 uppercase tracking-wide truncate">
              {patient?.name}
            </h1>
            {patient?.uhid && (
              <span className="text-2xs bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded font-mono">
                UHID{patient.uhid}
              </span>
            )}
            {patient?.gender && (
              <span className="text-2xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                {patient.gender}
              </span>
            )}
          </div>
        )}
        <button
          onClick={() => setEditOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 ml-auto shrink-0"
        >
          <Pencil className="w-3 h-3" /> Edit
        </button>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 flex gap-4 p-4 min-h-0 overflow-hidden">
        {/* ── Left panel ── */}
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
                  <InfoRow
                    icon={User}
                    label="Age"
                    value={ageParts || undefined}
                  />
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
                  <InfoRow
                    icon={MapPin}
                    label="Address"
                    value={patient?.address}
                  />
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
          {!hLoading && (
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
                  <div
                    key={r.label}
                    className="flex items-center justify-between"
                  >
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

        {/* ── Right panel ── */}
        <div className="flex-1 flex flex-col bg-white border border-gray-200 rounded-lg overflow-hidden min-w-0">
          {/* Tabs */}
          <div className="px-3 py-2 border-b border-gray-200 shrink-0">
            <TabBar
              tabs={TABS.map((t) => ({
                ...t,
                count: hLoading ? undefined : counts[t.key],
              }))}
              active={tab}
              onChange={setTab}
            />
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-auto">
            {hLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <>
                {/* OPD */}
                {tab === "opd" &&
                  (history?.opd.length === 0 ? (
                    <EmptyState label="OPD visits" />
                  ) : (
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium text-gray-600 w-20">
                            OPD No
                          </th>
                          <th className="text-left px-3 py-2 font-medium text-gray-600 w-24">
                            Date
                          </th>
                          <th className="text-left px-3 py-2 font-medium text-gray-600">
                            Doctor
                          </th>
                          <th className="text-left px-3 py-2 font-medium text-gray-600">
                            Complaint
                          </th>
                          <th className="text-right px-3 py-2 font-medium text-gray-600 w-24">
                            Paid
                          </th>
                          <th className="w-8" />
                        </tr>
                      </thead>
                      <tbody>
                        {history?.opd.map((v) => (
                          <tr
                            key={v._id}
                            className="border-t border-gray-100 hover:bg-gray-50"
                          >
                            <td className="px-3 py-2 font-mono text-primary-700">
                              OPD{String(v.opdNumber).padStart(3, "0")}
                            </td>
                            <td className="px-3 py-2 text-gray-500">
                              {v.visitDate}
                            </td>
                            <td className="px-3 py-2 text-gray-700">
                              {v.doctorId?.name ?? "—"}
                            </td>
                            <td className="px-3 py-2 text-gray-500 max-w-xs truncate">
                              {v.chiefComplaint || "—"}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-gray-800">
                              {fmt(v.paidAmount)}
                            </td>
                            <td className="px-2 py-2">
                              <button
                                onClick={() => printOpd(v)}
                                title="Print"
                                className="p-1 rounded hover:bg-primary-50 text-gray-400 hover:text-primary-600"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ))}

                {/* IPD */}
                {tab === "ipd" &&
                  (history?.ipd.length === 0 ? (
                    <EmptyState label="IPD admissions" />
                  ) : (
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium text-gray-600 w-28">
                            Admission Date
                          </th>
                          <th className="text-left px-3 py-2 font-medium text-gray-600 w-24">
                            Discharge
                          </th>
                          <th className="text-left px-3 py-2 font-medium text-gray-600">
                            Doctor
                          </th>
                          <th className="text-left px-3 py-2 font-medium text-gray-600 w-24">
                            Bed
                          </th>
                          <th className="text-left px-3 py-2 font-medium text-gray-600 w-20">
                            Status
                          </th>
                          <th className="text-right px-3 py-2 font-medium text-gray-600 w-24">
                            Credit Limit
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {history?.ipd.map((a) => (
                          <tr
                            key={a._id}
                            className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer"
                            onClick={() =>
                              router.push(`/ipd/${a._id}`)
                            }
                          >
                            <td className="px-3 py-2 text-gray-700">
                              {formatDate(a.admissionDate.split("T")[0])}
                            </td>
                            <td className="px-3 py-2 text-gray-500">
                              {a.dischargeDate ? formatDate(a.dischargeDate.split("T")[0]) : "—"}
                            </td>
                            <td className="px-3 py-2 text-gray-700">
                              {a.doctorId?.name ?? "—"}
                            </td>
                            <td className="px-3 py-2 text-gray-500">
                              {[a.bedGroup, a.bedNumber]
                                .filter(Boolean)
                                .join(" / ") || "—"}
                            </td>
                            <td className="px-3 py-2">
                              <StatusBadge status={a.status} />
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-gray-700">
                              {a.creditLimit ? fmt(a.creditLimit) : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ))}

                {/* Pharmacy */}
                {tab === "pharmacy" &&
                  (history?.pharmacy.length === 0 ? (
                    <EmptyState label="pharmacy bills" />
                  ) : (
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium text-gray-600 w-28">
                            Bill No
                          </th>
                          <th className="text-left px-3 py-2 font-medium text-gray-600 w-24">
                            Date
                          </th>
                          <th className="text-left px-3 py-2 font-medium text-gray-600 w-14">
                            Items
                          </th>
                          <th className="text-left px-3 py-2 font-medium text-gray-600">
                            Doctor
                          </th>
                          <th className="text-right px-3 py-2 font-medium text-gray-600 w-24">
                            Net Amount
                          </th>
                          <th className="text-right px-3 py-2 font-medium text-gray-600 w-24">
                            Paid
                          </th>
                          <th className="text-right px-3 py-2 font-medium text-gray-600 w-24">
                            Balance
                          </th>
                          <th className="w-8" />
                        </tr>
                      </thead>
                      <tbody>
                        {history?.pharmacy.map((b) => {
                          const balance = b.netAmount - b.paidAmount;
                          return (
                            <tr
                              key={b._id}
                              className="border-t border-gray-100 hover:bg-gray-50"
                            >
                              <td className="px-3 py-2 font-mono text-primary-700">
                                PHARMAB{b.billNumber}
                              </td>
                              <td className="px-3 py-2 text-gray-500">
                                {b.createdAt
                                  ? new Date(b.createdAt).toLocaleDateString(
                                      "en-IN",
                                    )
                                  : "—"}
                              </td>
                              <td className="px-3 py-2 text-center text-gray-600">
                                {b.lines?.length ?? 0}
                              </td>
                              <td className="px-3 py-2 text-gray-500">
                                {b.doctorName || "—"}
                              </td>
                              <td className="px-3 py-2 text-right font-mono text-gray-800">
                                {fmt(b.netAmount)}
                              </td>
                              <td className="px-3 py-2 text-right font-mono text-success-700">
                                {fmt(b.paidAmount)}
                              </td>
                              <td
                                className="px-3 py-2 text-right font-mono font-semibold"
                                style={{
                                  color: balance > 0 ? "#dc2626" : "#16a34a",
                                }}
                              >
                                {fmt(balance)}
                              </td>
                              <td className="px-2 py-2">
                                <button
                                  onClick={() => printPhar(b)}
                                  title="Print"
                                  className="p-1 rounded hover:bg-primary-50 text-gray-400 hover:text-primary-600"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ))}

                {/* Pathology */}
                {tab === "pathology" &&
                  (history?.pathology.length === 0 ? (
                    <EmptyState label="pathology bills" />
                  ) : (
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium text-gray-600 w-24">
                            Bill No
                          </th>
                          <th className="text-left px-3 py-2 font-medium text-gray-600 w-24">
                            Date
                          </th>
                          <th className="text-left px-3 py-2 font-medium text-gray-600 w-14">
                            Tests
                          </th>
                          <th className="text-left px-3 py-2 font-medium text-gray-600">
                            Ref. Doctor
                          </th>
                          <th className="text-right px-3 py-2 font-medium text-gray-600 w-24">
                            Net Amount
                          </th>
                          <th className="text-right px-3 py-2 font-medium text-gray-600 w-24">
                            Paid
                          </th>
                          <th className="text-right px-3 py-2 font-medium text-gray-600 w-24">
                            Balance
                          </th>
                          <th className="w-8" />
                        </tr>
                      </thead>
                      <tbody>
                        {history?.pathology.map((b) => (
                          <tr
                            key={b._id}
                            className="border-t border-gray-100 hover:bg-gray-50"
                          >
                            <td className="px-3 py-2 font-mono text-primary-700">
                              {b.billNo}
                            </td>
                            <td className="px-3 py-2 text-gray-500">
                              {b.billDate}
                            </td>
                            <td className="px-3 py-2 text-center text-gray-600">
                              {b.items?.length ?? 0}
                            </td>
                            <td className="px-3 py-2 text-gray-500">
                              {b.referenceDoctor || "—"}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-gray-800">
                              {fmt(b.netAmount)}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-success-700">
                              {fmt(b.paidAmount)}
                            </td>
                            <td
                              className="px-3 py-2 text-right font-mono font-semibold"
                              style={{
                                color: b.balance > 0 ? "#dc2626" : "#16a34a",
                              }}
                            >
                              {fmt(b.balance)}
                            </td>
                            <td className="px-2 py-2">
                              <button
                                onClick={() => printPath(b)}
                                title="Print"
                                className="p-1 rounded hover:bg-primary-50 text-gray-400 hover:text-primary-600"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ))}

                {/* Nurse Notes */}
                {tab === "nurseNotes" && (
                  <div className="p-3 space-y-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-gray-500 font-medium">
                        {counts.nurseNotes} note
                        {counts.nurseNotes !== 1 ? "s" : ""}
                      </p>
                      <button
                        onClick={() => setAddNoteOpen(true)}
                        className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 font-medium"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Note
                      </button>
                    </div>
                    {counts.nurseNotes === 0 ? (
                      <div className="py-10 text-center">
                        <Activity className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">
                          No nurse notes yet
                        </p>
                        <button
                          onClick={() => setAddNoteOpen(true)}
                          className="text-xs text-primary-600 hover:underline mt-1"
                        >
                          Add the first note
                        </button>
                      </div>
                    ) : (
                      history?.nurseNotes.map((n) => (
                        <div
                          key={n._id}
                          className="border border-gray-200 rounded-lg p-3 bg-white"
                        >
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div>
                              <span className="text-xs font-semibold text-gray-700">
                                {n.addedByName}
                              </span>
                              <span className="text-2xs text-gray-400 ml-1.5">
                                {n.addedByRole}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="flex items-center gap-1 text-2xs text-gray-400">
                                <Clock className="w-3 h-3" />
                                {new Date(n.createdAt).toLocaleString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                              <button
                                onClick={() => handleDeleteNote(n._id)}
                                className="p-0.5 rounded hover:bg-danger-50 text-gray-300 hover:text-danger-500"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                            {n.note}
                          </p>
                          {n.vitalSigns &&
                            (n.vitalSigns.bp ||
                              n.vitalSigns.pulse ||
                              n.vitalSigns.temp ||
                              n.vitalSigns.weight ||
                              n.vitalSigns.o2Sat ||
                              n.vitalSigns.respRate) && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {n.vitalSigns.bp && (
                                  <span className="text-2xs bg-primary-50 text-primary-700 px-1.5 py-0.5 rounded">
                                    BP: {n.vitalSigns.bp}
                                  </span>
                                )}
                                {n.vitalSigns.pulse && (
                                  <span className="text-2xs bg-primary-50 text-primary-700 px-1.5 py-0.5 rounded">
                                    Pulse: {n.vitalSigns.pulse} bpm
                                  </span>
                                )}
                                {n.vitalSigns.temp && (
                                  <span className="text-2xs bg-primary-50 text-primary-700 px-1.5 py-0.5 rounded">
                                    Temp: {n.vitalSigns.temp}°F
                                  </span>
                                )}
                                {n.vitalSigns.weight && (
                                  <span className="text-2xs bg-primary-50 text-primary-700 px-1.5 py-0.5 rounded">
                                    Wt: {n.vitalSigns.weight} kg
                                  </span>
                                )}
                                {n.vitalSigns.o2Sat && (
                                  <span className="text-2xs bg-primary-50 text-primary-700 px-1.5 py-0.5 rounded">
                                    O₂: {n.vitalSigns.o2Sat}%
                                  </span>
                                )}
                                {n.vitalSigns.respRate && (
                                  <span className="text-2xs bg-primary-50 text-primary-700 px-1.5 py-0.5 rounded">
                                    RR: {n.vitalSigns.respRate}/min
                                  </span>
                                )}
                              </div>
                            )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Add Note Dialog (inline, patient pre-filled) */}
      {addNoteOpen && patient && (
        <AddNoteDialogInline
          patient={patient}
          onClose={() => setAddNoteOpen(false)}
          onSaved={handleNoteSaved}
        />
      )}
    </div>
  );
}

// Inline add-note dialog used from patient profile (patient is pre-filled)
function AddNoteDialogInline({
  patient,
  onClose,
  onSaved,
}: {
  patient: { _id: string; name: string; uhid?: number };
  onClose: () => void;
  onSaved: (note: NurseNote) => void;
}) {
  const [note, setNote] = useState("");
  const [showVitals, setShowVitals] = useState(false);
  const [vitals, setVitals] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function setVital(k: string, v: string) {
    setVitals((prev) => ({ ...prev, [k]: v }));
  }

  async function handleSave() {
    if (!note.trim()) {
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = { patientId: patient._id, note };
      const filled: Record<string, unknown> = {};
      if (vitals.bp) filled.bp = vitals.bp;
      if (vitals.pulse) filled.pulse = Number(vitals.pulse);
      if (vitals.temp) filled.temp = Number(vitals.temp);
      if (vitals.weight) filled.weight = Number(vitals.weight);
      if (vitals.o2Sat) filled.o2Sat = Number(vitals.o2Sat);
      if (vitals.respRate) filled.respRate = Number(vitals.respRate);
      if (Object.keys(filled).length) body.vitalSigns = filled;

      const res = await fetch("/api/dashboard/nurse-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) return;
      onSaved(data.data);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-medium text-gray-900 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary-600" /> Add Nurse Note
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 text-gray-400"
          >
            ✕
          </button>
        </div>

        <div className="mb-3 flex items-center gap-2 bg-primary-50 border border-primary-100 rounded-lg px-3 py-2">
          <User className="w-4 h-4 text-primary-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-gray-800">
              {patient.name}
            </p>
            {patient.uhid && (
              <p className="text-2xs text-gray-400">
                UHID: {patient.uhid}
              </p>
            )}
          </div>
        </div>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Enter clinical observation, instructions, or follow-up notes…"
          rows={4}
          className="w-full text-sm border border-gray-300 rounded-lg p-2.5 resize-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none mb-3"
        />

        <button
          type="button"
          onClick={() => setShowVitals((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-800 font-medium mb-3"
        >
          <Activity className="w-3.5 h-3.5" />
          {showVitals ? "Hide" : "Add"} Vital Signs (optional)
        </button>

        {showVitals && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { key: "bp", label: "BP", placeholder: "120/80" },
              { key: "pulse", label: "Pulse (bpm)", placeholder: "72" },
              { key: "temp", label: "Temp (°F)", placeholder: "98.6" },
              { key: "weight", label: "Weight (kg)", placeholder: "70" },
              { key: "o2Sat", label: "O₂ Sat (%)", placeholder: "99" },
              { key: "respRate", label: "RR (/min)", placeholder: "16" },
            ].map((f) => (
              <div key={f.key}>
                <label className="block text-2xs text-gray-500 mb-0.5">
                  {f.label}
                </label>
                <input
                  value={vitals[f.key] ?? ""}
                  onChange={(e) => setVital(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  className="w-full h-8 text-xs border border-gray-300 rounded px-2 focus:border-primary-400 outline-none"
                />
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 h-9 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !note.trim()}
            className="flex-1 h-9 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Note"}
          </button>
        </div>
      </div>
    </div>
  );
}
