"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { apiClient } from "@/lib/apiClient";
import { useApp, useCurrency } from "@/lib/context";
import { todayString } from "@/lib/format";
import type { DateRangePreset } from "@/lib/dateRangePresets";
import {
  Printer,
  TrendingUp,
  Users,
  Activity,
  Pill,
  FlaskConical,
  Stethoscope,
  BedDouble,
  RefreshCw,
  AlertCircle,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateRangeFilter } from "@/components/common/DateRangeFilter";
import { TabBar } from "@/components/common/TabBar";
import { SummaryReport } from "@/components/reports/SummaryReport";
import { OpdReport } from "@/components/reports/OpdReport";
import { IpdReport } from "@/components/reports/IpdReport";
import { BillReportTable } from "@/components/reports/BillReportTable";
import { CollectionsReport } from "@/components/reports/CollectionsReport";
import { DuesReport } from "@/components/reports/DuesReport";
import { DoctorRevenueReport } from "@/components/reports/DoctorRevenueReport";
import { printReport } from "@/components/reports/ReportPrinter";
import {
  REPORT_TABS,
  type ReportTab,
  type ReportSummary,
  type OpdVisit,
  type BillRow,
  type IpdAdm,
  type CollectionsData,
  type DuesData,
  type DoctorRevenueData,
} from "@/components/reports/types";

const TAB_ICONS: Record<ReportTab, React.ElementType> = {
  summary: TrendingUp,
  opd: Activity,
  ipd: BedDouble,
  pharmacy: Pill,
  pathology: FlaskConical,
  radiology: Stethoscope,
  collections: Users,
  dues: AlertCircle,
  doctor: UserRound,
};

const TABS = REPORT_TABS.map((t) => ({ ...t, icon: TAB_ICONS[t.key] }));

export default function ReportsPage() {
  const { tenant } = useApp();
  const { fmt } = useCurrency();

  const [preset, setPreset] = useState<DateRangePreset>("today");
  const [from, setFrom] = useState(todayString());
  const [to, setTo] = useState(todayString());
  const [tab, setTab] = useState<ReportTab>("summary");
  const [loading, setLoading] = useState(false);

  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [opdRows, setOpdRows] = useState<OpdVisit[]>([]);
  const [ipdRows, setIpdRows] = useState<{
    admissions: IpdAdm[];
    paidByIpd: Record<string, number>;
    chargesByIpd: Record<string, number>;
  } | null>(null);
  const [pharRows, setPharRows] = useState<BillRow[]>([]);
  const [pathRows, setPathRows] = useState<BillRow[]>([]);
  const [radRows, setRadRows] = useState<BillRow[]>([]);
  const [collectionsData, setCollectionsData] =
    useState<CollectionsData | null>(null);
  const [duesData, setDuesData] = useState<DuesData | null>(null);
  const [doctorData, setDoctorData] = useState<DoctorRevenueData | null>(null);

  const load = useCallback(async (type: ReportTab, f: string, t: string) => {
    setLoading(true);

    if (type === "dues") {
      const d = await apiClient.get<DuesData>("/api/dashboard/dues");
      setLoading(false);
      if (d.success) setDuesData(d.data ?? null);
      return;
    }

    if (type === "doctor") {
      const d = await apiClient.get<DoctorRevenueData>(
        `/api/dashboard/reports/doctor-revenue?from=${f}&to=${t}`,
      );
      setLoading(false);
      if (d.success) setDoctorData(d.data ?? null);
      return;
    }

    const d = await apiClient.get<unknown>(
      `/api/dashboard/reports?type=${type}&from=${f}&to=${t}`,
    );
    setLoading(false);
    if (!d.success) return;

    if (type === "summary") setSummary(d.data as ReportSummary);
    else if (type === "opd")
      setOpdRows((d.data as { visits: OpdVisit[] }).visits);
    else if (type === "ipd")
      setIpdRows(
        d.data as { admissions: IpdAdm[]; paidByIpd: Record<string, number>; chargesByIpd: Record<string, number> },
      );
    else if (type === "pharmacy")
      setPharRows((d.data as { bills: BillRow[] }).bills);
    else if (type === "pathology")
      setPathRows((d.data as { bills: BillRow[] }).bills);
    else if (type === "radiology")
      setRadRows((d.data as { bills: BillRow[] }).bills);
    else if (type === "collections")
      setCollectionsData(d.data as CollectionsData);
  }, []);

  useEffect(() => {
    load(tab, from, to);
  }, [tab, from, to, load]);

  function handlePrint() {
    if (
      (tab === "summary" && !summary) ||
      (tab === "ipd" && !ipdRows) ||
      (tab === "collections" && !collectionsData)
    ) {
      toast.error("Report data is still loading");
      return;
    }
    printReport({
      tab,
      from,
      to,
      fmt,
      summary,
      opdRows,
      ipdRows,
      collectionsData,
      billRows:
        tab === "pharmacy" ? pharRows : tab === "pathology" ? pathRows : radRows,
      clinicName: tenant?.name ?? "Clinic",
      clinicAddress: tenant?.address || undefined,
      logoUrl: tenant?.logoUrl || undefined,
      printLayouts: tenant?.printLayouts,
    });
  }

  return (
    <div className="p-4 space-y-4 min-h-screen bg-gray-50">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-800">Reports</h1>
          <p className="text-xs text-gray-500">
            {from === to ? from : `${from} — ${to}`}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1.5">
          <Printer className="w-3.5 h-3.5" />
          Print
        </Button>
      </div>

      {tab !== "dues" && (
        <div className="bg-white border border-gray-200 rounded-lg p-3 flex flex-wrap gap-2 items-center">
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
          {loading && (
            <RefreshCw className="w-3.5 h-3.5 text-primary-500 animate-spin ml-auto" />
          )}
        </div>
      )}
      {tab === "dues" && loading && (
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading outstanding dues…
        </div>
      )}

      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      {tab === "summary" && summary && (
        <SummaryReport summary={summary} fmt={fmt} />
      )}
      {tab === "opd" && <OpdReport rows={opdRows} fmt={fmt} />}
      {tab === "ipd" && ipdRows && <IpdReport ipdRows={ipdRows} fmt={fmt} />}
      {tab === "pharmacy" && (
        <BillReportTable title="Pharmacy Report" rows={pharRows} fmt={fmt} />
      )}
      {tab === "pathology" && (
        <BillReportTable title="Pathology Report" rows={pathRows} fmt={fmt} />
      )}
      {tab === "radiology" && (
        <BillReportTable title="Radiology Report" rows={radRows} fmt={fmt} />
      )}
      {tab === "collections" && collectionsData && (
        <CollectionsReport collectionsData={collectionsData} onPrint={handlePrint} fmt={fmt} />
      )}
      {tab === "dues" && duesData && (
        <DuesReport data={duesData} fmt={fmt} />
      )}
      {tab === "doctor" && doctorData && (
        <DoctorRevenueReport data={doctorData} fmt={fmt} />
      )}
    </div>
  );
}
