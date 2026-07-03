"use client";

import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateRangeFilter } from "@/components/common/DateRangeFilter";
import { TabBar } from "@/components/common/TabBar";
import { SummaryReport } from "@/components/reports/SummaryReport";
import { OpdReport } from "@/components/reports/OpdReport";
import { IpdReport } from "@/components/reports/IpdReport";
import { BillReportTable } from "@/components/reports/BillReportTable";
import { CollectionsReport } from "@/components/reports/CollectionsReport";
import {
  REPORT_TABS,
  type ReportTab,
  type ReportSummary,
  type OpdVisit,
  type BillRow,
  type IpdAdm,
  type CollectionsData,
} from "@/components/reports/types";

const TAB_ICONS: Record<ReportTab, React.ElementType> = {
  summary: TrendingUp,
  opd: Activity,
  ipd: BedDouble,
  pharmacy: Pill,
  pathology: FlaskConical,
  radiology: Stethoscope,
  collections: Users,
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
  } | null>(null);
  const [pharRows, setPharRows] = useState<BillRow[]>([]);
  const [pathRows, setPathRows] = useState<BillRow[]>([]);
  const [radRows, setRadRows] = useState<BillRow[]>([]);
  const [collectionsData, setCollectionsData] =
    useState<CollectionsData | null>(null);

  const load = useCallback(async (type: ReportTab, f: string, t: string) => {
    setLoading(true);
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
        d.data as { admissions: IpdAdm[]; paidByIpd: Record<string, number> },
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

  return (
    <div className="p-4 space-y-4 min-h-screen bg-gray-50">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-lg font-semibold text-gray-800">Reports</h1>
          <p className="text-xs text-gray-500">
            {from === to ? from : `${from} — ${to}`}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => window.print()}
          className="gap-1.5"
        >
          <Printer className="w-3.5 h-3.5" />
          Print
        </Button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-3 flex flex-wrap gap-2 items-center print:hidden">
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

      <div className="print:hidden">
        <TabBar tabs={TABS} active={tab} onChange={setTab} />
      </div>

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
        <CollectionsReport
          collectionsData={collectionsData}
          from={from}
          to={to}
          fmt={fmt}
        />
      )}

      <div className="hidden print:block text-center text-xs text-gray-400 mt-8 pt-4 border-t border-gray-200">
        {tenant?.name} · Report period: {from} — {to} · Printed on{" "}
        {todayString()}
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          .print-hide { display: none !important; }
        }
      `,
        }}
      />
    </div>
  );
}
