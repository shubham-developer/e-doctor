"use client";

// Cached lookup/reference-data hooks (React Query). Use these instead of
// fetching lookup endpoints directly in components — concurrent requests are
// deduped and results are cached across pages/modal reopens (staleTime 5 min).

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type { Charge } from "@/lib/types/charges";
import type { Medicine } from "@/lib/types/pharmacy";

async function fetchData<T>(url: string): Promise<T> {
  const res = await apiClient.get<T>(url);
  if (!res.success) throw new Error(res.error || "Failed to load data");
  return res.data;
}

export interface DoctorLookup {
  _id: string;
  name: string;
  specialization: string;
}

export function useDoctors() {
  return useQuery({
    queryKey: ["doctors"],
    queryFn: () => fetchData<DoctorLookup[]>("/api/dashboard/doctors"),
  });
}

/** Charges, optionally scoped to a module (e.g. "opd", "ipd", "pathology"). */
export function useCharges(module?: string) {
  return useQuery({
    queryKey: ["charges", module ?? "all"],
    queryFn: () =>
      fetchData<Charge[]>(
        `/api/dashboard/charges${module ? `?module=${module}` : ""}`,
      ),
  });
}

export type PharmacyMasterType =
  | "category"
  | "dose_interval"
  | "dose_duration"
  | "unit"
  | "company"
  | "group"
  | "supplier";

export function usePharmacyMasters(type: PharmacyMasterType) {
  return useQuery({
    queryKey: ["pharmacy-masters", type],
    queryFn: () =>
      fetchData<{ _id: string; name: string }[]>(
        `/api/dashboard/pharmacy/masters?type=${type}`,
      ),
  });
}

export interface MedicineDosageLookup {
  _id: string;
  category: string;
  dosage: string;
  unit: string;
}

export function useMedicineDosages() {
  return useQuery({
    queryKey: ["medicine-dosages"],
    queryFn: () =>
      fetchData<MedicineDosageLookup[]>("/api/dashboard/pharmacy/dosages"),
  });
}

export function useMedicines(limit = 200) {
  return useQuery({
    queryKey: ["medicines", limit],
    queryFn: () =>
      fetchData<{ medicines: Medicine[] }>(
        `/api/dashboard/pharmacy/medicines?limit=${limit}`,
      ),
    select: (d) => d.medicines ?? [],
  });
}
