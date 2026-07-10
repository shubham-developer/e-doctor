"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronLeft,
  RefreshCw,
  Tv2,
  ChevronRight,
  CheckCircle2,
  RotateCcw,
  Ticket,
  Clock,
  UserCheck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/apiClient";
import { useApiQuery } from "@/lib/useApiQuery";
import { useApp } from "@/lib/context";
import { printTokenSlip } from "@/components/opd/TokenPrinter";
import type { OpdVisit } from "@/components/opd/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function token(n: number) {
  return `T-${String(n).padStart(3, "0")}`;
}

const STATUS_ORDER = { WAITING: 0, IN_PROGRESS: 1, COMPLETED: 2 };

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: OpdVisit["status"] }) {
  const cfg = {
    WAITING: "bg-warning-100 text-warning-700 border-warning-200",
    IN_PROGRESS: "bg-primary-100 text-primary-700 border-primary-200",
    COMPLETED: "bg-success-100 text-success-700 border-success-200",
  }[status];
  const label = {
    WAITING: "Waiting",
    IN_PROGRESS: "In Progress",
    COMPLETED: "Completed",
  }[status];
  return (
    <span
      className={`text-2xs font-semibold px-2 py-0.5 rounded-full border ${cfg}`}
    >
      {label}
    </span>
  );
}

// ── Patient queue card ────────────────────────────────────────────────────────

function QueueCard({
  visit,
  onCall,
  onComplete,
  onRecall,
  onToken,
  canEdit,
}: {
  visit: OpdVisit;
  onCall: () => void;
  onComplete: () => void;
  onRecall: () => void;
  onToken: () => void;
  canEdit: boolean;
}) {
  const p = visit.patientId;
  const age = p
    ? [p.age && `${p.age}y`, p.gender].filter(Boolean).join(" / ")
    : "";

  const isIP = visit.status === "IN_PROGRESS";
  const isW = visit.status === "WAITING";

  return (
    <div
      className={`rounded-xl border-2 p-3 transition-all ${
        isIP
          ? "border-primary-400 bg-primary-50 shadow-md"
          : isW
            ? "border-gray-200 bg-white hover:border-gray-300"
            : "border-gray-100 bg-gray-50 opacity-70"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Token */}
        <div
          className={`shrink-0 rounded-lg px-2.5 py-1.5 text-center min-w-[52px] ${
            isIP
              ? "bg-primary-600 text-white"
              : isW
                ? "bg-gray-100 text-gray-700"
                : "bg-gray-200 text-gray-400"
          }`}
        >
          <p className="text-2xs font-medium leading-none opacity-70">Token</p>
          <p className="text-sm font-bold leading-tight mt-0.5">
            {String(visit.opdNumber).padStart(3, "0")}
          </p>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs font-semibold text-gray-800 truncate">
              {p?.name ?? "—"}
            </p>
            {age && <span className="text-2xs text-gray-400">{age}</span>}
            <StatusBadge status={visit.status} />
          </div>
          {visit.doctorId && (
            <p className="text-2xs text-gray-500 mt-0.5">
              Dr. {visit.doctorId.name}
            </p>
          )}
          {visit.chiefComplaint && (
            <p className="text-2xs text-gray-400 truncate mt-0.5">
              {visit.chiefComplaint}
            </p>
          )}
        </div>

        {/* Actions */}
        {canEdit && (
          <div className="flex gap-1 shrink-0">
            {isW && (
              <>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={onToken}
                  title="Print token"
                  className="text-gray-400 hover:text-primary-600 hover:bg-primary-50"
                >
                  <Ticket className="w-3.5 h-3.5" />
                </Button>
                <Button size="xs" onClick={onCall} title="Call this patient">
                  Call
                </Button>
              </>
            )}
            {isIP && (
              <>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={onRecall}
                  title="Send back to waiting"
                  className="text-gray-400 hover:text-warning-600 hover:bg-warning-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="xs"
                  onClick={onComplete}
                  title="Mark as completed"
                  className="bg-success-600 hover:bg-success-700 text-white"
                >
                  Done
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Now Serving hero ──────────────────────────────────────────────────────────

function NowServing({
  visit,
  onComplete,
  onRecall,
  onCallNext,
  canEdit,
}: {
  visit: OpdVisit | null;
  onComplete: () => void;
  onRecall: () => void;
  onCallNext: () => void;
  canEdit: boolean;
}) {
  const p = visit?.patientId;
  return (
    <div className="bg-primary-700 rounded-2xl p-5 text-white shadow-lg">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-primary-200 text-xs font-semibold uppercase tracking-widest">
            Now Serving
          </p>
          {visit ? (
            <>
              <div className="flex items-end gap-3 mt-1">
                <span className="text-5xl font-black leading-none">
                  {String(visit.opdNumber).padStart(3, "0")}
                </span>
                <div className="pb-1">
                  <p className="text-lg font-bold leading-tight">{p?.name}</p>
                  {visit.doctorId && (
                    <p className="text-primary-200 text-xs">
                      Dr. {visit.doctorId.name}
                    </p>
                  )}
                  {visit.chiefComplaint && (
                    <p className="text-primary-300 text-xs truncate max-w-[220px]">
                      {visit.chiefComplaint}
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <p className="text-2xl font-bold mt-1 text-primary-300">
              Queue is empty
            </p>
          )}
        </div>

        {canEdit && (
          <div className="flex gap-2 flex-wrap">
            {visit && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1 border-primary-400 text-primary-100 hover:bg-primary-600 bg-transparent"
                  onClick={onRecall}
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Recall
                </Button>
                <Button
                  size="sm"
                  className="h-8 text-xs gap-1 bg-success-500 hover:bg-success-600 text-white border-0"
                  onClick={onComplete}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Complete
                </Button>
              </>
            )}
            <Button
              size="sm"
              className="h-8 text-xs gap-1 bg-white text-primary-700 hover:bg-primary-50 border-0"
              onClick={onCallNext}
            >
              Call Next <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OpdQueuePage() {
  const router = useRouter();
  const { user, tenant } = useApp();
  const canEdit = user?.role !== "VIEWER";

  const [doctorFilter, setDoctorFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "WAITING" | "IN_PROGRESS" | "COMPLETED"
  >("all");
  const queryClient = useQueryClient();

  const queueKey = ["opd-queue"];
  const {
    data: queueData,
    isPending: loading,
    refetch: load,
  } = useApiQuery<{
    visits: OpdVisit[];
    total: number;
  }>(queueKey, "/api/dashboard/opd?tab=today&limit=200", {
    refetchInterval: 30_000,
  });
  const visits = [...(queueData?.visits ?? [])].sort(
    (a, b) =>
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
      a.opdNumber - b.opdNumber,
  );

  async function patchStatus(id: string, status: OpdVisit["status"]) {
    const res = await apiClient.patch<OpdVisit>(`/api/dashboard/opd/${id}`, {
      status,
    });
    if (!res.success) {
      toast.error("Failed to update status");
      return;
    }
    // Update the cached queue in place so the UI reflects the change instantly
    queryClient.setQueryData<{ visits: OpdVisit[]; total: number }>(
      queueKey,
      (prev) =>
        prev
          ? {
              ...prev,
              visits: prev.visits.map((v) =>
                v._id === id ? { ...v, status } : v,
              ),
            }
          : prev,
    );
  }

  function callPatient(visit: OpdVisit) {
    patchStatus(visit._id, "IN_PROGRESS");
  }

  function completePatient(visit: OpdVisit) {
    patchStatus(visit._id, "COMPLETED");
  }

  function recallPatient(visit: OpdVisit) {
    patchStatus(visit._id, "WAITING");
  }

  function callNext() {
    const next = filtered.find((v) => v.status === "WAITING");
    if (!next) {
      toast.info("No waiting patients");
      return;
    }
    callPatient(next);
  }

  function printToken(visit: OpdVisit) {
    printTokenSlip({
      tokenNumber: visit.opdNumber,
      patientName: visit.patientId?.name ?? "Patient",
      uhid:
        visit.patientId?.uhid != null
          ? String(visit.patientId.uhid)
          : undefined,
      doctorName: visit.doctorId?.name,
      chiefComplaint: visit.chiefComplaint || undefined,
      visitDate: visit.visitDate,
      clinicName: tenant?.name ?? "Clinic",
      clinicPhone: tenant?.phone,
    });
  }

  // Derive unique doctors from today's visits
  const doctors = Array.from(
    new Map(
      visits
        .filter((v) => v.doctorId?.name)
        .map((v) => [v.doctorId!.name, v.doctorId!.name]),
    ).entries(),
  ).map(([name]) => name);

  const filtered = visits.filter((v) => {
    if (doctorFilter !== "all" && v.doctorId?.name !== doctorFilter)
      return false;
    if (statusFilter !== "all" && v.status !== statusFilter) return false;
    return true;
  });

  const inProgress = filtered.find((v) => v.status === "IN_PROGRESS") ?? null;
  const waiting = filtered.filter((v) => v.status === "WAITING");
  const completed = filtered.filter((v) => v.status === "COMPLETED");

  const counts = {
    total: filtered.length,
    waiting: waiting.length,
    inProgress: filtered.filter((v) => v.status === "IN_PROGRESS").length,
    completed: completed.length,
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => router.back()}
            className="text-gray-500 hover:bg-gray-200"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <p className="text-xs text-gray-400">
            Today &bull; auto-refreshes every 30s
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1"
            onClick={() =>
              window.open("/opd/queue/display", "_blank")
            }
          >
            <Tv2 className="w-3.5 h-3.5" /> Display Board
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1"
            onClick={() => load()}
            disabled={loading}
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Total Today",
            value: counts.total,
            icon: Users,
            color: "text-gray-700",
          },
          {
            label: "Waiting",
            value: counts.waiting,
            icon: Clock,
            color: "text-warning-600",
          },
          {
            label: "In Progress",
            value: counts.inProgress,
            icon: UserCheck,
            color: "text-primary-600",
          },
          {
            label: "Completed",
            value: counts.completed,
            icon: CheckCircle2,
            color: "text-success-600",
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3"
          >
            <Icon className={`w-5 h-5 shrink-0 ${color}`} />
            <div>
              <p className="text-xl font-bold text-gray-800 leading-none">
                {value}
              </p>
              <p className="text-2xs text-gray-400 mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      {doctors.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 flex-wrap">
          <button
            onClick={() => setDoctorFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              doctorFilter === "all"
                ? "bg-primary-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            All Doctors
          </button>
          {doctors.map((d) => (
            <button
              key={d}
              onClick={() => setDoctorFilter(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                doctorFilter === d
                  ? "bg-primary-600 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              Dr. {d}
            </button>
          ))}
        </div>
      )}

      {/* Now Serving */}
      <NowServing
        visit={inProgress}
        onComplete={() => inProgress && completePatient(inProgress)}
        onRecall={() => inProgress && recallPatient(inProgress)}
        onCallNext={callNext}
        canEdit={canEdit}
      />

      {/* Queue lists */}
      {loading && visits.length === 0 ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-16 rounded-xl bg-gray-200 animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
          <Clock className="w-10 h-10 opacity-20" />
          <p className="text-sm font-medium">No patients in queue today</p>
          <p className="text-xs">Register OPD visits to see them here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          {/* WAITING column */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-warning-500" />
              <h2 className="text-sm font-semibold text-gray-700">
                Waiting ({waiting.length})
              </h2>
            </div>
            {waiting.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">
                No waiting patients
              </p>
            ) : (
              waiting.map((v) => (
                <QueueCard
                  key={v._id}
                  visit={v}
                  onCall={() => callPatient(v)}
                  onComplete={() => completePatient(v)}
                  onRecall={() => recallPatient(v)}
                  onToken={() => printToken(v)}
                  canEdit={canEdit}
                />
              ))
            )}
          </div>

          {/* COMPLETED column */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-success-500" />
              <h2 className="text-sm font-semibold text-gray-700">
                Completed ({completed.length})
              </h2>
            </div>
            {completed.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">
                No completed visits yet
              </p>
            ) : (
              completed.map((v) => (
                <QueueCard
                  key={v._id}
                  visit={v}
                  onCall={() => callPatient(v)}
                  onComplete={() => completePatient(v)}
                  onRecall={() => recallPatient(v)}
                  onToken={() => printToken(v)}
                  canEdit={canEdit}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
