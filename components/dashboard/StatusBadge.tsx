"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Status = "PENDING" | "CONFIRMED" | "ARRIVED" | "CANCELLED" | "COMPLETED";

const styles: Record<Status, string> = {
  PENDING: "bg-yellow-100 text-yellow-700 border-yellow-200",
  CONFIRMED: "bg-success-100  text-success-700  border-success-200",
  ARRIVED: "bg-warning-100 text-warning-700 border-warning-200",
  CANCELLED: "bg-danger-100 text-danger-700 border-danger-200",
  COMPLETED: "bg-primary-100 text-primary-700 border-primary-200",
};

export function StatusBadge({ status }: { status: Status }) {
  const t = useTranslations("status");
  return (
    <Badge className={cn("font-semibold border", styles[status])}>
      {t(status)}
    </Badge>
  );
}
