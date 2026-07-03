"use client";

import { RefreshCw } from "lucide-react";

export function DataCard({
  title,
  meta,
  loading,
  isEmpty,
  emptyText,
  children,
}: {
  title: string;
  /** Right-aligned header content, e.g. a record count or footer summary. */
  meta?: React.ReactNode;
  loading?: boolean;
  isEmpty?: boolean;
  emptyText?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
          {title}
        </h3>
        {meta != null && <span className="text-2xs text-gray-400">{meta}</span>}
      </div>
      {loading ? (
        <div className="px-4 py-8 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading…
        </div>
      ) : isEmpty ? (
        <div className="px-4 py-8 text-center text-xs text-gray-400">
          {emptyText ?? "No data for this period"}
        </div>
      ) : (
        <div className="overflow-x-auto">{children}</div>
      )}
    </div>
  );
}
