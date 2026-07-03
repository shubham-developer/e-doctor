"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { apiClient } from "@/lib/apiClient";
import { useCurrency } from "@/lib/context";
import { todayString } from "@/lib/format";
import type { DateRangePreset } from "@/lib/dateRangePresets";
import { toast } from "sonner";
import {
  Activity,
  Pill,
  FlaskConical,
  Stethoscope,
  BedDouble,
  LayoutGrid,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { DateRangeFilter } from "@/components/common/DateRangeFilter";
import { TabBar } from "@/components/common/TabBar";
import { OverviewSection } from "@/components/billing/OverviewSection";
import { BillingFilters } from "@/components/billing/BillingFilters";
import { OpdBillingTable } from "@/components/billing/OpdBillingTable";
import { PharmacyBillingTable } from "@/components/billing/PharmacyBillingTable";
import { TestBillingTable } from "@/components/billing/TestBillingTable";
import { IpdBillingTable } from "@/components/billing/IpdBillingTable";
import { AddPaymentModal } from "@/components/billing/AddPaymentModal";
import { BillingPagination } from "@/components/billing/BillingPagination";
import type {
  ModuleTab,
  BillingSummary,
  Paginated,
  OpdBill,
  PharBill,
  PathBill,
  RadBill,
  IpdBill,
  PaymentModalState,
} from "@/components/billing/types";

const MODULE_TABS: { key: ModuleTab; label: string; icon: React.ElementType }[] = [
  { key: "overview", label: "Overview", icon: LayoutGrid },
  { key: "opd", label: "OPD", icon: Activity },
  { key: "pharmacy", label: "Pharmacy", icon: Pill },
  { key: "pathology", label: "Pathology", icon: FlaskConical },
  { key: "radiology", label: "Radiology", icon: Stethoscope },
  { key: "ipd", label: "IPD", icon: BedDouble },
];

export default function BillingPage() {
  const { fmt } = useCurrency();

  const [tab, setTab] = useState<ModuleTab>("overview");
  const [preset, setPreset] = useState<DateRangePreset>("today");
  const [from, setFrom] = useState(todayString());
  const [to, setTo] = useState(todayString());
  const [rawSearch, setRawSearch] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [opdData, setOpdData] = useState<Paginated<OpdBill> | null>(null);
  const [pharData, setPharData] = useState<Paginated<PharBill> | null>(null);
  const [pathData, setPathData] = useState<Paginated<PathBill> | null>(null);
  const [radData, setRadData] = useState<Paginated<RadBill> | null>(null);
  const [ipdData, setIpdData] = useState<Paginated<IpdBill> | null>(null);

  const [payModal, setPayModal] = useState<PaymentModalState | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = (v: string) => {
    setRawSearch(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(v);
      setPage(1);
    }, 300);
  };

  const load = useCallback(
    async (module: ModuleTab, f: string, t: string, s: string, st: string, pg: number) => {
      setLoading(true);
      if (module === "overview") {
        const d = await apiClient.get<BillingSummary>(
          `/api/dashboard/billing?module=summary&from=${f}&to=${t}`,
        );
        if (d.success) setSummary(d.data);
      } else {
        const url = `/api/dashboard/billing?module=${module}&from=${f}&to=${t}&search=${encodeURIComponent(s)}&status=${st}&page=${pg}&limit=50`;
        const d = await apiClient.get<unknown>(url);
        if (d.success) {
          if (module === "opd") setOpdData(d.data as Paginated<OpdBill>);
          if (module === "pharmacy") setPharData(d.data as Paginated<PharBill>);
          if (module === "pathology") setPathData(d.data as Paginated<PathBill>);
          if (module === "radiology") setRadData(d.data as Paginated<RadBill>);
          if (module === "ipd") setIpdData(d.data as Paginated<IpdBill>);
        }
      }
      setLoading(false);
    },
    [],
  );

  useEffect(() => {
    load(tab, from, to, search, status, page);
  }, [tab, from, to, search, status, page, load]);

  // Reset page when filters change (but not on page change itself)
  const prevFiltersRef = useRef({ tab, from, to, search, status });
  useEffect(() => {
    const prev = prevFiltersRef.current;
    if (
      prev.tab !== tab ||
      prev.from !== from ||
      prev.to !== to ||
      prev.search !== search ||
      prev.status !== status
    ) {
      setPage(1);
      prevFiltersRef.current = { tab, from, to, search, status };
    }
  }, [tab, from, to, search, status]);

  const openPayModal = (
    module: PaymentModalState["module"],
    billId: string,
    balance: number,
    patientName: string,
  ) => {
    setPayModal({ module, billId, balance, patientName });
  };

  const submitPayment = async (amount: number, mode: string) => {
    if (!payModal) return;

    let url = "";
    let method: "post" | "patch" = "patch";
    if (payModal.module === "pharmacy") {
      url = `/api/dashboard/pharmacy/bills/${payModal.billId}/payments`;
      method = "post";
    }
    if (payModal.module === "pathology") url = `/api/dashboard/pathology/bills/${payModal.billId}`;
    if (payModal.module === "radiology") url = `/api/dashboard/radiology/bills/${payModal.billId}`;

    const d = await apiClient[method]<unknown>(url, {
      amount,
      paymentMode: mode,
      mode,
    });
    if (!d.success) {
      toast.error("Payment failed");
      return;
    }
    toast.success("Payment recorded");
    setPayModal(null);
    load(tab, from, to, search, status, page);
  };

  const pagination =
    tab === "opd"
      ? opdData
      : tab === "pharmacy"
        ? pharData
        : tab === "pathology"
          ? pathData
          : tab === "radiology"
            ? radData
            : tab === "ipd"
              ? ipdData
              : null;

  return (
    <div className="p-4 space-y-3 min-h-screen bg-gray-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-primary-600" />
          <h1 className="text-lg font-semibold text-gray-800">Billing</h1>
          {loading && <RefreshCw className="w-3.5 h-3.5 text-primary-500 animate-spin" />}
        </div>
        <p className="text-xs text-gray-400">{from === to ? from : `${from} — ${to}`}</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
        <DateRangeFilter
          preset={preset}
          from={from}
          to={to}
          onChange={(next) => {
            setPreset(next.preset);
            setFrom(next.from);
            setTo(next.to);
          }}
        />
        {tab !== "overview" && tab !== "ipd" && (
          <BillingFilters
            tab={tab}
            search={rawSearch}
            onSearchChange={handleSearchChange}
            status={status}
            onStatusChange={setStatus}
          />
        )}
      </div>

      <TabBar tabs={MODULE_TABS} active={tab} onChange={setTab} />

      {tab === "overview" && summary && <OverviewSection summary={summary} fmt={fmt} />}
      {tab === "opd" && <OpdBillingTable data={opdData} loading={loading} fmt={fmt} />}
      {tab === "pharmacy" && (
        <PharmacyBillingTable
          data={pharData}
          loading={loading}
          fmt={fmt}
          onPay={(billId, balance, patientName) =>
            openPayModal("pharmacy", billId, balance, patientName)
          }
        />
      )}
      {tab === "pathology" && (
        <TestBillingTable
          module="pathology"
          data={pathData}
          loading={loading}
          fmt={fmt}
          onPay={(billId, balance, patientName) =>
            openPayModal("pathology", billId, balance, patientName)
          }
        />
      )}
      {tab === "radiology" && (
        <TestBillingTable
          module="radiology"
          data={radData}
          loading={loading}
          fmt={fmt}
          onPay={(billId, balance, patientName) =>
            openPayModal("radiology", billId, balance, patientName)
          }
        />
      )}
      {tab === "ipd" && <IpdBillingTable data={ipdData} loading={loading} fmt={fmt} />}

      {tab !== "overview" && pagination && (
        <BillingPagination pagination={pagination} page={page} onPageChange={setPage} />
      )}

      {payModal && (
        <AddPaymentModal
          payModal={payModal}
          fmt={fmt}
          onClose={() => setPayModal(null)}
          onSubmit={submitPayment}
        />
      )}
    </div>
  );
}
