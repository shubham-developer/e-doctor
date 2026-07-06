"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useApiQuery } from "@/lib/useApiQuery";
import { useApp } from "@/lib/context";
import { ArrowLeft, BedDouble, LogOut, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TabBar } from "@/components/common/TabBar";
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
import { FilesTab } from "@/components/ipd/FilesTab";
import { VitalsTab } from "@/components/ipd/VitalsTab";
import { EditDialog } from "@/components/ipd/EditDialog";
import type { IpdDetail } from "@/components/ipd/types";

// ── Tab list ──────────────────────────────────────────────────────────────────

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "nurse-notes", label: "Nurse Notes" },
  { key: "vitals", label: "Vitals" },
  { key: "medication", label: "Medication" },
  { key: "lab-investigation", label: "Lab Investigation" },
  { key: "charges", label: "Charges" },
  { key: "payments", label: "Payments" },
  { key: "bed-history", label: "Bed History" },
  { key: "files", label: "Files" },
  { key: "discharge-summary", label: "Discharge Summary" },
];

export default function IpdProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useApp();
  const [activeTab, setActiveTab] = useState("overview");
  const [discharging, setDischarging] = useState(false);
  const [confirmDischarge, setConfirmDischarge] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const canEdit = user?.role !== "VIEWER";
  const queryClient = useQueryClient();

  const { data: admissionData, isPending: loading } = useApiQuery<IpdDetail>(
    ["ipd-admission", id],
    `/api/dashboard/ipd/${id}`,
  );
  const admission = admissionData ?? null;

  function setAdmission(updater: (prev: IpdDetail | null) => IpdDetail | null) {
    queryClient.setQueryData<IpdDetail | null>(["ipd-admission", id], (prev) =>
      updater(prev ?? null),
    );
  }

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
            className="mt-2 text-xs text-primary-600 hover:underline"
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
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => router.push("/dashboard/ipd")}
            className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold text-gray-900 uppercase tracking-wide truncate">
              {p?.name ?? "Patient"}
            </h1>
            <Badge
              className={
                admission.status === "ADMITTED"
                  ? "bg-success-100 text-success-700 border-0 text-2xs"
                  : "bg-warning-100 text-warning-700 border-0 text-2xs"
              }
            >
              {admission.status}
            </Badge>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="w-3.5 h-3.5" /> Edit
              </Button>
            )}
            {admission.status === "ADMITTED" &&
              (!confirmDischarge ? (
                <Button
                  size="sm"
                  onClick={() => setConfirmDischarge(true)}
                  className="bg-warning-500 hover:bg-warning-600 text-white"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Discharge
                </Button>
              ) : (
                <div className="flex items-center gap-2 bg-warning-50 border border-warning-200 rounded-lg px-3 py-1.5">
                  <span className="text-xs text-warning-700 font-medium">
                    Discharge patient?
                  </span>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => setConfirmDischarge(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="xs"
                    onClick={handleDischarge}
                    disabled={discharging}
                    className="bg-warning-500 hover:bg-warning-600 text-white"
                  >
                    {discharging ? "Discharging…" : "Yes, Discharge"}
                  </Button>
                </div>
              ))}
            <span className="text-xs font-mono text-primary-600 font-semibold">
              IPDN{admission.ipdNumber}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 py-2">
          <TabBar tabs={TABS} active={activeTab} onChange={setActiveTab} />
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
        {activeTab === "vitals" && (
          <VitalsTab vitalsUrl={`/api/dashboard/ipd/${admission._id}/vitals`} />
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
        {activeTab === "files" && <FilesTab ipdId={admission._id} />}
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
