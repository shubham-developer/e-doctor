"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useApiQuery } from "@/lib/useApiQuery";
import { apiClient } from "@/lib/apiClient";
import { useApp, useCurrency, useDateFormatter } from "@/lib/context";
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
  REPORT_PAGE_SIZE,
  type ReportTableControls,
} from "@/components/reports/ReportTable";
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

// Tabs backed by a server-paginated ReportTable.
const TABLE_TABS: ReportTab[] = [
  "opd",
  "ipd",
  "pharmacy",
  "pathology",
  "radiology",
];

type OpdData = {
  visits: OpdVisit[];
  total: number;
  freeRevisitCount: number;
  paidRevisitCount: number;
  totalAmount: number;
};
type IpdData = {
  admissions: IpdAdm[];
  paidByIpd: Record<string, number>;
  chargesByIpd: Record<string, number>;
  total: number;
  totalPaid: number;
  totalCharges: number;
};
type BillsData = {
  bills: BillRow[];
  total: number;
  totalPaid: number;
  totalBalance: number;
};

export default function ReportsPage() {
  const { tenant } = useApp();
  const { fmt } = useCurrency();
  const { formatDate } = useDateFormatter();
  const queryClient = useQueryClient();

  const [preset, setPreset] = useState<DateRangePreset>("today");
  const [from, setFrom] = useState(todayString());
  const [to, setTo] = useState(todayString());
  const [tab, setTab] = useState<ReportTab>("summary");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<string>();
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const isTableTab = TABLE_TABS.includes(tab);
  const sortQs = sortKey ? `&sortKey=${sortKey}&sortDir=${sortDir}` : "";
  const reportUrl =
    tab === "dues"
      ? "/api/dashboard/dues"
      : tab === "doctor"
        ? `/api/dashboard/reports/doctor-revenue?from=${from}&to=${to}`
        : isTableTab
          ? `/api/dashboard/reports?type=${tab}&from=${from}&to=${to}&page=${page}&limit=${REPORT_PAGE_SIZE}${sortQs}`
          : `/api/dashboard/reports?type=${tab}&from=${from}&to=${to}`;
  const { data: reportData, isFetching: loading } = useApiQuery<unknown>(
    ["reports", tab, from, to, String(page), sortKey ?? "", sortDir],
    reportUrl,
    { keepPrevious: true },
  );

  function changeTab(next: ReportTab) {
    setTab(next);
    setPage(1);
    setSortKey(undefined);
    setSortDir("asc");
  }

  // Only the active tab's slice is rendered, so derive it from the one query
  const summary =
    tab === "summary" ? ((reportData as ReportSummary) ?? null) : null;
  const opdData = tab === "opd" ? ((reportData as OpdData) ?? null) : null;
  const ipdData = tab === "ipd" ? ((reportData as IpdData) ?? null) : null;
  const billsData =
    tab === "pharmacy" || tab === "pathology" || tab === "radiology"
      ? ((reportData as BillsData) ?? null)
      : null;
  const collectionsData =
    tab === "collections" ? ((reportData as CollectionsData) ?? null) : null;
  const duesData = tab === "dues" ? ((reportData as DuesData) ?? null) : null;
  const doctorData =
    tab === "doctor" ? ((reportData as DoctorRevenueData) ?? null) : null;

  // Fetches the ENTIRE selected date range (limit=all) for CSV export / print,
  // regardless of the page currently on screen.
  async function fetchAllData<T>(): Promise<T | null> {
    const res = await apiClient.get<T>(
      `/api/dashboard/reports?type=${tab}&from=${from}&to=${to}&limit=all${sortQs}`,
    );
    if (!res.success || !res.data) {
      toast.error(res.error ?? "Failed to load full report data");
      return null;
    }
    return res.data;
  }

  async function handlePrint() {
    let opdRows: OpdVisit[] = [];
    let ipdRows: IpdData | null = null;
    let billRows: BillRow[] = [];

    if (tab === "opd") {
      const d = await fetchAllData<OpdData>();
      if (!d) return;
      opdRows = d.visits ?? [];
    } else if (tab === "ipd") {
      const d = await fetchAllData<IpdData>();
      if (!d) return;
      ipdRows = d;
    } else if (
      tab === "pharmacy" ||
      tab === "pathology" ||
      tab === "radiology"
    ) {
      const d = await fetchAllData<BillsData>();
      if (!d) return;
      billRows = d.bills ?? [];
    } else if (
      (tab === "summary" && !summary) ||
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
      fmtDate: formatDate,
      summary,
      opdRows,
      ipdRows,
      collectionsData,
      billRows,
      clinicName: tenant?.name ?? "Clinic",
      clinicAddress: tenant?.address || undefined,
      logoUrl: tenant?.logoUrl || undefined,
      printLayouts: tenant?.printLayouts,
      printShowLogo: tenant?.printShowLogo,
      printHeaderImages: tenant?.printHeaderImages,
      printFooterContents: tenant?.printFooterContents,
      printLetterheads: tenant?.printLetterheads,
      printShowTitles: tenant?.printShowTitles,
      printTitleTexts: tenant?.printTitleTexts,
    });
  }

  function makeControls<T>(
    fetchRows: () => Promise<T[]>,
  ): ReportTableControls<T> {
    return {
      page,
      onPageChange: setPage,
      sortKey,
      sortDir,
      onSort: (k, d) => {
        setSortKey(k);
        setSortDir(d);
        setPage(1);
      },
      // keepPrevious holds the last page on screen while fetching — only
      // skeleton on the very first load of a tab.
      loading: loading && reportData == null,
      fetchAllRows: fetchRows,
      onPrint: handlePrint,
      fileName: `${tab}-report_${from}_${to}`,
    };
  }

  return (
    <div className="space-y-4">
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
              setPage(1);
            }}
          />
          <div className="ml-auto flex items-center gap-2">
            {loading && (
              <RefreshCw className="w-3.5 h-3.5 text-primary-500 animate-spin" />
            )}
            {tab === "summary" && (
              <Button
                size="sm"
                variant="outline"
                onClick={handlePrint}
                className="gap-1.5 h-7"
              >
                <Printer className="w-3.5 h-3.5" />
                Print
              </Button>
            )}
          </div>
        </div>
      )}
      {tab === "dues" && loading && (
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading outstanding
          dues…
        </div>
      )}

      <TabBar tabs={TABS} active={tab} onChange={changeTab} />

      {tab === "summary" && summary && (
        <SummaryReport summary={summary} fmt={fmt} />
      )}
      {tab === "opd" && (
        <OpdReport
          rows={opdData?.visits ?? []}
          total={opdData?.total ?? 0}
          totalAmount={opdData?.totalAmount ?? 0}
          freeRevisitCount={opdData?.freeRevisitCount ?? 0}
          paidRevisitCount={opdData?.paidRevisitCount ?? 0}
          fmt={fmt}
          controls={makeControls<OpdVisit>(
            async () => (await fetchAllData<OpdData>())?.visits ?? [],
          )}
        />
      )}
      {tab === "ipd" && ipdData && (
        <IpdReport
          ipdRows={ipdData}
          total={ipdData.total ?? 0}
          totalPaid={ipdData.totalPaid ?? 0}
          totalCharges={ipdData.totalCharges ?? 0}
          fmt={fmt}
          controls={makeControls<IpdAdm>(
            async () => (await fetchAllData<IpdData>())?.admissions ?? [],
          )}
        />
      )}
      {(tab === "pharmacy" || tab === "pathology" || tab === "radiology") && (
        <BillReportTable
          title={
            tab === "pharmacy"
              ? "Pharmacy Report"
              : tab === "pathology"
                ? "Pathology Report"
                : "Radiology Report"
          }
          rows={billsData?.bills ?? []}
          total={billsData?.total ?? 0}
          totalPaid={billsData?.totalPaid ?? 0}
          totalBalance={billsData?.totalBalance ?? 0}
          fmt={fmt}
          controls={makeControls<BillRow>(
            async () => (await fetchAllData<BillsData>())?.bills ?? [],
          )}
        />
      )}
      {tab === "collections" && collectionsData && (
        <CollectionsReport
          collectionsData={collectionsData}
          onPrint={handlePrint}
          fmt={fmt}
        />
      )}
      {tab === "dues" && duesData && (
        <DuesReport
          data={duesData}
          fmt={fmt}
          onRefresh={() =>
            queryClient.invalidateQueries({ queryKey: ["reports", "dues"] })
          }
        />
      )}
      {tab === "doctor" && doctorData && (
        <DoctorRevenueReport data={doctorData} fmt={fmt} />
      )}
    </div>
  );
}
