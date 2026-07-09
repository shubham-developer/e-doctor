"use client";

import { useState, useRef } from "react";
import { useApiQuery } from "@/lib/useApiQuery";
import { apiClient } from "@/lib/apiClient";
import { useQueryClient } from "@tanstack/react-query";
import { useTpaCompanies } from "@/lib/lookups";
import { useCurrency } from "@/lib/context";
import { formatDate, todayString } from "@/lib/format";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  createdAt: string;
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
  DRAFT: "Draft",
  FILED: "Filed",
  UNDER_REVIEW: "Under Review",
  APPROVED: "Approved",
  PARTIALLY_APPROVED: "Partial",
  REJECTED: "Rejected",
  SETTLED: "Settled",
  RE_FILED: "Re-Filed",
};

const ALL_STATUSES = Object.keys(STATUS_LABEL);

export default function TpaClaimsPage() {
  const { fmt } = useCurrency();
  const qc = useQueryClient();
  const { data: tpaCompanies = [] } = useTpaCompanies();

  const [filterStatus, setFilterStatus] = useState("all");
  const [filterTpa, setFilterTpa] = useState("");
  const [rawSearch, setRawSearch] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ClaimRecord | null>(null);

  function onSearchChange(v: string) {
    setRawSearch(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(v);
      setPage(1);
    }, 300);
  }

  const params = new URLSearchParams({ page: String(page), limit: "50" });
  if (filterStatus !== "all") params.set("status", filterStatus);
  if (filterTpa) params.set("tpaId", filterTpa);
  if (search) params.set("search", search);

  const { data, isFetching } = useApiQuery<{
    claims: ClaimRecord[];
    total: number;
    totalPages: number;
  }>(["tpa-claims", filterStatus, filterTpa, search, page], `/api/dashboard/tpa-claims?${params}`);

  const claims = data?.claims ?? [];
  const totalPages = data?.totalPages ?? 1;

  async function handleDelete(c: ClaimRecord) {
    if (!confirm(`Delete claim ${c.claimNo}?`)) return;
    const res = await apiClient.delete(`/api/dashboard/tpa-claims/${c._id}`);
    if (!res.success) { toast.error(res.error ?? "Failed"); return; }
    toast.success("Claim deleted");
    qc.invalidateQueries({ queryKey: ["tpa-claims"] });
  }

  const columns: ColumnDef<ClaimRecord>[] = [
    {
      key: "claimNo", header: "Claim #", sortable: true,
      render: (c) => <span className="font-mono text-xs font-medium text-gray-900">{c.claimNo}</span>,
    },
    {
      key: "patient", header: "Patient",
      render: (c) => (
        <div>
          <p className="text-xs font-medium text-gray-900">{c.patientId?.name ?? "—"}</p>
          <p className="text-2xs text-gray-400">#{c.patientId?.patientCode}</p>
        </div>
      ),
    },
    {
      key: "tpa", header: "TPA",
      render: (c) => (
        <div>
          <p className="text-xs font-medium text-gray-800">{c.tpaId?.name ?? "—"}</p>
          {c.tpaId?.code && <span className="font-mono text-2xs text-gray-400">{c.tpaId.code}</span>}
        </div>
      ),
    },
    {
      key: "moduleType", header: "Module",
      render: (c) => <span className="text-2xs font-semibold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{c.moduleType ?? "—"}</span>,
    },
    {
      key: "claimedAmount", header: "Claimed", align: "right",
      render: (c) => <span className="text-xs text-gray-800">{fmt(c.claimedAmount)}</span>,
    },
    {
      key: "approvedAmount", header: "Approved", align: "right",
      render: (c) => <span className="text-xs text-gray-800">{c.approvedAmount != null ? fmt(c.approvedAmount) : "—"}</span>,
    },
    {
      key: "status", header: "Status",
      render: (c) => (
        <span className={`text-2xs font-semibold px-1.5 py-0.5 rounded ${STATUS_BADGE[c.status] ?? "bg-gray-100 text-gray-600"}`}>
          {STATUS_LABEL[c.status] ?? c.status}
        </span>
      ),
    },
    {
      key: "filedDate", header: "Filed",
      render: (c) => <span className="text-xs text-gray-500">{c.filedDate ? formatDate(c.filedDate) : "—"}</span>,
    },
    {
      key: "actions", header: "", width: "w-20", align: "right",
      render: (c) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon-sm" onClick={() => { setEditing(c); setFormOpen(true); }} className="text-gray-400 hover:text-gray-600">
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(c)} className="text-gray-400 hover:text-danger-500">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] min-h-96">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <h1 className="text-lg font-semibold text-gray-800">TPA Claims</h1>
        <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="w-3.5 h-3.5" /> New Claim
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-3 shrink-0 flex-wrap">
        <SearchableSelect
          options={tpaCompanies.map((c) => ({ value: c._id, label: `${c.name} (${c.code})` }))}
          value={filterTpa}
          onValueChange={(v) => { setFilterTpa(v ?? ""); setPage(1); }}
          placeholder="All TPAs"
          triggerClassName="h-8 text-xs w-52"
        />
        <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v ?? "all"); setPage(1); }}>
          <SelectTrigger className="h-8 text-xs w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {ALL_STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={claims}
        rowKey={(c) => c._id}
        loading={isFetching}
        emptyNode={<div className="flex flex-col items-center gap-2 py-8 text-gray-400"><FileText className="w-8 h-8" /><p className="text-sm">No claims found</p></div>}
        wrapperClassName="flex-auto min-h-0"
        searchValue={rawSearch}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search patient, claim no…"
        downloadable
        printable
        fileName="TPA-Claims"
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-2 shrink-0">
          <button
            className="px-3 py-1 text-xs border rounded disabled:opacity-40"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Prev
          </button>
          <span className="text-xs text-gray-500">Page {page} / {totalPages}</span>
          <button
            className="px-3 py-1 text-xs border rounded disabled:opacity-40"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Next
          </button>
        </div>
      )}

      <ClaimForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        editing={editing}
      />
    </div>
  );
}
