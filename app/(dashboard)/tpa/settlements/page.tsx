"use client";

import { useState } from "react";
import { useApiQuery } from "@/lib/useApiQuery";
import { apiClient } from "@/lib/apiClient";
import { useQueryClient } from "@tanstack/react-query";
import { useTpaCompanies } from "@/lib/lookups";
import { useCurrency } from "@/lib/context";
import { formatDate, todayString } from "@/lib/format";
import { toast } from "sonner";
import { Plus, Eye, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SettlementRecord {
  _id: string;
  batchNo: string;
  tpaId?: { _id: string; name: string; code: string };
  settlementDate: string;
  paymentMode: string;
  paymentRef?: string;
  totalClaimed: number;
  totalApproved: number;
  totalSettled: number;
  tdsDeducted: number;
  processingFee: number;
  claimIds: string[];
  remarks?: string;
  createdBy?: string;
  createdAt: string;
}

interface ApprovedClaim {
  _id: string;
  claimNo: string;
  claimedAmount: number;
  approvedAmount?: number;
  patientId?: { name: string; patientCode: number };
  selected?: boolean;
}

const PAYMENT_MODES = ["NEFT", "RTGS", "IMPS", "CHEQUE", "DD", "CASH"];

export default function TpaSettlementsPage() {
  const { fmt } = useCurrency();
  const qc = useQueryClient();
  const { data: tpaCompanies = [] } = useTpaCompanies();

  const [filterTpa, setFilterTpa] = useState("");
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<SettlementRecord | null>(null);

  // New settlement form state
  const [formTpa, setFormTpa] = useState("");
  const [settlementDate, setSettlementDate] = useState(todayString());
  const [paymentMode, setPaymentMode] = useState("NEFT");
  const [paymentRef, setPaymentRef] = useState("");
  const [tdsDeducted, setTdsDeducted] = useState("");
  const [processingFee, setProcessingFee] = useState("");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);

  // Approved claims for selected TPA
  const { data: claimsData } = useApiQuery<{ claims: ApprovedClaim[] }>(
    ["tpa-claims-approved", formTpa],
    `/api/dashboard/tpa-claims?status=APPROVED&tpaId=${formTpa}&limit=200`,
    { enabled: !!formTpa && formOpen }
  );
  const [selectedClaims, setSelectedClaims] = useState<Set<string>>(new Set());
  const approvedClaims = claimsData?.claims ?? [];

  const params = new URLSearchParams({ page: String(page), limit: "50" });
  if (filterTpa) params.set("tpaId", filterTpa);

  const { data, isFetching } = useApiQuery<{
    settlements: SettlementRecord[];
    total: number;
    totalPages: number;
  }>(["tpa-settlements", filterTpa, page], `/api/dashboard/tpa-settlements?${params}`);

  const settlements = data?.settlements ?? [];
  const totalPages = data?.totalPages ?? 1;

  function openForm() {
    setFormTpa("");
    setSettlementDate(todayString());
    setPaymentMode("NEFT");
    setPaymentRef("");
    setTdsDeducted("");
    setProcessingFee("");
    setRemarks("");
    setSelectedClaims(new Set());
    setFormOpen(true);
  }

  function toggleClaim(id: string) {
    setSelectedClaims((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedClaimObjects = approvedClaims.filter((c) => selectedClaims.has(c._id));
  const totalApproved = selectedClaimObjects.reduce((s, c) => s + (c.approvedAmount ?? 0), 0);
  const tds = Number(tdsDeducted) || 0;
  const fee = Number(processingFee) || 0;
  const netSettled = totalApproved - tds - fee;

  async function handleCreate() {
    if (!formTpa) { toast.error("Select TPA"); return; }
    if (selectedClaims.size === 0) { toast.error("Select at least one claim"); return; }
    setSaving(true);
    const res = await apiClient.post("/api/dashboard/tpa-settlements", {
      tpaId: formTpa,
      settlementDate,
      paymentMode,
      paymentRef: paymentRef || undefined,
      claimIds: Array.from(selectedClaims),
      tdsDeducted: tds,
      processingFee: fee,
      remarks: remarks || undefined,
    });
    setSaving(false);
    if (!res.success) { toast.error(res.error ?? "Failed"); return; }
    toast.success("Settlement batch created");
    setFormOpen(false);
    qc.invalidateQueries({ queryKey: ["tpa-settlements"] });
    qc.invalidateQueries({ queryKey: ["tpa-claims"] });
  }

  const columns: ColumnDef<SettlementRecord>[] = [
    {
      key: "batchNo", header: "Batch #",
      render: (s) => <span className="font-mono text-xs font-medium text-gray-900">{s.batchNo}</span>,
    },
    {
      key: "tpa", header: "TPA",
      render: (s) => <span className="text-xs text-gray-800">{s.tpaId?.name ?? "—"}</span>,
    },
    {
      key: "settlementDate", header: "Date",
      render: (s) => <span className="text-xs text-gray-600">{formatDate(s.settlementDate)}</span>,
    },
    {
      key: "paymentMode", header: "Mode",
      render: (s) => <span className="text-2xs font-semibold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{s.paymentMode}</span>,
    },
    {
      key: "claims", header: "Claims",
      render: (s) => <span className="text-xs text-gray-800">{s.claimIds.length}</span>,
    },
    {
      key: "totalClaimed", header: "Claimed", align: "right",
      render: (s) => <span className="text-xs text-gray-800">{fmt(s.totalClaimed)}</span>,
    },
    {
      key: "totalSettled", header: "Settled", align: "right",
      render: (s) => <span className="text-xs font-semibold text-emerald-700">{fmt(s.totalSettled)}</span>,
    },
    {
      key: "actions", header: "", width: "w-16", align: "right",
      render: (s) => (
        <Button variant="ghost" size="icon-sm" onClick={() => { setSelected(s); setDetailOpen(true); }} className="text-gray-400 hover:text-gray-600">
          <Eye className="w-3.5 h-3.5" />
        </Button>
      ),
    },
  ];

  const lbl = "text-xs font-medium text-gray-600 mb-1 block";
  const inp = "h-8 text-xs";

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] min-h-96">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <h1 className="text-lg font-semibold text-gray-800">TPA Settlements</h1>
        <Button size="sm" className="h-8 text-xs gap-1.5" onClick={openForm}>
          <Plus className="w-3.5 h-3.5" /> New Settlement
        </Button>
      </div>

      <div className="flex items-center gap-2 mb-3 shrink-0">
        <SearchableSelect
          options={tpaCompanies.map((c) => ({ value: c._id, label: `${c.name} (${c.code})` }))}
          value={filterTpa}
          onValueChange={(v) => { setFilterTpa(v ?? ""); setPage(1); }}
          placeholder="All TPAs"
          triggerClassName="h-8 text-xs w-52"
        />
      </div>

      <DataTable
        columns={columns}
        data={settlements}
        rowKey={(s) => s._id}
        loading={isFetching}
        emptyText="No settlements yet"
        wrapperClassName="flex-auto min-h-0"
        downloadable
        printable
        fileName="TPA-Settlements"
      />

      {/* New settlement dialog */}
      <Dialog open={formOpen} onOpenChange={(o) => !saving && !o && setFormOpen(false)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogTitle>New Settlement Batch</DialogTitle>

          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className={lbl}>TPA / Insurer *</label>
                <SearchableSelect
                  options={tpaCompanies.filter((c) => c.isActive).map((c) => ({ value: c._id, label: `${c.name} (${c.code})` }))}
                  value={formTpa}
                  onValueChange={(v) => { setFormTpa(v ?? ""); setSelectedClaims(new Set()); }}
                  placeholder="Select TPA"
                  triggerClassName={inp}
                />
              </div>
              <div>
                <label className={lbl}>Settlement Date</label>
                <Input type="date" className={inp} value={settlementDate} onChange={(e) => setSettlementDate(e.target.value)} />
              </div>
              <div>
                <label className={lbl}>Payment Mode</label>
                <Select value={paymentMode} onValueChange={(v) => setPaymentMode(v ?? "NEFT")}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className={lbl}>Payment Reference</label>
                <Input className={inp} value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} placeholder="UTR / Cheque no." />
              </div>
            </div>

            {/* Claim selection */}
            {formTpa && (
              <div className="border-t pt-3">
                <p className="text-2xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Select Approved Claims ({approvedClaims.length} available)
                </p>
                {approvedClaims.length === 0 ? (
                  <p className="text-xs text-gray-400 py-4 text-center">No approved claims for this TPA</p>
                ) : (
                  <div className="max-h-48 overflow-y-auto border rounded-md divide-y">
                    {approvedClaims.map((c) => (
                      <label key={c._id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedClaims.has(c._id)}
                          onChange={() => toggleClaim(c._id)}
                          className="w-3.5 h-3.5"
                        />
                        <span className="font-mono text-xs text-gray-700 w-20">{c.claimNo}</span>
                        <span className="text-xs text-gray-600 flex-1">{c.patientId?.name} #{c.patientId?.patientCode}</span>
                        <span className="text-xs font-medium text-gray-800">{fmt(c.approvedAmount ?? 0)}</span>
                      </label>
                    ))}
                  </div>
                )}

                {selectedClaims.size > 0 && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-md text-xs space-y-1">
                    <div className="flex justify-between text-gray-600"><span>Total Approved ({selectedClaims.size} claims)</span><span className="font-medium">{fmt(totalApproved)}</span></div>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <div>
                        <label className={lbl}>TDS Deducted</label>
                        <Input type="number" className={inp} value={tdsDeducted} onChange={(e) => setTdsDeducted(e.target.value)} placeholder="0" />
                      </div>
                      <div>
                        <label className={lbl}>Processing Fee</label>
                        <Input type="number" className={inp} value={processingFee} onChange={(e) => setProcessingFee(e.target.value)} placeholder="0" />
                      </div>
                    </div>
                    <div className="flex justify-between font-semibold text-emerald-700 border-t pt-2 mt-2">
                      <span>Net Settled</span><span>{fmt(netSettled)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className={lbl}>Remarks</label>
              <Textarea className="text-xs resize-none" rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Notes" />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4 pt-3 border-t">
            <Button variant="outline" size="sm" onClick={() => setFormOpen(false)} disabled={saving}>Cancel</Button>
            <Button size="sm" onClick={handleCreate} disabled={saving || selectedClaims.size === 0}>
              <Landmark className="w-3.5 h-3.5 mr-1.5" />
              {saving ? "Creating…" : "Create Settlement"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      {selected && (
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-lg">
            <DialogTitle>Settlement — {selected.batchNo}</DialogTitle>
            <div className="mt-3 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-y-2">
                <span className="text-gray-500">TPA</span><span className="font-medium">{selected.tpaId?.name}</span>
                <span className="text-gray-500">Date</span><span>{formatDate(selected.settlementDate)}</span>
                <span className="text-gray-500">Payment Mode</span><span>{selected.paymentMode}</span>
                {selected.paymentRef && <><span className="text-gray-500">Ref</span><span className="font-mono">{selected.paymentRef}</span></>}
                <span className="text-gray-500">Claims</span><span>{selected.claimIds.length}</span>
                <span className="text-gray-500">Total Claimed</span><span>{fmt(selected.totalClaimed)}</span>
                <span className="text-gray-500">Total Approved</span><span>{fmt(selected.totalApproved)}</span>
                <span className="text-gray-500">TDS</span><span>{fmt(selected.tdsDeducted)}</span>
                <span className="text-gray-500">Processing Fee</span><span>{fmt(selected.processingFee)}</span>
                <span className="text-gray-500 font-semibold">Net Settled</span><span className="font-bold text-emerald-700">{fmt(selected.totalSettled)}</span>
              </div>
              {selected.remarks && <p className="text-gray-500 border-t pt-2">{selected.remarks}</p>}
            </div>
            <div className="flex justify-end mt-4">
              <Button variant="outline" size="sm" onClick={() => setDetailOpen(false)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
