"use client";

import { useState } from "react";
import { Download, Printer } from "lucide-react";
import { toast } from "sonner";
import { DataCard } from "@/components/common/DataCard";
import { TablePagination } from "@/components/common/TablePagination";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";

export const REPORT_PAGE_SIZE = 25;

/**
 * Server-side pagination/sort state plus full-range export hooks, owned by
 * the reports page. Only columns whose key the API maps to a document field
 * should be marked `sortable`.
 */
export interface ReportTableControls<T> {
  page: number;
  onPageChange: (page: number) => void;
  sortKey?: string;
  sortDir?: "asc" | "desc";
  onSort: (key: string, dir: "asc" | "desc") => void;
  loading?: boolean;
  /** Fetches every row of the selected date range (`limit=all`) for CSV export. */
  fetchAllRows: () => Promise<T[]>;
  /** Prints the full date range through the letterhead report printer. */
  onPrint: () => void | Promise<void>;
  /** CSV filename (no extension) — includes the selected date range. */
  fileName: string;
}

const toolbarBtn =
  "inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-primary-600 border border-gray-200 hover:border-primary-300 bg-white rounded-lg px-2.5 py-1.5 transition-colors disabled:opacity-50 disabled:pointer-events-none";

export function ReportTable<T extends object>({
  title,
  footer,
  columns,
  data,
  rowKey,
  total,
  controls,
  itemLabel = "records",
}: {
  title: string;
  footer: string;
  columns: ColumnDef<T>[];
  data: T[];
  rowKey: (row: T) => string;
  /** Range-wide row count from the API (not the page length). */
  total: number;
  controls: ReportTableControls<T>;
  itemLabel?: string;
}) {
  const [exporting, setExporting] = useState(false);

  async function downloadCsv() {
    setExporting(true);
    try {
      const all = await controls.fetchAllRows();
      const cols = columns.filter((c) => c.header.trim());
      const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
      const lines = [cols.map((c) => q(c.header)).join(",")];
      for (const row of all) {
        lines.push(
          cols
            .map((c) =>
              q(
                c.csvValue
                  ? c.csvValue(row)
                  : c.accessor != null
                    ? String(row[c.accessor] ?? "")
                    : "",
              ),
            )
            .join(","),
        );
      }
      const blob = new Blob([lines.join("\n")], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${controls.fileName}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch {
      toast.error("Failed to export CSV");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-3">
      <DataCard
        title={title}
        meta={footer}
        isEmpty={!controls.loading && total === 0}
      >
        <DataTable
          columns={columns}
          data={data}
          rowKey={rowKey}
          loading={controls.loading}
          sortKey={controls.sortKey}
          sortDir={controls.sortDir}
          onSort={controls.onSort}
          stickyHeader={false}
          wrapperClassName="border-0"
          className="text-xs min-w-150"
          toolbarRight={
            <>
              <button
                type="button"
                onClick={downloadCsv}
                disabled={exporting}
                title="Download CSV (full date range)"
                className={toolbarBtn}
              >
                <Download className="w-3.5 h-3.5" />
                {exporting ? "Exporting…" : "CSV"}
              </button>
              <button
                type="button"
                onClick={() => controls.onPrint()}
                title="Print report (full date range)"
                className={toolbarBtn}
              >
                <Printer className="w-3.5 h-3.5" />
                Print
              </button>
            </>
          }
        />
      </DataCard>
      <TablePagination
        page={controls.page}
        total={total}
        limit={REPORT_PAGE_SIZE}
        onPageChange={controls.onPageChange}
        itemLabel={itemLabel}
      />
    </div>
  );
}
