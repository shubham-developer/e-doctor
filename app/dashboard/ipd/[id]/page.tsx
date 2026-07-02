"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useApp } from "@/lib/context";
import { ArrowLeft, BedDouble, LogOut, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";
import { OverviewTab } from "@/components/ipd/OverviewTab";
import { NurseNotesTab } from "@/components/ipd/NurseNotesTab";
import { BedHistoryTab } from "@/components/ipd/BedHistoryTab";
import { MedicationTab } from "@/components/ipd/MedicationTab";
import { ChargesTab } from "@/components/ipd/ChargesTab";
import { PaymentsTab } from "@/components/ipd/PaymentsTab";
import { LabInvestigationTab } from "@/components/ipd/LabInvestigationTab";
import { DischargeSummaryTab } from "@/components/ipd/DischargeSummaryTab";
import { EditDialog } from "@/components/ipd/EditDialog";
import type { IpdDetail } from "@/components/ipd/types";

// ── Tab list ──────────────────────────────────────────────────────────────────

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "nurse-notes", label: "Nurse Notes" },
  { key: "medication", label: "Medication" },
  { key: "lab-investigation", label: "Lab Investigation" },
  { key: "charges", label: "Charges" },
  { key: "payments", label: "Payments" },
  { key: "bed-history", label: "Bed History" },
  { key: "discharge-summary", label: "Discharge Summary" },
];

export default function IpdProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useApp();
  const [admission, setAdmission] = useState<IpdDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [discharging, setDischarging] = useState(false);
  const [confirmDischarge, setConfirmDischarge] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const canEdit = user?.role !== "VIEWER";

  async function handleDischarge() {
    setDischarging(true);
    try {
      // Check outstanding balance before allowing discharge
      const [chargesRes, paymentsRes] = await Promise.all([
        apiClient.get<{ total: number }[]>(`/api/dashboard/ipd/${id}/charges`),
        apiClient.get<{ amount: number }[]>(
          `/api/dashboard/ipd/${id}/payments`,
        ),
      ]);
      const totalCharges = chargesRes.success
        ? (chargesRes.data as unknown as { total: number }[]).reduce(
            (s, c) => s + c.total,
            0,
          )
        : 0;
      const totalPaid = paymentsRes.success
        ? (paymentsRes.data as unknown as { amount: number }[]).reduce(
            (s, p) => s + p.amount,
            0,
          )
        : 0;
      const balance = totalCharges - totalPaid;

      if (balance > 0) {
        toast.error(
          `Cannot discharge — outstanding balance of ₹${balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}. Please clear all dues first.`,
        );
        setConfirmDischarge(false);
        return;
      }

      const res = await apiClient.patch<IpdDetail>(`/api/dashboard/ipd/${id}`, {
        status: "DISCHARGED",
      });
      if (res.success) {
        setAdmission((prev) =>
          prev
            ? {
                ...prev,
                status: "DISCHARGED",
                dischargeDate: res.data.dischargeDate,
              }
            : prev,
        );
        setConfirmDischarge(false);
      }
    } finally {
      setDischarging(false);
    }
  }

  useEffect(() => {
    apiClient
      .get<IpdDetail>(`/api/dashboard/ipd/${id}`)
      .then((d) => {
        if (d.success) setAdmission(d.data);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <BedDouble className="w-10 h-10 animate-pulse" />
          <p className="text-sm">Loading patient…</p>
        </div>
      </div>
    );
  }

  if (!admission) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-gray-400">
          <p className="text-sm font-medium">IPD record not found</p>
          <button
            onClick={() => router.back()}
            className="mt-2 text-xs text-blue-600 hover:underline"
          >
            ← Back to IPD
          </button>
        </div>
      </div>
    );
  }

  const p = admission.patientId;

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-hidden">
      {/* ── Tab bar ── */}
      <div className="bg-white border-b border-gray-200 shrink-0">
        {/* Back + patient name row */}
        <div className="flex items-center gap-3 px-4 pt-3 pb-2">
          <button
            onClick={() => router.push("/dashboard/ipd")}
            className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
              {p?.name ?? "Patient"}
            </h1>
            <Badge
              className={
                admission.status === "ADMITTED"
                  ? "bg-green-100 text-green-700 border-0 text-[10px]"
                  : "bg-orange-100 text-orange-700 border-0 text-[10px]"
              }
            >
              {admission.status}
            </Badge>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {canEdit && (
              <button
                onClick={() => setEditOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
            )}
            {admission.status === "ADMITTED" &&
              (!confirmDischarge ? (
                <button
                  onClick={() => setConfirmDischarge(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Discharge
                </button>
              ) : (
                <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-1.5">
                  <span className="text-xs text-orange-700 font-medium">
                    Discharge patient?
                  </span>
                  <button
                    onClick={() => setConfirmDischarge(false)}
                    className="text-xs text-gray-500 hover:text-gray-700 px-2 py-0.5 rounded hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDischarge}
                    disabled={discharging}
                    className="text-xs font-medium text-white bg-orange-500 hover:bg-orange-600 px-2 py-0.5 rounded transition-colors disabled:opacity-60"
                  >
                    {discharging ? "Discharging…" : "Yes, Discharge"}
                  </button>
                </div>
              ))}
            <span className="text-xs font-mono text-blue-600 font-semibold">
              IPDN{admission.ipdNumber}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto scrollbar-none px-4 gap-0">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={[
                "shrink-0 px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap",
                activeTab === tab.key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300",
              ].join(" ")}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "overview" && <OverviewTab admission={admission} />}
        {activeTab === "nurse-notes" && (
          <NurseNotesTab patientId={admission.patientId?._id ?? ""} />
        )}
        {activeTab === "bed-history" && (
          <BedHistoryTab history={admission.bedHistory ?? []} />
        )}
        {activeTab === "medication" && <MedicationTab ipdId={admission._id} />}
        {activeTab === "lab-investigation" && (
          <LabInvestigationTab ipdId={admission._id} />
        )}
        {activeTab === "charges" && (
          <ChargesTab ipdId={admission._id} admission={admission} />
        )}
        {activeTab === "payments" && (
          <PaymentsTab ipdId={admission._id} admission={admission} />
        )}
        {activeTab === "discharge-summary" && (
          <DischargeSummaryTab ipdId={admission._id} admission={admission} />
        )}
      </div>

      {editOpen && (
        <EditDialog
          admission={admission}
          onClose={() => setEditOpen(false)}
          onSaved={(updated) =>
            setAdmission((prev) => (prev ? { ...prev, ...updated } : prev))
          }
        />
      )}
    </div>
  );
}
