"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "@/lib/context";

/** Module key required for each /dashboard/<segment> route. */
const SEGMENT_MODULE: Record<string, string> = {
  patients: "patients",
  opd: "opd",
  ipd: "ipd",
  "nurse-notes": "ipd",
  hr: "humanResource",
  pharmacy: "pharmacy",
  pathology: "pathology",
  radiology: "radiology",
  inventory: "inventory",
  billing: "billing",
  reports: "reports",
  settings: "settings",
};

/**
 * Redirects to /dashboard when the current route belongs to a module the
 * tenant doesn't have enabled (or the user's role can't view). The sidebar
 * already hides these links; this covers direct URL navigation.
 */
export function ModuleGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { loading, can } = useApp();

  const segment = pathname.split("/")[2] ?? "";
  const moduleKey = SEGMENT_MODULE[segment];
  const blocked = !loading && !!moduleKey && !can(moduleKey);

  useEffect(() => {
    if (blocked) router.replace("/dashboard");
  }, [blocked, router]);

  if (blocked) return null;
  return <>{children}</>;
}
