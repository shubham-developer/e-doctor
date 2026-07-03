"use client";

import { Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DATE_RANGE_PRESETS,
  getPresetRange,
  type DateRangePreset,
} from "@/lib/dateRangePresets";

export function DateRangeFilter({
  preset,
  from,
  to,
  onChange,
}: {
  preset: DateRangePreset;
  from: string;
  to: string;
  onChange: (next: { preset: DateRangePreset; from: string; to: string }) => void;
}) {
  const applyPreset = (p: DateRangePreset) => {
    if (p === "custom") {
      onChange({ preset: p, from, to });
    } else {
      const r = getPresetRange(p);
      onChange({ preset: p, from: r.from, to: r.to });
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
      {DATE_RANGE_PRESETS.map((p) => (
        <button
          key={p.key}
          onClick={() => applyPreset(p.key)}
          className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
            preset === p.key
              ? "bg-primary-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {p.label}
        </button>
      ))}
      {preset === "custom" && (
        <div className="flex items-center gap-2 ml-1">
          <Input
            type="date"
            value={from}
            onChange={(e) => onChange({ preset, from: e.target.value, to })}
            className="h-7 text-xs w-36"
          />
          <span className="text-gray-400 text-xs">to</span>
          <Input
            type="date"
            value={to}
            onChange={(e) => onChange({ preset, from, to: e.target.value })}
            className="h-7 text-xs w-36"
          />
        </div>
      )}
    </div>
  );
}
