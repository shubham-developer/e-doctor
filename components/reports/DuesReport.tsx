"use client";

import { AlertCircle, Phone, User } from "lucide-react";
import type { DuesData, DuePatient } from "./types";

// ── Aging helper ──────────────────────────────────────────────────────────────

function ageBucket(oldestDue: string): "0-30" | "31-60" | "61-90" | "90+" {
  const days = Math.floor(
    (Date.now() - new Date(oldestDue).getTime()) / 86_400_000,
  );
  if (days <= 30) return "0-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  return "90+";
}

const BUCKET_COLOR: Record<string, string> = {
  "0-30": "bg-success-50 text-success-700 border-success-200",
  "31-60": "bg-warning-50 text-warning-700 border-warning-200",
  "61-90": "bg-orange-50 text-orange-700 border-orange-200",
  "90+": "bg-danger-50 text-danger-700 border-danger-200",
};

// ── Summary stat card ─────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  color = "text-gray-800",
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex flex-col gap-1">
      <p className="text-2xs font-semibold text-gray-500 uppercase tracking-wide">
        {label}
      </p>
      <p className={`text-lg font-bold leading-none ${color}`}>{value}</p>
      {sub && <p className="text-2xs text-gray-400">{sub}</p>}
    </div>
  );
}

// ── Aging summary row ─────────────────────────────────────────────────────────

function AgingBar({
  patients,
  fmt,
}: {
  patients: DuePatient[];
  fmt: (n: number) => string;
}) {
  const buckets = { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
  const counts = { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
  for (const p of patients) {
    const b = ageBucket(p.oldestDue);
    buckets[b] += p.total;
    counts[b]++;
  }
  const labels: Record<string, string> = {
    "0-30": "0–30 days",
    "31-60": "31–60 days",
    "61-90": "61–90 days",
    "90+": "90+ days",
  };
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <p className="text-xs font-semibold text-gray-700 mb-3">Aging Analysis</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["0-30", "31-60", "61-90", "90+"] as const).map((b) => (
          <div
            key={b}
            className={`border rounded-lg px-3 py-2.5 ${BUCKET_COLOR[b]}`}
          >
            <p className="text-2xs font-semibold uppercase tracking-wide opacity-70">
              {labels[b]}
            </p>
            <p className="text-base font-bold mt-0.5">{fmt(buckets[b])}</p>
            <p className="text-2xs opacity-60 mt-0.5">
              {counts[b]} patient{counts[b] !== 1 ? "s" : ""}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function DuesReport({
  data,
  fmt,
}: {
  data: DuesData;
  fmt: (n: number) => string;
}) {
  const patients = data?.patients ?? [];
  const totals = data?.totals ?? { opd: 0, ipd: 0, pharmacy: 0, pathology: 0, radiology: 0, grand: 0 };

  if (patients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
        <AlertCircle className="w-12 h-12 opacity-20" />
        <p className="text-sm font-medium">No outstanding dues</p>
        <p className="text-xs">All bills are fully settled.</p>
      </div>
    );
  }

  const modules: { key: keyof typeof totals; label: string }[] = [
    { key: "opd", label: "OPD" },
    { key: "ipd", label: "IPD" },
    { key: "pharmacy", label: "Pharmacy" },
    { key: "pathology", label: "Pathology" },
    { key: "radiology", label: "Radiology" },
  ];

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          label="Total Outstanding"
          value={fmt(totals.grand)}
          sub={`${patients.length} patients`}
          color="text-danger-600"
        />
        {modules.map((m) =>
          totals[m.key] > 0 ? (
            <StatCard
              key={m.key}
              label={m.label}
              value={fmt(totals[m.key])}
            />
          ) : null,
        )}
      </div>

      {/* Aging analysis */}
      <AgingBar patients={patients} fmt={fmt} />

      {/* Patient table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-800">
            Patient-wise Dues
          </p>
          <p className="text-2xs text-gray-400">
            Sorted by highest balance first
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[760px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {[
                  "Patient",
                  "Phone",
                  "OPD",
                  "IPD",
                  "Pharmacy",
                  "Pathology",
                  "Radiology",
                  "Total Due",
                  "Oldest Bill",
                  "Aging",
                ].map((h) => (
                  <th
                    key={h}
                    className={`px-3 py-2.5 text-2xs font-semibold text-gray-500 uppercase tracking-wide ${
                      ["OPD", "IPD", "Pharmacy", "Pathology", "Radiology", "Total Due"].includes(h)
                        ? "text-right"
                        : "text-left"
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {patients.map((p) => {
                const bucket = ageBucket(p.oldestDue);
                return (
                  <tr key={p.patientId} className="hover:bg-gray-50">
                    {/* Patient */}
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3 h-3 text-gray-300 shrink-0" />
                        <div>
                          <p className="font-medium text-gray-800">{p.name}</p>
                          {p.patientCode && (
                            <p className="text-2xs text-gray-400">
                              #{p.patientCode}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Phone */}
                    <td className="px-3 py-2.5">
                      {p.phone ? (
                        <div className="flex items-center gap-1 text-gray-600">
                          <Phone className="w-2.5 h-2.5 shrink-0" />
                          {p.phone}
                        </div>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>

                    {/* Module amounts */}
                    {(["opd", "ipd", "pharmacy", "pathology", "radiology"] as const).map(
                      (mod) => (
                        <td key={mod} className="px-3 py-2.5 text-right">
                          {p[mod] > 0 ? (
                            <span className="text-gray-700">{fmt(p[mod])}</span>
                          ) : (
                            <span className="text-gray-200">—</span>
                          )}
                        </td>
                      ),
                    )}

                    {/* Total */}
                    <td className="px-3 py-2.5 text-right">
                      <span className="font-bold text-danger-600">
                        {fmt(p.total)}
                      </span>
                    </td>

                    {/* Oldest bill date */}
                    <td className="px-3 py-2.5 text-gray-500">
                      {p.oldestDue}
                    </td>

                    {/* Aging badge */}
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-2xs font-medium border ${BUCKET_COLOR[bucket]}`}
                      >
                        {bucket} days
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Footer totals */}
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-300 font-semibold">
                <td className="px-3 py-2.5 text-gray-700">
                  {patients.length} patient{patients.length !== 1 ? "s" : ""}
                </td>
                <td />
                {(
                  ["opd", "ipd", "pharmacy", "pathology", "radiology"] as const
                ).map((mod) => (
                  <td key={mod} className="px-3 py-2.5 text-right text-gray-700">
                    {totals[mod] > 0 ? fmt(totals[mod]) : "—"}
                  </td>
                ))}
                <td className="px-3 py-2.5 text-right text-danger-700 font-bold">
                  {fmt(totals.grand)}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
