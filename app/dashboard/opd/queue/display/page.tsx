"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { apiClient } from "@/lib/apiClient";
import { useApp } from "@/lib/context";
import type { OpdVisit } from "@/components/opd/types";

// ── Refresh interval ──────────────────────────────────────────────────────────
const REFRESH_MS = 10_000;

function token(n: number) {
  return String(n).padStart(3, "0");
}

export default function OpdQueueDisplayPage() {
  const { tenant } = useApp();
  const [visits, setVisits] = useState<OpdVisit[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    const res = await apiClient.get<{ visits: OpdVisit[] }>(
      "/api/dashboard/opd?tab=today&limit=200",
    );
    if (res.success) {
      setVisits(res.data?.visits ?? []);
      setLastRefresh(new Date());
    }
  }, []);

  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, REFRESH_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [load]);

  const inProgress = visits.find((v) => v.status === "IN_PROGRESS") ?? null;
  const waiting = visits
    .filter((v) => v.status === "WAITING")
    .sort((a, b) => a.opdNumber - b.opdNumber);
  const completed = visits.filter((v) => v.status === "COMPLETED");

  const timeStr = lastRefresh.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-8 py-4 bg-gray-900 border-b border-gray-800">
        <div>
          <p className="text-primary-400 text-sm font-semibold uppercase tracking-widest">
            OPD Queue
          </p>
          <p className="text-white text-xl font-bold">
            {tenant?.name ?? "Clinic"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-gray-400 text-sm">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
          <p className="text-gray-500 text-xs mt-0.5">
            Last updated: {timeStr}
          </p>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden">
        {/* NOW SERVING — left/top panel */}
        <div className="flex-1 flex flex-col items-center justify-center bg-primary-950 p-8 lg:p-12 min-h-[55vh] lg:min-h-0">
          <p className="text-primary-300 text-sm font-semibold uppercase tracking-[0.3em] mb-6">
            Now Serving
          </p>

          {inProgress ? (
            <>
              {/* Big token number */}
              <div className="text-[120px] lg:text-[160px] font-black leading-none text-white tabular-nums">
                {token(inProgress.opdNumber)}
              </div>

              {/* Patient info */}
              <div className="mt-4 text-center space-y-1">
                <p className="text-3xl font-bold text-primary-100">
                  {inProgress.patientId?.name ?? "—"}
                </p>
                {inProgress.doctorId && (
                  <p className="text-primary-300 text-lg">
                    Dr. {inProgress.doctorId.name}
                    {inProgress.doctorId.specialization
                      ? ` · ${inProgress.doctorId.specialization}`
                      : ""}
                  </p>
                )}
              </div>

              {/* Please proceed */}
              <div className="mt-8 px-6 py-3 bg-primary-700 rounded-xl text-primary-100 text-sm font-medium text-center">
                Please proceed to the consultation room
              </div>
            </>
          ) : (
            <div className="text-center space-y-4">
              <div className="text-[80px] font-black text-primary-800 leading-none">
                ---
              </div>
              <p className="text-primary-400 text-lg">
                Queue is empty &mdash; no patient in progress
              </p>
            </div>
          )}
        </div>

        {/* Queue panel — right/bottom */}
        <div className="w-full lg:w-80 xl:w-96 bg-gray-900 flex flex-col border-t lg:border-t-0 lg:border-l border-gray-800">
          {/* Waiting list */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-gray-300 text-sm font-semibold uppercase tracking-wide">
                Waiting
              </h2>
              <span className="bg-warning-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {waiting.length}
              </span>
            </div>

            {waiting.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-8">
                No patients waiting
              </p>
            ) : (
              <div className="space-y-2">
                {waiting.map((v, i) => (
                  <div
                    key={v._id}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${
                      i === 0
                        ? "bg-warning-900 border border-warning-700"
                        : "bg-gray-800"
                    }`}
                  >
                    <span
                      className={`text-lg font-black tabular-nums shrink-0 w-12 text-center ${
                        i === 0 ? "text-warning-300" : "text-gray-400"
                      }`}
                    >
                      {token(v.opdNumber)}
                    </span>
                    <div className="min-w-0">
                      <p
                        className={`text-sm font-medium truncate ${
                          i === 0 ? "text-warning-100" : "text-gray-200"
                        }`}
                      >
                        {v.patientId?.name ?? "—"}
                      </p>
                      {v.doctorId && (
                        <p className="text-xs text-gray-500 truncate">
                          Dr. {v.doctorId.name}
                        </p>
                      )}
                    </div>
                    {i === 0 && (
                      <span className="ml-auto text-2xs font-bold text-warning-400 shrink-0">
                        NEXT
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Completed count footer */}
          <div className="border-t border-gray-800 px-4 py-3 flex items-center justify-between">
            <span className="text-gray-500 text-xs">Completed today</span>
            <span className="text-success-400 text-sm font-bold">
              {completed.length}
            </span>
          </div>
        </div>
      </div>

      {/* Ticker */}
      <div className="bg-primary-700 px-6 py-2 overflow-hidden">
        <p className="text-primary-100 text-sm whitespace-nowrap animate-marquee">
          Welcome to {tenant?.name ?? "our clinic"} &nbsp;&nbsp;·&nbsp;&nbsp;
          Kindly wait for your token number to be called &nbsp;&nbsp;·&nbsp;&nbsp;
          Please maintain silence in the waiting area &nbsp;&nbsp;·&nbsp;&nbsp;
          Carry all medical records and prescriptions for your visit &nbsp;&nbsp;·&nbsp;&nbsp;
          For emergencies, please inform the receptionist immediately
        </p>
      </div>
    </div>
  );
}
