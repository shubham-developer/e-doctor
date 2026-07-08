"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useApp } from "@/lib/context";
import { useAppStore } from "@/lib/store/appStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Menu, LogOut, User, Globe, Clock, Stethoscope } from "lucide-react";
import { GlobalPatientSearch } from "./GlobalPatientSearch";

const planColors = {
  STARTER: "bg-gray-100 text-gray-700",
  GROWTH: "bg-primary-100 text-primary-700",
  PRO: "bg-warning-100 text-warning-700",
};

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const router = useRouter();
  const { user, tenant, lang, setLang } = useApp();
  const t = useTranslations("topbar");

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    useAppStore.getState().reset();
    useAppStore.persist.clearStorage();
    toast.success("Logged out successfully");
    router.push("/login");
  }

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "CB";

  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const dateStr =
    now?.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    }) ?? "";
  const timeStr =
    now?.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }) ?? "";

  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-4 lg:px-6 shrink-0">
      {/* Left — clinic name + live clock */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Menu className="w-5 h-5 text-gray-600" />
        </button>

        <div className="hidden sm:flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-600 rounded-md flex items-center justify-center shrink-0 overflow-hidden">
            {tenant?.smallLogoUrl ? (
              <img
                src={tenant.smallLogoUrl}
                alt={tenant.name}
                className="w-full h-full object-contain"
              />
            ) : tenant?.logoUrl ? (
              <img
                src={tenant.logoUrl}
                alt={tenant.name}
                className="w-full h-full object-contain"
              />
            ) : (
              <Stethoscope className="w-4 h-4 text-white" />
            )}
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold text-gray-800 truncate max-w-56">
              {tenant?.name ?? "Clinic"}
            </span>
            <div className="flex items-center gap-1.5 text-2xs text-gray-400">
              <Clock className="w-3 h-3" />
              <span>
                {dateStr} &nbsp;·&nbsp; {timeStr}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Centre — global patient search */}
      <div className="flex-1 flex justify-center px-4 max-w-sm mx-auto">
        <GlobalPatientSearch />
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLang(lang === "en" ? "hi" : "en")}
          className="text-gray-600 gap-1.5 hidden sm:flex"
        >
          <Globe className="w-4 h-4" />
          {t("switchLang")}
        </Button>

        {tenant && (
          <Badge
            className={`${planColors[tenant.plan]} border-0 font-semibold hidden sm:flex`}
          >
            {tenant.plan}
          </Badge>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button className="flex items-center gap-2 rounded-full hover:bg-gray-50 p-1 transition-colors" />
            }
          >
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-primary-100 text-primary-700 text-sm font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-gray-700 hidden md:block max-w-32 truncate">
              {user?.name}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>
              <p className="font-medium">{user?.name}</p>
              <p className="text-xs text-gray-500 font-normal truncate">
                {user?.email}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="sm:hidden"
              onClick={() => setLang(lang === "en" ? "hi" : "en")}
            >
              <Globe className="w-4 h-4 mr-2" />
              {t("switchLang")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push("/dashboard/settings")}
            >
              <User className="w-4 h-4 mr-2" />
              {t("settings")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-danger-600">
              <LogOut className="w-4 h-4 mr-2" />
              {t("logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
