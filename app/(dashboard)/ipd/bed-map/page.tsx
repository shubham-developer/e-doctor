"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BedDouble,
  RefreshCw,
  ChevronLeft,
  User,
  Stethoscope,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApiQuery } from "@/lib/useApiQuery";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PatientOccupant {
  ipdId: string;
  ipdNumber?: number;
  name: string;
  uhid?: string;
  age?: number;
  gender?: string;
  admissionDate: string;
  doctorName?: string;
  los: number;
}

interface BedEntry {
  _id: string;
  name: string;
  bedType: string;
  bedGroup: string;
  floor: string;
  status: "available" | "allotted";
  patient?: PatientOccupant;
}

interface GroupInfo {
  name: string;
  beds: BedEntry[];
  total: number;
  occupied: number;
}

interface FloorInfo {
  name: string;
  groups: GroupInfo[];
  total: number;
  occupied: number;
}

interface BedMapData {
  floors: FloorInfo[];
  summary: {
    total: number;
    occupied: number;
    available: number;
    occupancyRate: number;
  };
}

// ── Bed card ──────────────────────────────────────────────────────────────────

function BedCard({ bed, onClick }: { bed: BedEntry; onClick?: () => void }) {
  const occupied = bed.status === "allotted" && bed.patient;

  if (occupied && bed.patient) {
    const p = bed.patient;
    return (
      <button
        onClick={onClick}
        title={`${p.name}${p.doctorName ? ` • Dr. ${p.doctorName}` : ""}`}
        className="
          group relative flex flex-col gap-1 rounded-xl border-2 border-danger-300
          bg-danger-50 hover:bg-danger-100 hover:border-danger-400
          p-2.5 text-left cursor-pointer transition-all shadow-sm hover:shadow-md
          w-full min-h-[88px]
        "
      >
        {/* LOS badge */}
        <span className="absolute top-1.5 right-1.5 bg-danger-200 text-danger-700 text-2xs font-bold px-1.5 py-0.5 rounded-full leading-none">
          Day {p.los}
        </span>

        {/* Bed name */}
        <div className="flex items-center gap-1">
          <BedDouble className="w-3 h-3 text-danger-400 shrink-0" />
          <span className="text-2xs font-bold text-danger-600 uppercase tracking-wide">
            {bed.name}
          </span>
        </div>

        {/* Patient name */}
        <p className="text-xs font-semibold text-gray-800 leading-tight line-clamp-2 pr-6">
          {p.name}
        </p>

        {/* Doctor */}
        {p.doctorName && (
          <div className="flex items-center gap-0.5 mt-auto">
            <Stethoscope className="w-2.5 h-2.5 text-gray-400 shrink-0" />
            <span className="text-2xs text-gray-500 truncate">
              {p.doctorName}
            </span>
          </div>
        )}
      </button>
    );
  }

  // Available
  return (
    <div
      className="
        flex flex-col items-center justify-center gap-1.5 rounded-xl border-2
        border-dashed border-success-300 bg-success-50
        p-2.5 text-center min-h-[88px]
      "
    >
      <BedDouble className="w-5 h-5 text-success-400" />
      <span className="text-2xs font-semibold text-success-700 uppercase tracking-wide">
        {bed.name}
      </span>
      {bed.bedType && (
        <span className="text-2xs text-gray-400">{bed.bedType}</span>
      )}
    </div>
  );
}

// ── Group section ─────────────────────────────────────────────────────────────

function GroupSection({
  group,
  onBedClick,
}: {
  group: GroupInfo;
  onBedClick: (bed: BedEntry) => void;
}) {
  const pct =
    group.total > 0 ? Math.round((group.occupied / group.total) * 100) : 0;

  return (
    <div className="space-y-2">
      {/* Group header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-800">{group.name}</h2>
          <span className="text-2xs text-gray-400">
            {group.occupied}/{group.total} beds
          </span>
        </div>
        {/* Mini occupancy bar */}
        <div className="flex items-center gap-2">
          <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                pct >= 90
                  ? "bg-danger-500"
                  : pct >= 70
                    ? "bg-warning-500"
                    : "bg-success-500"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span
            className={`text-2xs font-bold ${
              pct >= 90
                ? "text-danger-600"
                : pct >= 70
                  ? "text-warning-600"
                  : "text-success-600"
            }`}
          >
            {pct}%
          </span>
        </div>
      </div>

      {/* Bed grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2">
        {group.beds.map((bed) => (
          <BedCard
            key={bed._id}
            bed={bed}
            onClick={bed.patient ? () => onBedClick(bed) : undefined}
          />
        ))}
      </div>
    </div>
  );
}

// ── Summary card ──────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  color,
  sub,
}: {
  label: string;
  value: string | number;
  color?: string;
  sub?: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex flex-col gap-1">
      <p className="text-2xs font-semibold text-gray-500 uppercase tracking-wide">
        {label}
      </p>
      <p
        className={`text-2xl font-bold leading-none ${color ?? "text-gray-800"}`}
      >
        {value}
      </p>
      {sub && <p className="text-2xs text-gray-400">{sub}</p>}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BedMapPage() {
  const router = useRouter();
  const [activeFloor, setActiveFloor] = useState<string>("all");

  const {
    data,
    isPending: loading,
    refetch,
  } = useApiQuery<BedMapData>(["bed-map"], "/api/dashboard/bed-map");
  const load = () => refetch();

  const visibleFloors =
    data?.floors.filter((f) =>
      activeFloor === "all" ? true : f.name === activeFloor,
    ) ?? [];

  const floorNames = data?.floors.map((f) => f.name) ?? [];
  const showFloorTabs = floorNames.length > 1;

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => router.back()}
            className="text-gray-500 hover:bg-gray-200"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <p className="text-xs text-gray-400">
            Live view — refreshes on demand
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={load}
          disabled={loading}
          className="gap-1.5 h-8 text-xs"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Summary cards */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryCard label="Total Beds" value={data.summary.total} />
          <SummaryCard
            label="Occupied"
            value={data.summary.occupied}
            color="text-danger-600"
            sub="currently admitted"
          />
          <SummaryCard
            label="Available"
            value={data.summary.available}
            color="text-success-600"
            sub="ready to assign"
          />
          <SummaryCard
            label="Occupancy Rate"
            value={`${data.summary.occupancyRate}%`}
            color={
              data.summary.occupancyRate >= 90
                ? "text-danger-600"
                : data.summary.occupancyRate >= 70
                  ? "text-warning-600"
                  : "text-success-600"
            }
          />
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded border-2 border-dashed border-success-400 bg-success-50" />
          Available
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded border-2 border-danger-400 bg-danger-50" />
          Occupied
        </div>
        <div className="flex items-center gap-1.5 ml-4">
          <User className="w-3 h-3" />
          Click occupied bed to open patient profile
        </div>
      </div>

      {/* Floor tabs */}
      {showFloorTabs && (
        <div className="flex gap-1 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveFloor("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              activeFloor === "all"
                ? "bg-primary-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            All Floors
          </button>
          {floorNames.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFloor(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                activeFloor === f
                  ? "bg-primary-600 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {f === "—" ? "No Floor" : f}
            </button>
          ))}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !data && (
        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-8 gap-2">
          {Array.from({ length: 24 }).map((_, i) => (
            <div
              key={i}
              className="h-[88px] rounded-xl bg-gray-200 animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && data && data.summary.total === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
          <BedDouble className="w-12 h-12 opacity-20" />
          <p className="text-sm font-medium">No beds configured</p>
          <p className="text-xs">Add beds in Settings to see the map.</p>
        </div>
      )}

      {/* Floor sections */}
      {!loading &&
        visibleFloors.map((floor) => (
          <div key={floor.name} className="space-y-4">
            {/* Floor header (only when showing all floors or there's more than one group) */}
            {(showFloorTabs ||
              visibleFloors.length > 1 ||
              floor.name !== "—") && (
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200" />
                <div className="flex items-center gap-2 px-3 py-1 bg-white border border-gray-200 rounded-full">
                  <span className="text-xs font-semibold text-gray-600">
                    {floor.name === "—" ? "No Floor" : floor.name}
                  </span>
                  <span className="text-2xs text-gray-400">
                    {floor.occupied}/{floor.total}
                  </span>
                </div>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
            )}

            {floor.groups.map((group) => (
              <div
                key={group.name}
                className="bg-white border border-gray-200 rounded-xl p-4 space-y-3"
              >
                <GroupSection
                  group={group}
                  onBedClick={(bed) => {
                    if (bed.patient?.ipdId) {
                      router.push(`/ipd/${bed.patient.ipdId}`);
                    }
                  }}
                />
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}
