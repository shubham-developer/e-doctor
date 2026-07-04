"use client";

import { useTranslations } from "next-intl";
import { useApiQuery } from "@/lib/useApiQuery";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PageLoader } from "@/components/ui/page-loader";
import { CheckCircle2 } from "lucide-react";
import { formatDate } from "@/lib/format";

interface TenantData {
  plan: "STARTER" | "GROWTH" | "PRO";
  planExpiresAt: string;
}

const PLAN_FEATURES: Record<string, string[]> = {
  STARTER: ["Up to 2 doctors", "Basic appointments", "Slot management"],
  GROWTH: [
    "Up to 10 doctors",
    "Analytics dashboard",
    "Broadcast messages",
    "Priority support",
  ],
  PRO: [
    "Unlimited doctors",
    "All Growth features",
    "Custom branding",
    "API access",
    "Dedicated support",
  ],
};

export default function BillingPage() {
  const t = useTranslations("settings");
  const { data: settingsData, isPending: loading } = useApiQuery<{
    tenant: TenantData;
  }>(["tenant-settings"], "/api/dashboard/settings");
  const tenantData = settingsData?.tenant ?? null;

  if (loading) return <PageLoader rows={4} />;

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">{t("currentPlanTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-primary-50 rounded-xl">
            <div>
              <p className="text-xl font-bold text-primary-700">
                {tenantData?.plan} Plan
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {t("expires")}{" "}
                {tenantData?.planExpiresAt
                  ? formatDate(tenantData.planExpiresAt)
                  : "—"}
              </p>
            </div>
            <Badge className="bg-primary-600 text-white text-sm px-3 py-1">
              {t("active")}
            </Badge>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">
              {t("planIncluded")}
            </p>
            <ul className="space-y-1.5">
              {PLAN_FEATURES[tenantData?.plan ?? "STARTER"].map((f) => (
                <li
                  key={f}
                  className="flex items-center gap-2 text-sm text-gray-600"
                >
                  <CheckCircle2 className="w-4 h-4 text-success-500 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <Separator />

          {tenantData?.plan !== "PRO" && (
            <div className="space-y-3">
              <p className="text-sm font-medium">{t("upgrade")}:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {tenantData?.plan === "STARTER" && (
                  <Button className="bg-primary-600 hover:bg-primary-700">
                    Upgrade to GROWTH · ₹999/mo
                  </Button>
                )}
                <Button className="bg-warning-500 hover:bg-warning-600">
                  Upgrade to PRO · ₹2499/mo
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
