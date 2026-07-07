"use client";

import { useState } from "react";
import { toast } from "sonner";
import { apiClient } from "@/lib/apiClient";
import { useQueryClient } from "@tanstack/react-query";
import { useTpaCompanies } from "@/lib/lookups";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { todayString } from "@/lib/format";

interface PatientOption {
  _id: string;
  name: string;
  patientCode: number;
  phone?: string;
  tpaCompanyId?: string;
}

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
  preAuthRequestedAmount?: number;
  preAuthApprovedAmount?: number;
  preAuthDate?: string;
  preAuthRemarks?: string;
  filedDate?: string;
  settlementDate?: string;
  rejectionReason?: string;
  remarks?: string;
  moduleType?: string;
  referenceId?: string;
  patientId?: { _id: string; name: string; patientCode: number };
  tpaId?: { _id: string; name: string; code: string };
}

interface Props {
  open: boolean;
  onClose: () => void;
  editing?: ClaimRecord | null;
  defaultPatient?: PatientOption | null;
  defaultTpaId?: string;
  defaultReferenceId?: string;
  defaultModuleType?: string;
}

const MODULE_OPTIONS = ["IPD", "OPD", "PATHOLOGY", "RADIOLOGY"];
const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Draft" },
  { value: "FILED", label: "Filed" },
  { value: "UNDER_REVIEW", label: "Under Review" },
  { value: "APPROVED", label: "Approved" },
  { value: "PARTIALLY_APPROVED", label: "Partially Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "SETTLED", label: "Settled" },
  { value: "RE_FILED", label: "Re-Filed" },
];
const PREAUTH_STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];

export function ClaimForm({ open, onClose, editing, defaultPatient, defaultTpaId, defaultReferenceId, defaultModuleType }: Props) {
  const qc = useQueryClient();
  const { data: tpaCompanies = [] } = useTpaCompanies();

  const [patientSearch, setPatientSearch] = useState(
    editing?.patientId ? `${editing.patientId.name} (#${editing.patientId.patientCode})` : defaultPatient ? `${defaultPatient.name} (#${defaultPatient.patientCode})` : ""
  );
  const [patientId, setPatientId] = useState(editing?.patientId?._id ?? defaultPatient?._id ?? "");
  const [tpaId, setTpaId] = useState(editing?.tpaId?._id ?? defaultTpaId ?? "");
  const [moduleType, setModuleType] = useState(editing?.moduleType ?? defaultModuleType ?? "IPD");
  const [referenceId, setReferenceId] = useState(editing?.referenceId ?? defaultReferenceId ?? "");
  const [claimedAmount, setClaimedAmount] = useState(String(editing?.claimedAmount ?? ""));
  const [approvedAmount, setApprovedAmount] = useState(String(editing?.approvedAmount ?? ""));
  const [coPayment, setCoPayment] = useState(String(editing?.coPayment ?? ""));
  const [status, setStatus] = useState(editing?.status ?? "DRAFT");
  const [filedDate, setFiledDate] = useState(editing?.filedDate ?? "");
  const [rejectionReason, setRejectionReason] = useState(editing?.rejectionReason ?? "");
  const [remarks, setRemarks] = useState(editing?.remarks ?? "");

  // Pre-auth
  const [preAuthNo, setPreAuthNo] = useState(editing?.preAuthNo ?? "");
  const [preAuthDate, setPreAuthDate] = useState(editing?.preAuthDate ?? "");
  const [preAuthStatus, setPreAuthStatus] = useState(editing?.preAuthStatus ?? "PENDING");
  const [preAuthRequestedAmount, setPreAuthRequestedAmount] = useState(String(editing?.preAuthRequestedAmount ?? ""));
  const [preAuthApprovedAmount, setPreAuthApprovedAmount] = useState(String(editing?.preAuthApprovedAmount ?? ""));
  const [preAuthRemarks, setPreAuthRemarks] = useState(editing?.preAuthRemarks ?? "");

  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!patientId) { toast.error("Select a patient"); return; }
    if (!tpaId) { toast.error("Select a TPA company"); return; }
    if (!claimedAmount) { toast.error("Claimed amount is required"); return; }

    setSaving(true);
    const body = {
      patientId,
      tpaId,
      moduleType,
      referenceId: referenceId || undefined,
      claimedAmount: Number(claimedAmount),
      approvedAmount: approvedAmount ? Number(approvedAmount) : undefined,
      coPayment: coPayment ? Number(coPayment) : undefined,
      status,
      filedDate: status === "FILED" && !filedDate ? todayString() : filedDate || undefined,
      rejectionReason: rejectionReason || undefined,
      remarks: remarks || undefined,
      preAuthNo: preAuthNo || undefined,
      preAuthDate: preAuthDate || undefined,
      preAuthStatus: preAuthStatus || undefined,
      preAuthRequestedAmount: preAuthRequestedAmount ? Number(preAuthRequestedAmount) : undefined,
      preAuthApprovedAmount: preAuthApprovedAmount ? Number(preAuthApprovedAmount) : undefined,
      preAuthRemarks: preAuthRemarks || undefined,
    };

    const res = editing
      ? await apiClient.put(`/api/dashboard/tpa-claims/${editing._id}`, body)
      : await apiClient.post("/api/dashboard/tpa-claims", body);

    setSaving(false);
    if (!res.success) { toast.error(res.error ?? "Failed"); return; }
    toast.success(editing ? "Claim updated" : "Claim created");
    qc.invalidateQueries({ queryKey: ["tpa-claims"] });
    onClose();
  }

  const lbl = "text-xs font-medium text-gray-600 mb-1 block";
  const inp = "h-8 text-xs";

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogTitle>{editing ? `Edit Claim — ${editing.claimNo}` : "New TPA Claim"}</DialogTitle>

        <div className="space-y-4 mt-2">
          {/* Patient + TPA */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Patient *</label>
              <Input
                className={inp}
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                placeholder="Search by name or phone…"
                disabled={!!editing || !!defaultPatient}
              />
              {patientId && <p className="text-2xs text-primary-600 mt-0.5">Patient ID set</p>}
            </div>
            <div>
              <label className={lbl}>TPA / Insurer *</label>
              <SearchableSelect
                options={tpaCompanies
                  .filter((c) => c.isActive)
                  .map((c) => ({ value: c._id, label: `${c.name} (${c.code})` }))}
                value={tpaId}
                onValueChange={(v) => setTpaId(v ?? "")}
                placeholder="Select TPA"
                triggerClassName={inp}
              />
            </div>
          </div>

          {/* Module + Reference */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Module</label>
              <Select value={moduleType} onValueChange={(v) => setModuleType(v ?? "IPD")}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MODULE_OPTIONS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className={lbl}>Reference / Bill No.</label>
              <Input className={inp} value={referenceId} onChange={(e) => setReferenceId(e.target.value)} placeholder="IPD admission / bill ID" />
            </div>
          </div>

          {/* Amounts */}
          <div className="border-t pt-3">
            <p className="text-2xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Claim Amounts</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={lbl}>Claimed Amount *</label>
                <Input type="number" className={inp} value={claimedAmount} onChange={(e) => setClaimedAmount(e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className={lbl}>Approved Amount</label>
                <Input type="number" className={inp} value={approvedAmount} onChange={(e) => setApprovedAmount(e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className={lbl}>Co-Payment</label>
                <Input type="number" className={inp} value={coPayment} onChange={(e) => setCoPayment(e.target.value)} placeholder="0" />
              </div>
            </div>
          </div>

          {/* Pre-Auth */}
          <div className="border-t pt-3">
            <p className="text-2xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Pre-Authorization</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={lbl}>Pre-Auth No.</label>
                <Input className={inp} value={preAuthNo} onChange={(e) => setPreAuthNo(e.target.value)} placeholder="Authorization number" />
              </div>
              <div>
                <label className={lbl}>Pre-Auth Date</label>
                <Input type="date" className={inp} value={preAuthDate} onChange={(e) => setPreAuthDate(e.target.value)} />
              </div>
              <div>
                <label className={lbl}>Pre-Auth Status</label>
                <Select value={preAuthStatus} onValueChange={(v) => setPreAuthStatus(v ?? "PENDING")}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PREAUTH_STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className={lbl}>Requested Amount</label>
                <Input type="number" className={inp} value={preAuthRequestedAmount} onChange={(e) => setPreAuthRequestedAmount(e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className={lbl}>Approved Amount</label>
                <Input type="number" className={inp} value={preAuthApprovedAmount} onChange={(e) => setPreAuthApprovedAmount(e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className={lbl}>Pre-Auth Remarks</label>
                <Input className={inp} value={preAuthRemarks} onChange={(e) => setPreAuthRemarks(e.target.value)} placeholder="Notes" />
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="border-t pt-3">
            <p className="text-2xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Claim Status</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Status</label>
                <Select value={status} onValueChange={(v) => setStatus(v ?? "DRAFT")}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className={lbl}>Filed Date</label>
                <Input type="date" className={inp} value={filedDate} onChange={(e) => setFiledDate(e.target.value)} />
              </div>
              {(status === "REJECTED") && (
                <div className="col-span-2">
                  <label className={lbl}>Rejection Reason</label>
                  <Input className={inp} value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Reason for rejection" />
                </div>
              )}
              <div className="col-span-2">
                <label className={lbl}>Remarks</label>
                <Textarea className="text-xs resize-none" rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Internal notes" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4 pt-3 border-t">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : editing ? "Update Claim" : "Create Claim"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
