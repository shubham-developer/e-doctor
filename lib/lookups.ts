"use client";

// Cached lookup/reference-data hooks (React Query). Use these instead of
// fetching lookup endpoints directly in components — concurrent requests are
// deduped and results are cached across pages/modal reopens (staleTime 5 min).

import { useQuery } from "@tanstack/react-query";
import { fetchData } from "@/lib/useApiQuery";
import type { Charge } from "@/lib/types/charges";
import type { Medicine } from "@/lib/types/pharmacy";

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

export interface RoleLookup {
  _id: string;
  name: string;
}

export function useRoles() {
  return useQuery({
    queryKey: ["roles"],
    queryFn: () => fetchData<RoleLookup[]>("/api/dashboard/settings/roles"),
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

// Module-level so the select result is memoized — an inline arrow would have a
// new identity each render, making React Query re-run it and return a new
// array identity every render (breaks consumers' effect deps).
const selectMedicines = (d: { medicines: Medicine[] }) => d.medicines ?? [];

export function useMedicines(limit = 200) {
  return useQuery({
    queryKey: ["medicines", limit],
    queryFn: () =>
      fetchData<{ medicines: Medicine[] }>(
        `/api/dashboard/pharmacy/medicines?limit=${limit}`,
      ),
    select: selectMedicines,
  });
}
