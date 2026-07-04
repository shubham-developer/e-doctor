"use client";

import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useApp } from "@/lib/context";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Trash2 } from "lucide-react";

export default function DangerPage() {
  const { user } = useApp();
  const t = useTranslations("settings");

  if (user?.role !== "OWNER") {
    return (
      <div>
        <p className="text-sm text-gray-500">
          Only clinic owners can access this section.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm border-danger-100">
        <CardHeader>
          <CardTitle className="text-base text-danger-600 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            {t("dangerTitle")}
          </CardTitle>
          <CardDescription className="text-danger-500">
            {t("dangerDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border border-danger-200 rounded-xl space-y-3">
            <div>
              <p className="font-medium text-gray-900">{t("deleteTitle")}</p>
              <p className="text-sm text-gray-500">{t("deleteDesc")}</p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <button className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-danger-600 hover:bg-danger-700 text-white text-sm font-medium transition-colors" />
                }
              >
                <Trash2 className="w-4 h-4" />
                {t("deleteBtn")}
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("deleteConfirmTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("deleteConfirmDesc")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-danger-600 hover:bg-danger-700"
                    onClick={() =>
                      toast.error("Contact support to delete your account")
                    }
                  >
                    Yes, delete everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
