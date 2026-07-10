"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useApp } from "@/lib/context";
import { useAppStore } from "@/lib/store/appStore";
import { useApiQuery } from "@/lib/useApiQuery";
import { matchNavEntry } from "@/lib/nav";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Menu,
  LogOut,
  User,
  UserCircle,
  Plus,
  Bell,
  Users,
  ClipboardPlus,
  Package,
  ChevronRight,
} from "lucide-react";
import { GlobalPatientSearch } from "./GlobalPatientSearch";

interface TopbarProps {
  onMenuClick: () => void;
}

interface DashboardAlerts {
  lowStock: number;
  outOfStock: number;
  opdWaiting: number;
}

/** Fallback for routes not in the sidebar's nav list (e.g. "/nurse-notes" -> "Nurse Notes"). */
function humanizeSegment(segment: string) {
  return segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, can } = useApp();
  const t = useTranslations("topbar");
  const navT = useTranslations("nav");

  const navMatch = matchNavEntry(pathname);
  const currentLabel =
    navMatch?.label ??
    (navMatch?.navKey
      ? navT(navMatch.navKey as Parameters<typeof navT>[0])
      : humanizeSegment(pathname.split("/").filter(Boolean).pop() ?? "dashboard"));
  const parentCrumb = navMatch?.parent
    ? {
        href: navMatch.parent.href,
        label: navT(navMatch.parent.navKey as Parameters<typeof navT>[0]),
      }
    : null;

  const canPatients = can("patients");
  const canOpd = can("opd");
  const canInventory = can("inventory");

  const { data: alerts } = useApiQuery<DashboardAlerts>(
    ["dashboard-alerts"],
    "/api/dashboard/alerts",
    { enabled: !!user, refetchInterval: 60_000 },
  );

  const stockAlerts = canInventory
    ? (alerts?.lowStock ?? 0) + (alerts?.outOfStock ?? 0)
    : 0;
  const opdWaiting = canOpd ? (alerts?.opdWaiting ?? 0) : 0;
  const alertCount = stockAlerts + opdWaiting;

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

  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-4 lg:px-6 shrink-0">
      {/* Left — breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Menu className="w-5 h-5 text-gray-600" />
        </button>
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 min-w-0 text-sm"
        >
          {parentCrumb && (
            <>
              <Link
                href={parentCrumb.href}
                className="text-gray-400 hover:text-gray-600 transition-colors truncate"
              >
                {parentCrumb.label}
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
            </>
          )}
          <span
            className="font-semibold text-gray-800 truncate"
            aria-current="page"
          >
            {currentLabel}
          </span>
        </nav>
      </div>

      {/* Centre — global patient search */}
      <div className="flex-1 flex justify-center px-4 max-w-sm mx-auto">
        <GlobalPatientSearch />
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {(canPatients || canOpd) && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button className="flex items-center gap-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium h-8 px-2.5 transition-colors" />
              }
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {canPatients && (
                <DropdownMenuItem
                  onClick={() => router.push("/patients?new=1")}
                >
                  <Users className="w-4 h-4 mr-2" />
                  New Patient
                </DropdownMenuItem>
              )}
              {canOpd && (
                <DropdownMenuItem
                  onClick={() => router.push("/opd?new=1")}
                >
                  <ClipboardPlus className="w-4 h-4 mr-2" />
                  New OPD Visit
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button className="relative p-2 rounded-full hover:bg-gray-50 transition-colors" />
            }
          >
            <Bell className="w-5 h-5 text-gray-600" />
            {alertCount > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-4 h-4 px-1 flex items-center justify-center rounded-full bg-danger-600 text-white text-2xs font-semibold">
                {alertCount > 9 ? "9+" : alertCount}
              </span>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {alertCount === 0 && (
              <div className="px-2 py-3 text-xs text-gray-500 text-center">
                No alerts right now
              </div>
            )}
            {stockAlerts > 0 && (
              <DropdownMenuItem
                onClick={() => router.push("/inventory/items")}
              >
                <Package className="w-4 h-4 mr-2 text-warning-600 shrink-0" />
                <span>
                  {alerts?.outOfStock ? `${alerts.outOfStock} out of stock` : ""}
                  {alerts?.outOfStock && alerts?.lowStock ? ", " : ""}
                  {alerts?.lowStock ? `${alerts.lowStock} low stock` : ""}
                </span>
              </DropdownMenuItem>
            )}
            {opdWaiting > 0 && (
              <DropdownMenuItem onClick={() => router.push("/opd")}>
                <ClipboardPlus className="w-4 h-4 mr-2 text-primary-600 shrink-0" />
                <span>{opdWaiting} patient(s) waiting in OPD</span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button className="flex items-center gap-2 rounded-full hover:bg-gray-50 p-1 transition-colors" />
            }
          >
            <Avatar className="w-8 h-8">
              {user?.avatarUrl && (
                <AvatarImage src={user.avatarUrl} alt={user.name} />
              )}
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
              onClick={() => router.push("/profile")}
            >
              <UserCircle className="w-4 h-4 mr-2" />
              My Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push("/settings")}
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
