"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useApp } from "@/lib/context";
import {
  LayoutDashboard,
  Users,
  Settings,
  Stethoscope,
  X,
  ClipboardPlus,
  Pill,
  ChevronDown,
  FileText,
  FlaskConical,
  Users2,
  BedDouble,
  Bell,
  IndianRupee,
  CreditCard,
  AlertTriangle,
  Tablets,
  Shield,
  ShoppingCart,
  BarChart2,
  Wallet,
  Printer,
} from "lucide-react";

interface NavChild {
  href: string;
  label: string;
  icon: React.ElementType;
  /** Module permission key — if omitted, always visible */
  moduleKey?: string;
}

interface NavItem {
  href: string;
  key: string;
  icon: React.ElementType;
  /** Module permission key — if omitted, always visible */
  moduleKey?: string;
  children?: NavChild[];
}

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    key: "dashboard",
    icon: LayoutDashboard,
    moduleKey: "dashboard",
  },
  {
    href: "/dashboard/patients",
    key: "patients",
    icon: Users,
    moduleKey: "patients",
  },
  { href: "/dashboard/opd", key: "opd", icon: ClipboardPlus, moduleKey: "opd" },
  { href: "/dashboard/ipd", key: "ipd", icon: BedDouble, moduleKey: "ipd" },
  {
    href: "/dashboard/hr",
    key: "hr",
    icon: Users2,
    moduleKey: "humanResource",
  },
  {
    href: "/dashboard/pharmacy",
    key: "pharmacy",
    icon: Pill,
    moduleKey: "pharmacy",
    children: [
      {
        href: "/dashboard/pharmacy",
        label: "Bills",
        icon: FileText,
        moduleKey: "pharmacy",
      },
      {
        href: "/dashboard/pharmacy/medicines",
        label: "Medicines",
        icon: FlaskConical,
        moduleKey: "pharmacy",
      },
      {
        href: "/dashboard/pharmacy/purchases",
        label: "Purchase Medicine",
        icon: ShoppingCart,
        moduleKey: "pharmacy",
      },
    ],
  },
  {
    href: "/dashboard/pathology",
    key: "pathology",
    icon: FlaskConical,
    moduleKey: "pathology",
    children: [
      {
        href: "/dashboard/pathology",
        label: "Bills",
        icon: FileText,
        moduleKey: "pathology",
      },
      {
        href: "/dashboard/pathology/tests",
        label: "Pathology Test",
        icon: FlaskConical,
        moduleKey: "pathology",
      },
    ],
  },
  {
    href: "/dashboard/radiology",
    key: "radiology",
    icon: Stethoscope,
    moduleKey: "radiology",
    children: [
      {
        href: "/dashboard/radiology",
        label: "Bills",
        icon: FileText,
        moduleKey: "radiology",
      },
      {
        href: "/dashboard/radiology/tests",
        label: "Radiology Test",
        icon: Stethoscope,
        moduleKey: "radiology",
      },
    ],
  },
  {
    href: "/dashboard/billing",
    key: "billing",
    icon: Wallet,
    moduleKey: "billing",
  },
  {
    href: "/dashboard/reports",
    key: "reports",
    icon: BarChart2,
    moduleKey: "reports",
  },
  {
    href: "/dashboard/settings",
    key: "settings",
    icon: Settings,
    moduleKey: "settings",
    children: [
      // Organization
      { href: "/dashboard/settings", label: "General", icon: Settings },
      // People & access
      { href: "/dashboard/settings/team", label: "Team", icon: Users },
      { href: "/dashboard/settings/roles", label: "Roles", icon: Shield },
      // Hospital setup
      {
        href: "/dashboard/settings/services",
        label: "Services",
        icon: IndianRupee,
      },
      {
        href: "/dashboard/settings/bed-setup",
        label: "Bed Setup",
        icon: BedDouble,
      },
      {
        href: "/dashboard/settings/pharmacy",
        label: "Pharmacy",
        icon: Tablets,
      },
      // Billing & output
      {
        href: "/dashboard/settings/billing",
        label: "Billing",
        icon: CreditCard,
      },
      {
        href: "/dashboard/settings/print-layouts",
        label: "Print Layouts",
        icon: Printer,
      },
      {
        href: "/dashboard/settings/notifications",
        label: "Notifications",
        icon: Bell,
      },
      // Destructive actions — always last
      {
        href: "/dashboard/settings/danger",
        label: "Danger Zone",
        icon: AlertTriangle,
      },
    ],
  },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { tenant, user, can } = useApp();
  const t = useTranslations("nav");

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/dashboard/pharmacy")
      return pathname === "/dashboard/pharmacy";
    if (href === "/dashboard/pathology")
      return pathname === "/dashboard/pathology";
    if (href === "/dashboard/radiology")
      return pathname === "/dashboard/radiology";
    if (href === "/dashboard/reports")
      return pathname.startsWith("/dashboard/reports");
    if (href === "/dashboard/settings")
      return pathname === "/dashboard/settings";
    return pathname.startsWith(href);
  };

  const isParentActive = (item: NavItem) => {
    if (item.children) return item.children.some((c) => isActive(c.href));
    return isActive(item.href);
  };

  // auto-expand the parent whose child matches the current path
  const defaultExpanded =
    navItems.find((i) => i.children?.some((c) => isActive(c.href)))?.key ??
    null;
  const [expanded, setExpanded] = useState<string | null>(defaultExpanded);

  useEffect(() => {
    const match = navItems.find((i) =>
      i.children?.some((c) => isActive(c.href)),
    );
    if (match) setExpanded(match.key);
  }, [pathname]);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-48 xl:w-56 2xl:w-64 bg-white border-r border-gray-100 z-50 flex flex-col transition-transform duration-300",
          "lg:translate-x-0 lg:static lg:z-auto lg:shrink-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-3 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 2xl:w-9 2xl:h-9 bg-primary-600 rounded-md flex items-center justify-center shrink-0 overflow-hidden">
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
            <div className="min-w-0">
              <p className="font-bold text-primary-700 text-xs 2xl:text-sm leading-tight truncate">
                {tenant?.name ?? "e-doctor"}
              </p>
              <p className="text-2xs 2xl:text-xs text-gray-400 truncate">
                {tenant?.slug ?? "..."}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded hover:bg-gray-100"
          >
            <X className="w-3.5 h-3.5 text-gray-500" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {navItems
            .filter((item) => !item.moduleKey || can(item.moduleKey))
            .map((item) => {
              const parentActive = isParentActive(item);
              const isOpen = expanded === item.key;

              if (item.children) {
                return (
                  <div key={item.key}>
                    <button
                      onClick={() => setExpanded(isOpen ? null : item.key)}
                      className={cn(
                        "w-full flex items-center gap-2 px-2 py-1.5 2xl:px-3 2xl:py-2 rounded-md text-xs 2xl:text-sm font-medium transition-all",
                        parentActive
                          ? "bg-primary-50 text-primary-700"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                      )}
                    >
                      <item.icon
                        className={cn(
                          "w-3.5 h-3.5 2xl:w-4 2xl:h-4 shrink-0",
                          parentActive ? "text-primary-600" : "",
                        )}
                      />
                      <span className="truncate">
                        {t(item.key as keyof typeof t)}
                      </span>
                      <ChevronDown
                        className={cn(
                          "w-3 h-3 ml-auto shrink-0 transition-transform duration-200 text-gray-400",
                          isOpen ? "rotate-180" : "",
                        )}
                      />
                    </button>

                    {isOpen && (
                      <div className="mt-0.5 ml-3 pl-2 border-l border-gray-100 space-y-0.5">
                        {item.children
                          .filter((c) => !c.moduleKey || can(c.moduleKey))
                          .map((child) => {
                            const childActive = isActive(child.href);
                            return (
                              <Link
                                key={child.href}
                                href={child.href}
                                onClick={onClose}
                                className={cn(
                                  "flex items-center gap-2 px-2 py-1.5 2xl:px-3 2xl:py-2 rounded-md text-xs 2xl:text-sm transition-all",
                                  childActive
                                    ? "bg-primary-50 text-primary-700 font-medium"
                                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-800",
                                )}
                              >
                                <child.icon
                                  className={cn(
                                    "w-3 h-3 2xl:w-3.5 2xl:h-3.5 shrink-0",
                                    childActive ? "text-primary-600" : "",
                                  )}
                                />
                                {child.label}
                              </Link>
                            );
                          })}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 2xl:px-3 2xl:py-2 rounded-md text-xs 2xl:text-sm font-medium transition-all",
                    parentActive
                      ? "bg-primary-50 text-primary-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                  )}
                >
                  <item.icon
                    className={cn(
                      "w-3.5 h-3.5 2xl:w-4 2xl:h-4 shrink-0",
                      parentActive ? "text-primary-600" : "",
                    )}
                  />
                  <span className="truncate">
                    {t(item.key as keyof typeof t)}
                  </span>
                </Link>
              );
            })}
        </nav>

        {/* Plan badge */}
        <div className="px-2 py-2 border-t border-gray-100">
          <div className="bg-primary-50 rounded-md px-2 py-1.5">
            <div className="flex items-center justify-between">
              <span className="text-2xs 2xl:text-xs font-semibold text-primary-700 uppercase tracking-wide">
                {tenant?.plan ?? "STARTER"}
              </span>
              <span className="text-2xs 2xl:text-xs text-gray-400">{user?.role}</span>
            </div>
            <p className="text-2xs 2xl:text-xs text-gray-400 truncate mt-0.5">
              {tenant?.whatsappNumber ?? ""}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
