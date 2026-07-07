"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApiQuery } from "@/lib/useApiQuery";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type AttStatus = "present" | "absent" | "half_day" | "leave" | "holiday";

interface StaffWithStatus {
  _id: string;
  name: string;
  staffCode: number;
  department: string;
  role: string;
  todayStatus: AttStatus | null;
}

interface TodaySummary {
  present: number;
  absent: number;
  halfDay: number;
  onLeave: number;
  notMarked: number;
}

const STATUS_CFG: Record<
  AttStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  present: {
    label: "Present",
    bg: "bg-green-100",
    text: "text-green-700",
    dot: "bg-green-500",
  },
  absent: {
    label: "Absent",
    bg: "bg-red-100",
    text: "text-red-700",
    dot: "bg-red-500",
  },
  half_day: {
    label: "Half Day",
    bg: "bg-amber-100",
    text: "text-amber-700",
    dot: "bg-amber-500",
  },
  leave: {
    label: "On Leave",
    bg: "bg-blue-100",
    text: "text-blue-700",
    dot: "bg-blue-500",
  },
  holiday: {
    label: "Holiday",
    bg: "bg-purple-100",
    text: "text-purple-700",
    dot: "bg-purple-500",
  },
};

export function TodayAttendancePanel() {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [filter, setFilter] = useState<AttStatus | "not_marked" | "all">("all");

  const todayStr = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const todayParam = new Date().toISOString().slice(0, 10);

  const { data: attendanceData, isPending: loading } = useApiQuery<{
    staff: StaffWithStatus[];
    summary: TodaySummary;
  }>(
    ["hr-attendance", todayParam],
    `/api/dashboard/hr/attendance?date=${todayParam}`,
  );
  const staff = attendanceData?.staff ?? [];
  const summary = attendanceData?.summary ?? null;

  const filtered = staff.filter((s) => {
    if (filter === "all") return true;
    if (filter === "not_marked") return s.todayStatus === null;
    return s.todayStatus === filter;
  });

  return (
    <div className="bg-white border-b">
      {/* Toggle bar */}
      <Button
        variant="ghost"
        onClick={() => setOpen((o) => !o)}
        className="w-full h-auto flex items-center justify-between px-6 py-3 rounded-none font-normal"
      >
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-semibold text-gray-800">
            Today&apos;s Attendance
          </span>
          <span className="text-xs text-gray-400">{todayStr}</span>
          {summary && (
            <div className="flex items-center gap-2 ml-2">
              {summary.present > 0 && (
                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-2xs font-semibold">
                  {summary.present} Present
                </span>
              )}
              {summary.absent > 0 && (
                <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-2xs font-semibold">
                  {summary.absent} Absent
                </span>
              )}
              {summary.onLeave > 0 && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-2xs font-semibold">
                  {summary.onLeave} On Leave
                </span>
              )}
              {summary.halfDay > 0 && (
                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-2xs font-semibold">
                  {summary.halfDay} Half Day
                </span>
              )}
              {summary.notMarked > 0 && (
                <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-2xs font-semibold">
                  {summary.notMarked} Not Marked
                </span>
              )}
            </div>
          )}
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </Button>

      {open && (
        <div className="px-6 pb-4 space-y-3">
          {/* Filter chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {(
              [
                { key: "all", label: "All Staff" },
                { key: "present", label: "Present" },
                { key: "absent", label: "Absent" },
                { key: "leave", label: "On Leave" },
                { key: "half_day", label: "Half Day" },
                { key: "not_marked", label: "Not Marked" },
              ] as { key: typeof filter; label: string }[]
            ).map((f) => (
              <Button
                key={f.key}
                variant="ghost"
                size="sm"
                onClick={() => setFilter(f.key)}
                className={`rounded-full font-semibold ${
                  filter === f.key
                    ? "bg-primary-600 text-white hover:bg-primary-600 hover:text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {f.label}
              </Button>
            ))}
            <Button
              variant="link"
              onClick={() => router.push("/dashboard/hr/attendance")}
              className="ml-auto h-auto p-0 text-xs font-medium"
            >
              Mark Attendance →
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-6 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">
              No staff in this category
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-48 overflow-y-auto pr-1">
              {filtered.map((s) => {
                const cfg = s.todayStatus ? STATUS_CFG[s.todayStatus] : null;
                return (
                  <div
                    key={s._id}
                    className="flex items-center gap-2 p-2 rounded-lg border border-gray-100 bg-gray-50 min-w-0"
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white ${cfg ? cfg.dot : "bg-gray-300"}`}
                    >
                      {s.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-800 truncate">
                        {s.name}
                      </p>
                      {cfg ? (
                        <span className={`text-2xs font-semibold ${cfg.text}`}>
                          {cfg.label}
                        </span>
                      ) : (
                        <span className="text-2xs text-gray-400">
                          Not marked
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
