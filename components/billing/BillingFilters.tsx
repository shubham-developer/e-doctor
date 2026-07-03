"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { ModuleTab } from "./types";

const STATUS_OPTIONS = ["all", "paid", "partial", "due"];

export function BillingFilters({
  tab,
  search,
  onSearchChange,
  status,
  onStatusChange,
}: {
  tab: ModuleTab;
  search: string;
  onSearchChange: (v: string) => void;
  status: string;
  onStatusChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[200px] max-w-xs">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search patient…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-7 text-xs pl-8"
        />
      </div>
      {(tab === "pharmacy" || tab === "pathology" || tab === "radiology") && (
        <div className="flex gap-1">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => onStatusChange(s)}
              className={`px-2.5 py-1 rounded text-xs font-medium capitalize transition-colors ${
                status === s
                  ? "bg-primary-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
