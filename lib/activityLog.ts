import type { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import ActivityLog from "@/models/ActivityLog";

export type ActivityAction =
  | "login"
  | "logout"
  | "create"
  | "update"
  | "delete";

export interface ActivityEntry {
  action: ActivityAction;
  /** Module key the action belongs to, e.g. "patients", "opd", "pharmacy". */
  module: string;
  /** Human-readable summary shown in the User Logs table. */
  description: string;
  /** In-app path to the record acted on (e.g. "/patients/abc123"), when there is one. */
  link?: string;
}

/**
 * Fire-and-forget write for routes outside the proxy matcher (login/logout),
 * where the x-user-* headers aren't injected and identity must be passed in.
 */
export function logActivityRaw(
  fields: ActivityEntry & {
    tenantId: string;
    branchId?: string;
    userId?: string;
    userName: string;
    userRole: string;
  },
): void {
  void connectDB()
    .then(() => ActivityLog.create(fields))
    .catch((err) => console.error("Failed to write activity log:", err));
}

/**
 * Fire-and-forget activity log for /api/dashboard/* routes. Reads the
 * proxy-injected x-user-* headers, so callers only describe the action.
 * Never awaited and never throws — a logging failure must not fail the
 * request it describes.
 */
export function logActivity(req: NextRequest, entry: ActivityEntry): void {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return;
  logActivityRaw({
    tenantId,
    branchId: req.headers.get("x-branch-id") || undefined,
    userId: req.headers.get("x-user-id") || undefined,
    userName: req.headers.get("x-user-name") ?? "",
    userRole: req.headers.get("x-user-role") ?? "",
    ...entry,
  });
}
