"use client";

import { useState, useEffect } from "react";
import { useApiQuery } from "@/lib/useApiQuery";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Minus,
  Palmtree,
  Star,
  Save,
  Loader2,
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { useApp } from "@/lib/context";
import { Button } from "@/components/ui/button";

// ── Types ─────────────────────────────────────────────────────────────────────

type AttStatus = "present" | "absent" | "half_day" | "leave" | "holiday";

interface StaffRow {
  _id: string;
  name: string;
  staffCode: number;
  department: string;
  role: string;
}

interface AttRecord {
  _id: string;
  staffId: string;
  date: string;
  status: AttStatus;
  checkIn?: string;
  checkOut?: string;
}

interface Summary {
  presentDays: number;
  absentDays: number;
  halfDays: number;
  leaveDays: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  AttStatus,
  {
    label: string;
    short: string;
    bg: string;
    text: string;
    icon: React.ElementType;
  }
> = {
  present: {
    label: "Present",
    short: "P",
    bg: "bg-green-100",
    text: "text-green-700",
    icon: Check,
  },
  absent: {
    label: "Absent",
    short: "A",
    bg: "bg-red-100",
    text: "text-red-700",
    icon: X,
  },
  half_day: {
    label: "Half Day",
    short: "H",
    bg: "bg-amber-100",
    text: "text-amber-700",
    icon: Minus,
  },
  leave: {
    label: "Leave",
    short: "L",
    bg: "bg-blue-100",
    text: "text-blue-700",
    icon: Palmtree,
  },
  holiday: {
    label: "Holiday",
    short: "Ho",
    bg: "bg-purple-100",
    text: "text-purple-700",
    icon: Star,
  },
};

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
function prevMonth(m: string) {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(y, mo - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function nextMonth(m: string) {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(y, mo, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(m: string) {
  const [y, mo] = m.split("-");
  return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}
function daysInMonth(m: string) {
  const [y, mo] = m.split("-").map(Number);
  return new Date(y, mo, 0).getDate();
}
function dayName(m: string, d: number) {
  const [y, mo] = m.split("-").map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString("en-IN", {
    weekday: "short",
  });
}
function isSunday(m: string, d: number) {
  const [y, mo] = m.split("-").map(Number);
  return new Date(y, mo - 1, d).getDay() === 0;
}
function todayDateStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function AttendancePage() {
  const { can } = useApp();

  const [month, setMonth] = useState(currentMonth());

  // Local edits before save: key = `${staffId}_${date}` → status
  const [edits, setEdits] = useState<Record<string, AttStatus>>({});
  const [saving, setSaving] = useState(false);

  // Selected date for day-view panel
  const today = todayDateStr();
  const [selectedDay, setSelectedDay] = useState<number>(() => {
    const now = new Date();
    return now.getDate();
  });

  const {
    data: attData,
    isPending: loading,
    refetch,
  } = useApiQuery<{
    records: AttRecord[];
    staff: StaffRow[];
    summary: Summary;
  }>(
    ["hr-attendance-month", month],
    `/api/dashboard/hr/attendance?month=${month}`,
  );
  const records = attData?.records ?? [];
  const staff = attData?.staff ?? [];
  const summary = attData?.summary ?? null;

  function load() {
    setEdits({});
    refetch();
  }

  // Clear pending edits whenever the month (and thus the data) changes
  useEffect(() => {
    setEdits({});
  }, [month]);

  // Build a lookup: `${staffId}_YYYY-MM-DD` → status
  const lookup: Record<string, AttStatus> = {};
  for (const r of records) {
    const d = new Date(r.date);
    const key = `${r.staffId}_${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    lookup[key] = r.status;
  }

  const totalDays = daysInMonth(month);
  const [y, mo] = month.split("-").map(Number);
  const selectedDateStr = `${y}-${String(mo).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;

  function getStatus(staffId: string, day: number): AttStatus | undefined {
    const dateStr = `${y}-${String(mo).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const editKey = `${staffId}_${dateStr}`;
    if (edits[editKey] !== undefined) return edits[editKey];
    return lookup[editKey];
  }

  function setDayStatus(staffId: string, day: number, status: AttStatus) {
    const dateStr = `${y}-${String(mo).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setEdits((prev) => ({ ...prev, [`${staffId}_${dateStr}`]: status }));
  }

  function markAllDay(status: AttStatus) {
    const dateStr = selectedDateStr;
    const next: Record<string, AttStatus> = { ...edits };
    for (const s of staff) {
      next[`${s._id}_${dateStr}`] = status;
    }
    setEdits(next);
  }

  async function saveEdits() {
    if (Object.keys(edits).length === 0)
      return toast.info("No changes to save");
    setSaving(true);

    // Group edits by date
    const byDate: Record<
      string,
      {
        staffId: string;
        staffName: string;
        staffCode: number;
        status: AttStatus;
      }[]
    > = {};
    for (const [key, status] of Object.entries(edits)) {
      const [staffId, dateStr] = key.split(/_(.+)/);
      const s = staff.find((st) => st._id === staffId);
      if (!s) continue;
      if (!byDate[dateStr]) byDate[dateStr] = [];
      byDate[dateStr].push({
        staffId,
        staffName: s.name,
        staffCode: s.staffCode,
        status,
      });
    }

    let failed = false;
    for (const [dateStr, entries] of Object.entries(byDate)) {
      const res = await apiClient.post("/api/dashboard/hr/attendance", {
        date: dateStr,
        entries,
      });
      if (!res.success) {
        failed = true;
        toast.error(res.error ?? "Save failed");
      }
    }

    setSaving(false);
    if (!failed) {
      toast.success("Attendance saved");
      load();
    }
  }

  const hasEdits = Object.keys(edits).length > 0;

  // Stat card counts from summary + edits
  const days = Array.from({ length: totalDays }, (_, i) => i + 1);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 lg:px-6 py-4 border-b border-gray-100 bg-white shrink-0 flex items-center justify-between gap-3">
        <p className="text-xs text-gray-500">
          Mark and track daily attendance for all staff
        </p>
        {hasEdits && can("humanResource", "edit") && (
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={saveEdits}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            {saving ? "Saving…" : `Save Changes (${Object.keys(edits).length})`}
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-5 space-y-4">
        {/* Month navigator + summary */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMonth(prevMonth(month))}
              className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-4 py-1.5 bg-white border border-gray-200 rounded-lg min-w-36 text-center">
              <span className="text-sm font-semibold text-gray-800">
                {monthLabel(month)}
              </span>
            </div>
            <button
              onClick={() => setMonth(nextMonth(month))}
              disabled={month >= currentMonth()}
              className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          {summary && (
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-lg font-semibold">
                <Check className="w-3 h-3" /> {summary.presentDays} Present
              </span>
              <span className="flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 rounded-lg font-semibold">
                <X className="w-3 h-3" /> {summary.absentDays} Absent
              </span>
              <span className="flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded-lg font-semibold">
                <Minus className="w-3 h-3" /> {summary.halfDays} Half Day
              </span>
              <span className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-lg font-semibold">
                <Palmtree className="w-3 h-3" /> {summary.leaveDays} Leave
              </span>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 flex-wrap text-2xs">
          {(
            Object.entries(STATUS_CONFIG) as [
              AttStatus,
              (typeof STATUS_CONFIG)[AttStatus],
            ][]
          ).map(([k, v]) => (
            <span
              key={k}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold ${v.bg} ${v.text}`}
            >
              {v.short} = {v.label}
            </span>
          ))}
          <span className="text-gray-300">|</span>
          <span className="text-gray-400">
            Click a cell to cycle through statuses
          </span>
        </div>

        {/* Day-panel quick actions */}
        <div className="bg-white border border-gray-200 rounded-xl p-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-600">
              Selected date:
            </span>
            <input
              type="date"
              value={selectedDateStr}
              max={today}
              onChange={(e) => {
                const parts = e.target.value.split("-");
                setSelectedDay(Number(parts[2]));
              }}
              className="h-7 text-xs border border-gray-200 rounded-lg px-2 outline-none focus:ring-1 focus:ring-primary-400"
            />
          </div>
          <span className="text-gray-200">|</span>
          <span className="text-xs text-gray-500 font-medium">
            Mark all for this day:
          </span>
          {(["present", "absent", "half_day", "holiday"] as AttStatus[]).map(
            (s) => {
              const cfg = STATUS_CONFIG[s];
              return (
                <button
                  key={s}
                  onClick={() => markAllDay(s)}
                  className={`text-2xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${cfg.bg} ${cfg.text} hover:opacity-80`}
                >
                  All {cfg.label}
                </button>
              );
            },
          )}
        </div>

        {/* Attendance grid */}
        {loading ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            Loading attendance…
          </div>
        ) : staff.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400">
            No active staff found
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table
                className="text-xs"
                style={{
                  minWidth: `${Math.max(800, 200 + totalDays * 36)}px`,
                  width: "100%",
                }}
              >
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="sticky left-0 z-10 bg-gray-50 text-left px-3 py-2 font-semibold text-gray-600 min-w-40 border-r border-gray-200">
                      Staff
                    </th>
                    {days.map((d) => {
                      const sun = isSunday(month, d);
                      const dateStr = `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                      const isToday = dateStr === today;
                      const isSelected = d === selectedDay;
                      return (
                        <th
                          key={d}
                          onClick={() => setSelectedDay(d)}
                          className={`px-0.5 py-1.5 font-semibold text-center cursor-pointer transition-colors w-9 ${
                            isSelected
                              ? "bg-primary-100 text-primary-700"
                              : sun
                                ? "bg-red-50 text-red-400"
                                : isToday
                                  ? "bg-blue-50 text-blue-600"
                                  : "text-gray-500 hover:bg-gray-100"
                          }`}
                        >
                          <div>{d}</div>
                          <div className="text-2xs font-normal opacity-70">
                            {dayName(month, d).slice(0, 2)}
                          </div>
                        </th>
                      );
                    })}
                    <th className="px-3 py-2 font-semibold text-gray-600 text-right min-w-24">
                      Summary
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {staff.map((s) => {
                    let presentCount = 0,
                      absentCount = 0,
                      halfCount = 0,
                      leaveCount = 0;
                    for (let d = 1; d <= totalDays; d++) {
                      const st = getStatus(s._id, d);
                      if (st === "present") presentCount++;
                      else if (st === "absent") absentCount++;
                      else if (st === "half_day") halfCount++;
                      else if (st === "leave") leaveCount++;
                    }
                    return (
                      <tr key={s._id} className="hover:bg-gray-50/50">
                        <td className="sticky left-0 z-10 bg-white hover:bg-gray-50/50 px-3 py-2 border-r border-gray-100 min-w-40">
                          <p className="font-semibold text-gray-800 truncate max-w-36">
                            {s.name}
                          </p>
                          <p className="text-gray-400">
                            #{s.staffCode} · {s.role}
                          </p>
                        </td>
                        {days.map((d) => {
                          const sun = isSunday(month, d);
                          const dateStr = `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                          const isFuture = dateStr > today;
                          const status = getStatus(s._id, d);
                          const isSelected = d === selectedDay;
                          const cfg = status ? STATUS_CONFIG[status] : null;

                          function cycle() {
                            if (isFuture || !can("humanResource", "edit"))
                              return;
                            const order: AttStatus[] = [
                              "present",
                              "absent",
                              "half_day",
                              "leave",
                              "holiday",
                            ];
                            const cur = status ?? undefined;
                            const idx = cur ? order.indexOf(cur) : -1;
                            const next = order[(idx + 1) % order.length];
                            setDayStatus(s._id, d, next);
                          }

                          return (
                            <td
                              key={d}
                              onClick={cycle}
                              className={`p-0.5 text-center w-9 transition-colors ${
                                isSelected
                                  ? "bg-primary-50"
                                  : sun
                                    ? "bg-red-50/50"
                                    : ""
                              } ${!isFuture && can("humanResource", "edit") ? "cursor-pointer" : ""}`}
                            >
                              {cfg ? (
                                <span
                                  className={`inline-flex items-center justify-center w-7 h-6 rounded text-2xs font-bold ${cfg.bg} ${cfg.text}`}
                                >
                                  {cfg.short}
                                </span>
                              ) : (
                                <span
                                  className={`inline-flex items-center justify-center w-7 h-6 rounded text-gray-200 ${isFuture ? "" : "hover:bg-gray-100"}`}
                                >
                                  {sun ? "–" : "·"}
                                </span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end gap-1 flex-wrap">
                            {presentCount > 0 && (
                              <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-2xs font-semibold">
                                {presentCount}P
                              </span>
                            )}
                            {absentCount > 0 && (
                              <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-2xs font-semibold">
                                {absentCount}A
                              </span>
                            )}
                            {halfCount > 0 && (
                              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-2xs font-semibold">
                                {halfCount}H
                              </span>
                            )}
                            {leaveCount > 0 && (
                              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-2xs font-semibold">
                                {leaveCount}L
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
