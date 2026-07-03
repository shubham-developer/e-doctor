"use client";

import { useApp } from "@/lib/context";
import { ShieldOff } from "lucide-react";

/**
 * Renders children if `can(moduleKey, action)` — otherwise shows an
 * access-denied screen. Only blocks users who have a custom role assigned;
 * OWNER / base roles without a customRole always pass through.
 */
export function PageGuard({
  moduleKey,
  action = "view",
  children,
}: {
  moduleKey: string;
  action?: "view" | "add" | "edit" | "delete";
  children: React.ReactNode;
}) {
  const { can, loading } = useApp();

  if (loading) return null;

  if (!can(moduleKey, action)) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-4 text-gray-400 select-none">
        <ShieldOff className="w-14 h-14 opacity-25" />
        <div className="text-center">
          <p className="text-base font-semibold text-gray-500">Access Denied</p>
          <p className="text-sm mt-1">
            You don&apos;t have permission to view this page.
          </p>
          <p className="text-xs mt-1 text-gray-400">
            Ask your administrator to grant you access.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
