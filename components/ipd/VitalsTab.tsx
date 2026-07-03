"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/context";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Plus, Trash2, Activity, X } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────────────────────────────

interface IpdVital {
  _id: string;
  recordedAt: string;
  temperature?: number;
  bpSystolic?: number;
  bpDiastolic?: number;
  pulseRate?: number;
  spo2?: number;
  respiratoryRate?: number;
  rbs?: number;
  weight?: number;
  note?: string;
  recordedByName?: string;
}

// ── Normal ranges ──────────────────────────────────────────────────────────────

const RANGES = {
  temperature: { low: 97, high: 99.5, unit: "°F" },
  bpSystolic: { low: 90, high: 140, unit: "mmHg" },
  bpDiastolic: { low: 60, high: 90, unit: "mmHg" },
  pulseRate: { low: 60, high: 100, unit: "bpm" },
  spo2: { low: 95, high: 100, unit: "%" },
  respiratoryRate: { low: 12, high: 20, unit: "/min" },
  rbs: { low: 70, high: 200, unit: "mg/dL" },
  weight: { low: 0, high: Infinity, unit: "kg" },
} as const;

type VitalKey = keyof typeof RANGES;

function status(key: VitalKey, val: number): "normal" | "warning" | "critical" {
  const r = RANGES[key];
  if (key === "spo2") {
    if (val < 90) return "critical";
    if (val < 95) return "warning";
    return "normal";
  }
  if (key === "bpSystolic") {
    if (val > 180 || val < 80) return "critical";
    if (val > 140 || val < 90) return "warning";
    return "normal";
  }
  if (val < r.low || val > r.high) return "warning";
  return "normal";
}

const STATUS_COLOR = {
  normal: "text-success-700 bg-success-50",
  warning: "text-warning-700 bg-warning-50",
  critical: "text-danger-700 bg-danger-50",
};

const STATUS_DOT = {
  normal: "bg-success-500",
  warning: "bg-warning-500",
  critical: "bg-danger-500",
};

// ── Chart config ───────────────────────────────────────────────────────────────

type ChartGroup = "bp" | "temperature" | "pulse" | "spo2" | "rr" | "rbs";

const CHART_GROUPS: { key: ChartGroup; label: string }[] = [
  { key: "bp", label: "Blood Pressure" },
  { key: "temperature", label: "Temperature" },
  { key: "pulse", label: "Pulse Rate" },
  { key: "spo2", label: "SpO₂" },
  { key: "rr", label: "Resp. Rate" },
  { key: "rbs", label: "Blood Sugar" },
];

// ── Summary card ───────────────────────────────────────────────────────────────

function VitalCard({
  label,
  value,
  unit,
  vitalKey,
}: {
  label: string;
  value: number | undefined;
  unit: string;
  vitalKey: VitalKey;
}) {
  const s = value != null ? status(vitalKey, value) : "normal";
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 flex flex-col gap-1 min-w-[100px]">
      <span className="text-2xs text-gray-500 font-medium uppercase tracking-wide">
        {label}
      </span>
      {value != null ? (
        <div className="flex items-end gap-1">
          <span className={`text-lg font-bold leading-none ${STATUS_COLOR[s].split(" ")[0]}`}>
            {value}
          </span>
          <span className="text-2xs text-gray-400 mb-0.5">{unit}</span>
          <span
            className={`ml-auto w-2 h-2 rounded-full shrink-0 mb-1 ${STATUS_DOT[s]}`}
          />
        </div>
      ) : (
        <span className="text-sm text-gray-300">—</span>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

const inp =
  "h-8 w-full px-2 text-xs border border-gray-300 rounded focus:border-primary-400 focus:ring-1 focus:ring-primary-100 outline-none bg-white";
const lbl = "block text-2xs font-semibold text-gray-500 uppercase mb-1";

const EMPTY_FORM = {
  recordedAt: "",
  temperature: "",
  bpSystolic: "",
  bpDiastolic: "",
  pulseRate: "",
  spo2: "",
  respiratoryRate: "",
  rbs: "",
  weight: "",
  note: "",
};

export function VitalsTab({ ipdId }: { ipdId: string }) {
  const { user } = useApp();
  const canWrite = user?.role !== "VIEWER";

  const [vitals, setVitals] = useState<IpdVital[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [chartGroup, setChartGroup] = useState<ChartGroup>("bp");

  useEffect(() => {
    apiClient
      .get<IpdVital[]>(`/api/dashboard/ipd/${ipdId}/vitals`)
      .then((d) => {
        if (d.success) setVitals(d.data);
        else toast.error(d.error ?? "Failed to load vitals");
      })
      .finally(() => setLoading(false));
  }, [ipdId]);

  function set(field: keyof typeof EMPTY_FORM, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!form.recordedAt) {
      toast.error("Date & time is required");
      return;
    }
    const payload = {
      recordedAt: form.recordedAt,
      temperature: form.temperature ? Number(form.temperature) : undefined,
      bpSystolic: form.bpSystolic ? Number(form.bpSystolic) : undefined,
      bpDiastolic: form.bpDiastolic ? Number(form.bpDiastolic) : undefined,
      pulseRate: form.pulseRate ? Number(form.pulseRate) : undefined,
      spo2: form.spo2 ? Number(form.spo2) : undefined,
      respiratoryRate: form.respiratoryRate
        ? Number(form.respiratoryRate)
        : undefined,
      rbs: form.rbs ? Number(form.rbs) : undefined,
      weight: form.weight ? Number(form.weight) : undefined,
      note: form.note || undefined,
    };
    const hasVital = Object.entries(payload).some(
      ([k, v]) => k !== "recordedAt" && k !== "note" && v != null,
    );
    if (!hasVital) {
      toast.error("Enter at least one vital sign");
      return;
    }
    setSaving(true);
    try {
      const res = await apiClient.post<IpdVital>(
        `/api/dashboard/ipd/${ipdId}/vitals`,
        payload,
      );
      if (res.success) {
        setVitals((prev) =>
          [...prev, res.data].sort((a, b) =>
            a.recordedAt.localeCompare(b.recordedAt),
          ),
        );
        setForm(EMPTY_FORM);
        setShowForm(false);
        toast.success("Vitals recorded");
      } else {
        toast.error(res.error ?? "Failed to save");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this vital reading?")) return;
    const res = await apiClient.delete(
      `/api/dashboard/ipd/${ipdId}/vitals/${id}`,
    );
    if (res.success) {
      setVitals((prev) => prev.filter((v) => v._id !== id));
      toast.success("Deleted");
    } else {
      toast.error(res.error ?? "Delete failed");
    }
  }

  // Latest reading for summary cards
  const latest = vitals.length > 0 ? vitals[vitals.length - 1] : null;

  // Chart data — x-axis label shortened for display
  const chartData = vitals.map((v) => ({
    label: v.recordedAt.replace("T", " ").slice(5, 16), // "MM-DD HH:mm"
    temperature: v.temperature,
    bpSystolic: v.bpSystolic,
    bpDiastolic: v.bpDiastolic,
    pulseRate: v.pulseRate,
    spo2: v.spo2,
    respiratoryRate: v.respiratoryRate,
    rbs: v.rbs,
  }));

  function formatDateTime(dt: string) {
    const [date, time] = dt.split("T");
    const [y, m, d] = date.split("-");
    return `${d}/${m}/${y} ${time ?? ""}`;
  }

  const tableReversed = [...vitals].reverse();

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-800">Vital Signs</h2>
          <p className="text-2xs text-gray-400 mt-0.5">
            {vitals.length} reading{vitals.length !== 1 ? "s" : ""}
          </p>
        </div>
        {canWrite && (
          <button
            onClick={() => {
              setForm({
                ...EMPTY_FORM,
                recordedAt: new Date().toISOString().slice(0, 16),
              });
              setShowForm((v) => !v);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Record Vitals
          </button>
        )}
      </div>

      {/* ── Add form ── */}
      {showForm && (
        <div className="border border-primary-200 bg-primary-50/40 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-primary-700">
              New Vital Reading
            </p>
            <button
              onClick={() => setShowForm(false)}
              className="p-1 rounded hover:bg-primary-100 text-primary-500"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="col-span-2 sm:col-span-2">
              <label className={lbl}>
                Date & Time <span className="text-danger-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={form.recordedAt}
                onChange={(e) => set("recordedAt", e.target.value)}
                className={inp}
              />
            </div>

            <div>
              <label className={lbl}>Temp (°F)</label>
              <input
                type="number"
                step="0.1"
                min={90}
                max={110}
                placeholder="98.6"
                value={form.temperature}
                onChange={(e) => set("temperature", e.target.value)}
                className={inp}
              />
            </div>

            <div>
              <label className={lbl}>Pulse (bpm)</label>
              <input
                type="number"
                min={20}
                max={300}
                placeholder="80"
                value={form.pulseRate}
                onChange={(e) => set("pulseRate", e.target.value)}
                className={inp}
              />
            </div>

            <div>
              <label className={lbl}>BP Systolic</label>
              <input
                type="number"
                min={50}
                max={300}
                placeholder="120"
                value={form.bpSystolic}
                onChange={(e) => set("bpSystolic", e.target.value)}
                className={inp}
              />
            </div>

            <div>
              <label className={lbl}>BP Diastolic</label>
              <input
                type="number"
                min={30}
                max={200}
                placeholder="80"
                value={form.bpDiastolic}
                onChange={(e) => set("bpDiastolic", e.target.value)}
                className={inp}
              />
            </div>

            <div>
              <label className={lbl}>SpO₂ (%)</label>
              <input
                type="number"
                min={50}
                max={100}
                placeholder="98"
                value={form.spo2}
                onChange={(e) => set("spo2", e.target.value)}
                className={inp}
              />
            </div>

            <div>
              <label className={lbl}>Resp. Rate (/min)</label>
              <input
                type="number"
                min={5}
                max={60}
                placeholder="16"
                value={form.respiratoryRate}
                onChange={(e) => set("respiratoryRate", e.target.value)}
                className={inp}
              />
            </div>

            <div>
              <label className={lbl}>RBS (mg/dL)</label>
              <input
                type="number"
                min={20}
                max={600}
                placeholder="120"
                value={form.rbs}
                onChange={(e) => set("rbs", e.target.value)}
                className={inp}
              />
            </div>

            <div>
              <label className={lbl}>Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                min={1}
                max={300}
                placeholder="70"
                value={form.weight}
                onChange={(e) => set("weight", e.target.value)}
                className={inp}
              />
            </div>

            <div className="col-span-2 sm:col-span-4">
              <label className={lbl}>Note</label>
              <input
                type="text"
                placeholder="Optional observation…"
                value={form.note}
                onChange={(e) => set("note", e.target.value)}
                className={inp}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => setShowForm(false)}
              className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-1.5 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50 font-medium"
            >
              {saving ? "Saving…" : "Save Reading"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-24 bg-white border border-gray-200 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : vitals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
          <Activity className="w-12 h-12 opacity-20" />
          <p className="text-sm">No vitals recorded yet</p>
          {canWrite && (
            <p className="text-xs">Click "Record Vitals" to add the first reading</p>
          )}
        </div>
      ) : (
        <>
          {/* ── Latest reading summary cards ── */}
          <div>
            <p className="text-2xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Latest Reading —{" "}
              {latest ? formatDateTime(latest.recordedAt) : ""}
            </p>
            <div className="flex flex-wrap gap-2">
              {latest?.temperature != null && (
                <VitalCard
                  label="Temp"
                  value={latest.temperature}
                  unit="°F"
                  vitalKey="temperature"
                />
              )}
              {(latest?.bpSystolic != null || latest?.bpDiastolic != null) && (
                <div className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 flex flex-col gap-1 min-w-[110px]">
                  <span className="text-2xs text-gray-500 font-medium uppercase tracking-wide">
                    Blood Pressure
                  </span>
                  <div className="flex items-end gap-1">
                    <span
                      className={`text-lg font-bold leading-none ${latest.bpSystolic != null ? STATUS_COLOR[status("bpSystolic", latest.bpSystolic)].split(" ")[0] : "text-gray-300"}`}
                    >
                      {latest.bpSystolic ?? "—"}
                    </span>
                    <span className="text-sm text-gray-400 mb-0.5">/</span>
                    <span
                      className={`text-base font-semibold leading-none ${latest.bpDiastolic != null ? STATUS_COLOR[status("bpDiastolic", latest.bpDiastolic)].split(" ")[0] : "text-gray-300"}`}
                    >
                      {latest.bpDiastolic ?? "—"}
                    </span>
                    <span className="text-2xs text-gray-400 mb-0.5">mmHg</span>
                  </div>
                </div>
              )}
              {latest?.pulseRate != null && (
                <VitalCard
                  label="Pulse"
                  value={latest.pulseRate}
                  unit="bpm"
                  vitalKey="pulseRate"
                />
              )}
              {latest?.spo2 != null && (
                <VitalCard
                  label="SpO₂"
                  value={latest.spo2}
                  unit="%"
                  vitalKey="spo2"
                />
              )}
              {latest?.respiratoryRate != null && (
                <VitalCard
                  label="Resp. Rate"
                  value={latest.respiratoryRate}
                  unit="/min"
                  vitalKey="respiratoryRate"
                />
              )}
              {latest?.rbs != null && (
                <VitalCard
                  label="Blood Sugar"
                  value={latest.rbs}
                  unit="mg/dL"
                  vitalKey="rbs"
                />
              )}
              {latest?.weight != null && (
                <VitalCard
                  label="Weight"
                  value={latest.weight}
                  unit="kg"
                  vitalKey="weight"
                />
              )}
            </div>
          </div>

          {/* ── Trend chart ── */}
          {vitals.length >= 2 && (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              {/* Chart group selector */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {CHART_GROUPS.map((g) => (
                  <button
                    key={g.key}
                    onClick={() => setChartGroup(g.key)}
                    className={`px-2.5 py-1 text-2xs font-medium rounded-full border transition-colors ${
                      chartGroup === g.key
                        ? "bg-primary-600 text-white border-primary-600"
                        : "bg-white text-gray-500 border-gray-200 hover:border-primary-300 hover:text-primary-600"
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>

              <ResponsiveContainer width="100%" height={220}>
                <LineChart
                  data={chartData}
                  margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "#9ca3af" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#9ca3af" }}
                    tickLine={false}
                    axisLine={false}
                    domain={["auto", "auto"]}
                  />
                  <Tooltip
                    contentStyle={{
                      fontSize: 11,
                      borderRadius: 8,
                      border: "1px solid #e5e7eb",
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  />

                  {chartGroup === "bp" && (
                    <>
                      <ReferenceLine y={140} stroke="#fbbf24" strokeDasharray="4 2" strokeWidth={1} />
                      <ReferenceLine y={90} stroke="#fbbf24" strokeDasharray="4 2" strokeWidth={1} />
                      <Line
                        type="monotone"
                        dataKey="bpSystolic"
                        name="Systolic"
                        stroke="#ef4444"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        connectNulls
                      />
                      <Line
                        type="monotone"
                        dataKey="bpDiastolic"
                        name="Diastolic"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        connectNulls
                      />
                    </>
                  )}
                  {chartGroup === "temperature" && (
                    <>
                      <ReferenceLine y={99.5} stroke="#fbbf24" strokeDasharray="4 2" strokeWidth={1} />
                      <ReferenceLine y={97} stroke="#fbbf24" strokeDasharray="4 2" strokeWidth={1} />
                      <Line
                        type="monotone"
                        dataKey="temperature"
                        name="Temp (°F)"
                        stroke="#f97316"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        connectNulls
                      />
                    </>
                  )}
                  {chartGroup === "pulse" && (
                    <>
                      <ReferenceLine y={100} stroke="#fbbf24" strokeDasharray="4 2" strokeWidth={1} />
                      <ReferenceLine y={60} stroke="#fbbf24" strokeDasharray="4 2" strokeWidth={1} />
                      <Line
                        type="monotone"
                        dataKey="pulseRate"
                        name="Pulse (bpm)"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        connectNulls
                      />
                    </>
                  )}
                  {chartGroup === "spo2" && (
                    <>
                      <ReferenceLine y={95} stroke="#fbbf24" strokeDasharray="4 2" strokeWidth={1} />
                      <Line
                        type="monotone"
                        dataKey="spo2"
                        name="SpO₂ (%)"
                        stroke="#06b6d4"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        connectNulls
                      />
                    </>
                  )}
                  {chartGroup === "rr" && (
                    <>
                      <ReferenceLine y={20} stroke="#fbbf24" strokeDasharray="4 2" strokeWidth={1} />
                      <ReferenceLine y={12} stroke="#fbbf24" strokeDasharray="4 2" strokeWidth={1} />
                      <Line
                        type="monotone"
                        dataKey="respiratoryRate"
                        name="Resp. Rate (/min)"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        connectNulls
                      />
                    </>
                  )}
                  {chartGroup === "rbs" && (
                    <>
                      <ReferenceLine y={200} stroke="#fbbf24" strokeDasharray="4 2" strokeWidth={1} />
                      <ReferenceLine y={70} stroke="#fbbf24" strokeDasharray="4 2" strokeWidth={1} />
                      <Line
                        type="monotone"
                        dataKey="rbs"
                        name="Blood Sugar (mg/dL)"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        connectNulls
                      />
                    </>
                  )}
                </LineChart>
              </ResponsiveContainer>
              <p className="text-2xs text-gray-400 text-center mt-1">
                Dashed lines indicate normal range boundaries
              </p>
            </div>
          )}

          {/* ── Table ── */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[700px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {[
                      "Date / Time",
                      "Temp °F",
                      "BP (S/D)",
                      "Pulse",
                      "SpO₂",
                      "RR",
                      "RBS",
                      "Weight",
                      "Note",
                      "By",
                      "",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2.5 text-left font-semibold text-gray-600 uppercase tracking-wide text-2xs whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tableReversed.map((v) => (
                    <tr key={v._id} className="hover:bg-gray-50">
                      <td className="px-3 py-2.5 whitespace-nowrap font-mono text-2xs text-gray-500">
                        {formatDateTime(v.recordedAt)}
                      </td>

                      <td className="px-3 py-2.5">
                        <VitalCell
                          value={v.temperature}
                          vitalKey="temperature"
                        />
                      </td>

                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {v.bpSystolic != null || v.bpDiastolic != null ? (
                          <span>
                            <VitalCell
                              value={v.bpSystolic}
                              vitalKey="bpSystolic"
                              inline
                            />
                            <span className="text-gray-300 mx-0.5">/</span>
                            <VitalCell
                              value={v.bpDiastolic}
                              vitalKey="bpDiastolic"
                              inline
                            />
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>

                      <td className="px-3 py-2.5">
                        <VitalCell value={v.pulseRate} vitalKey="pulseRate" />
                      </td>
                      <td className="px-3 py-2.5">
                        <VitalCell value={v.spo2} vitalKey="spo2" />
                      </td>
                      <td className="px-3 py-2.5">
                        <VitalCell
                          value={v.respiratoryRate}
                          vitalKey="respiratoryRate"
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <VitalCell value={v.rbs} vitalKey="rbs" />
                      </td>
                      <td className="px-3 py-2.5 text-gray-600">
                        {v.weight != null ? `${v.weight} kg` : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>

                      <td className="px-3 py-2.5 text-gray-500 max-w-[120px] truncate">
                        {v.note || <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-gray-400 whitespace-nowrap">
                        {v.recordedByName || "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        {canWrite && (
                          <button
                            onClick={() => handleDelete(v._id)}
                            className="p-1 rounded hover:bg-danger-50 text-gray-300 hover:text-danger-500 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Inline vital cell with color ───────────────────────────────────────────────

function VitalCell({
  value,
  vitalKey,
  inline,
}: {
  value: number | undefined;
  vitalKey: VitalKey;
  inline?: boolean;
}) {
  if (value == null) {
    return inline ? (
      <span className="text-gray-300">—</span>
    ) : (
      <span className="text-gray-300">—</span>
    );
  }
  const s = status(vitalKey, value);
  const color =
    s === "critical"
      ? "text-danger-600 font-semibold"
      : s === "warning"
        ? "text-warning-600 font-medium"
        : "text-gray-800";
  return <span className={color}>{value}</span>;
}
