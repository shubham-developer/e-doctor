export interface Income {
  opd: number;
  ipd: number;
  pharmacy: number;
  pathology: number;
  radiology: number;
  bloodBank: number;
  ambulance: number;
  general: number;
}

export type TrendGranularity = "day" | "month";

export interface DashboardStats {
  income: Income;
  expenses: number;
  /** One point per day or per month depending on `granularity` — auto-picked by the selected date range's span. */
  trend: Array<{ period: string; income: number; expenses: number }>;
  granularity: TrendGranularity;
  totalPatients: number;
  totalStaff: number;
}
