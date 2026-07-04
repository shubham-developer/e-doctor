"use client";

// Generic React Query wrapper over apiClient for GET endpoints.
//
// - `key` must uniquely identify the request (include page/search/filter
//   params — anything that changes the URL belongs in the key).
// - Failures throw, so the global QueryCache handler in lib/queryProvider.tsx
//   toasts them; call sites don't need their own error handling.
// - For paginated/searchable lists pass `keepPrevious: true` so the previous
//   page stays visible while the next one loads, and leave `staleTime` at 0
//   (the default here) so remounts always refetch — cached data still paints
//   instantly while the refresh happens in the background.

import {
  keepPreviousData,
  useQuery,
  type QueryKey,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";

export async function fetchData<T>(url: string): Promise<T> {
  const res = await apiClient.get<T>(url);
  if (!res.success) throw new Error(res.error || "Failed to load data");
  return res.data;
}

export function useApiQuery<T>(
  key: QueryKey,
  url: string,
  opts?: {
    /** Keep showing the previous page's data while a new page/search loads. */
    keepPrevious?: boolean;
    /** Skip the request until true (e.g. waiting on a parent record's id). */
    enabled?: boolean;
    /** Cache lifetime in ms; defaults to 0 (always refetch on mount). */
    staleTime?: number;
    /** Poll interval in ms (e.g. live queue displays). */
    refetchInterval?: number;
  },
) {
  return useQuery({
    queryKey: key,
    queryFn: () => fetchData<T>(url),
    staleTime: opts?.staleTime ?? 0,
    enabled: opts?.enabled,
    refetchInterval: opts?.refetchInterval,
    placeholderData: opts?.keepPrevious ? keepPreviousData : undefined,
  });
}
