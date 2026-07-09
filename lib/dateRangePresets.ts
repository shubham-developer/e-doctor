import { todayString } from "@/lib/format";

export type DateRangePreset =
  "today" | "yesterday" | "7d" | "30d" | "month" | "year" | "custom";

export const DATE_RANGE_PRESETS: { key: DateRangePreset; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "7d", label: "Last 7 Days" },
  { key: "30d", label: "Last 30 Days" },
  { key: "month", label: "This Month" },
  { key: "year", label: "This Year" },
  { key: "custom", label: "Custom" },
];

/** Resolves a preset key to a concrete { from, to } date range (yyyy-MM-dd). */
export function getPresetRange(preset: string): { from: string; to: string } {
  const today = todayString();
  const offset = (n: number) => {
    const dt = new Date(today);
    dt.setDate(dt.getDate() + n);
    return dt.toISOString().slice(0, 10);
  };
  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "yesterday":
      return { from: offset(-1), to: offset(-1) };
    case "7d":
      return { from: offset(-6), to: today };
    case "30d":
      return { from: offset(-29), to: today };
    case "month":
      return { from: today.slice(0, 8) + "01", to: today };
    case "year":
      return { from: today.slice(0, 4) + "-01-01", to: today };
    default:
      return { from: today, to: today };
  }
}
