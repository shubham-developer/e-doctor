"use client";

import { useState } from "react";
import { useApiQuery } from "@/lib/useApiQuery";
import { apiClient } from "@/lib/apiClient";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrency } from "@/lib/context";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClaimForm } from "@/components/tpa/ClaimForm";

interface ClaimRecord {
  _id: string;
  claimNo: string;
  status: string;
  claimedAmount: number;
  approvedAmount?: number;
  settledAmount?: number;
  coPayment?: number;
  preAuthNo?: string;
  preAuthStatus?: string;
  filedDate?: string;
  settlementDate?: string;
  rejectionReason?: string;
  remarks?: string;
  moduleType?: string;
  referenceId?: string;
  patientId?: { _id: string; name: string; patientCode: number };
  tpaId?: { _id: string; name: string; code: string };
}

const STATUS_BADGE: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  FILED: "bg-blue-100 text-blue-700",
  UNDER_REVIEW: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-green-100 text-green-700",
  PARTIALLY_APPROVED: "bg-teal-100 text-teal-700",
  REJECTED: "bg-red-100 text-red-700",
  SETTLED: "bg-emerald-100 text-emerald-700",
  RE_FILED: "bg-purple-100 text-purple-700",
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft", FILED: "Filed", UNDER_REVIEW: "Under Review",
  APPROVED: "Approved", PARTIALLY_APPROVED: "Partial", REJECTED: "Rejected",
  SETTLED: "Settled", RE_FILED: "Re-Filed",
};

const PREAUTH_BADGE: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

interface Props {
  ipdId: string;
  patientId: string;
  patientName: string;
  patientCode: number;
  tpaCompanyId?: string;
}

export function IpdClaimsTab({ ipdId, patientId, patientName, patientCode, tpaCompanyId }: Props) {
  const { fmt } = useCurrency();
  const qc = useQueryClient();

  const { data, isFetching } = useApiQuery<{ claims: ClaimRecord[] }>(
    ["tpa-claims", "ipd", ipdId],
    `/api/dashboard/tpa-claims?moduleType=IPD&referenceId=${ipdId}&limit=50`,
  );
  const claims = data?.claims ?? [];

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ClaimRecord | null>(null);

  async function handleDelete(c: ClaimRecord) {
    if (!confirm(`Delete claim ${c.claimNo}?`)) return;
    const res = await apiClient.delete(`/api/dashboard/tpa-claims/${c._id}`);
    if (!res.success) { toast.error(res.error ?? "Failed"); return; }
    toast.success("Claim deleted");
    qc.invalidateQueries({ queryKey: ["tpa-claims", "ipd", ipdId] });
  }

  const defaultPatient = { _id: patientId, name: patientName, patientCode };

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary-600" />
          <h2 className="text-sm font-semibold text-gray-800">TPA Claims</h2>
          {claims.length > 0 && (
            <span className="text-2xs bg-primary-100 text-primary-700 font-semibold px-1.5 py-0.5 rounded-full">{claims.length}</span>
          )}
        </div>
        <Button size="sm" className="h-7 text-xs gap-1" onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="w-3 h-3" /> Add Claim
        </Button>
      </div>

      {isFetching && claims.length === 0 ? (
        <p className="text-xs text-gray-400 py-4 text-center">Loading…</p>
      ) : claims.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <Shield className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No TPA claims for this admission</p>
          <p className="text-2xs mt-1">Click "Add Claim" to create one</p>
        </div>
      ) : (
        <div className="space-y-2">
          {claims.map((c) => (
            <div key={c._id} className="border border-gray-200 rounded-lg p-3 bg-white">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-gray-900">{c.claimNo}</span>
                  <span className={`text-2xs font-semibold px-1.5 py-0.5 rounded ${STATUS_BADGE[c.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {STATUS_LABEL[c.status] ?? c.status}
                  </span>
                  {c.preAuthStatus && (
                    <span className={`text-2xs px-1.5 py-0.5 rounded ${PREAUTH_BADGE[c.preAuthStatus] ?? "bg-gray-100 text-gray-500"}`}>
                      PreAuth: {c.preAuthStatus}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon-sm" onClick={() => { setEditing(c); setFormOpen(true); }} className="text-gray-400 hover:text-gray-600">
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(c)} className="text-gray-400 hover:text-danger-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <div className="mt-2 grid grid-cols-3 gap-3 text-xs">
                <div>
                  <p className="text-gray-400 text-2xs uppercase tracking-wide">TPA</p>
                  <p className="font-medium text-gray-800">{c.tpaId?.name ?? "—"}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-2xs uppercase tracking-wide">Claimed</p>
                  <p className="font-medium text-gray-800">{fmt(c.claimedAmount)}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-2xs uppercase tracking-wide">Approved</p>
                  <p className="font-medium text-gray-800">{c.approvedAmount != null ? fmt(c.approvedAmount) : "—"}</p>
                </div>
                {c.coPayment != null && c.coPayment > 0 && (
                  <div>
                    <p className="text-gray-400 text-2xs uppercase tracking-wide">Co-Payment</p>
                    <p className="text-gray-800">{fmt(c.coPayment)}</p>
                  </div>
                )}
                {c.preAuthNo && (
                  <div>
                    <p className="text-gray-400 text-2xs uppercase tracking-wide">Pre-Auth No.</p>
                    <p className="font-mono text-gray-800">{c.preAuthNo}</p>
                  </div>
                )}
                {c.filedDate && (
                  <div>
                    <p className="text-gray-400 text-2xs uppercase tracking-wide">Filed</p>
                    <p className="text-gray-600">{formatDate(c.filedDate)}</p>
                  </div>
                )}
                {c.settlementDate && (
                  <div>
                    <p className="text-gray-400 text-2xs uppercase tracking-wide">Settled</p>
                    <p className="text-gray-600">{formatDate(c.settlementDate)}</p>
                  </div>
                )}
              </div>

              {(c.rejectionReason || c.remarks) && (
                <p className="mt-2 text-2xs text-gray-400 border-t pt-2">
                  {c.rejectionReason || c.remarks}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <ClaimForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); qc.invalidateQueries({ queryKey: ["tpa-claims", "ipd", ipdId] }); }}
        editing={editing}
        defaultPatient={editing ? undefined : defaultPatient}
        defaultTpaId={editing ? undefined : tpaCompanyId}
        defaultReferenceId={editing ? undefined : ipdId}
        defaultModuleType="IPD"
      />
    </div>
  );
}
