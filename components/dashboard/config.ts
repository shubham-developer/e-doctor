import type { LucideIcon } from "lucide-react";
import {
  Stethoscope,
  Building2,
  Pill,
  FlaskConical,
  Activity,
  Droplets,
  Truck,
  Wallet,
} from "lucide-react";
import type { Income } from "./types";

/** Shared between IncomeCards and IncomeDonutChart — keep the two in sync. */
export const INCOME_CARDS: Array<{
  key: keyof Income;
  label: string;
  icon: LucideIcon;
}> = [
  { key: "opd", label: "OPD Income", icon: Stethoscope },
  { key: "ipd", label: "IPD Income", icon: Building2 },
  { key: "pharmacy", label: "Pharmacy Income", icon: Pill },
  { key: "pathology", label: "Pathology Income", icon: FlaskConical },
  { key: "radiology", label: "Radiology Income", icon: Activity },
  { key: "bloodBank", label: "Blood Bank Income", icon: Droplets },
  { key: "ambulance", label: "Ambulance Income", icon: Truck },
  { key: "general", label: "General Income", icon: Wallet },
];

export const DONUT_COLORS = [
  "#78350f",
  "#f97316",
  "#eab308",
  "#14b8a6",
  "#8b5cf6",
  "#3b82f6",
  "#94a3b8",
  "#22c55e",
];
