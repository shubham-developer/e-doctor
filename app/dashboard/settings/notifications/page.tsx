"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useApiQuery } from "@/lib/useApiQuery";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { PageLoader } from "@/components/ui/page-loader";

export default function NotificationsPage() {
  const t = useTranslations("settings");
  const [reminder24h, setReminder24h] = useState(true);
  const [reminder1h, setReminder1h] = useState(true);
  const queryClient = useQueryClient();

  const { data: settingsData, isPending: loading } = useApiQuery<{
    tenant?: { notifications?: { reminder24h?: boolean; reminder1h?: boolean } };
  }>(["tenant-settings"], "/api/dashboard/settings");

  // Seed the switches once settings arrive
  useEffect(() => {
    const n = settingsData?.tenant?.notifications;
    if (n) {
      setReminder24h(n.reminder24h ?? true);
      setReminder1h(n.reminder1h ?? true);
    }
  }, [settingsData]);

  async function save() {
    const res = await fetch("/api/dashboard/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notifications: { reminder24h, reminder1h } }),
    });
    const data = await res.json();
    if (data.success) {
      queryClient.invalidateQueries({ queryKey: ["tenant-settings"] });
      toast.success("Notification settings saved");
    } else toast.error(data.error);
  }

  if (loading) return <PageLoader rows={3} />;

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">{t("notificationsTitle")}</CardTitle>
          <CardDescription>{t("notificationsDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100">
            <div>
              <p className="font-medium">{t("reminder24h")}</p>
              <p className="text-sm text-gray-500">{t("reminder24hDesc")}</p>
            </div>
            <Switch checked={reminder24h} onCheckedChange={setReminder24h} />
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100">
            <div>
              <p className="font-medium">{t("reminder1h")}</p>
              <p className="text-sm text-gray-500">{t("reminder1hDesc")}</p>
            </div>
            <Switch checked={reminder1h} onCheckedChange={setReminder1h} />
          </div>
          <Button
            className="bg-primary-600 hover:bg-primary-700 w-full sm:w-auto"
            onClick={save}
          >
            {t("saveSettings")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
