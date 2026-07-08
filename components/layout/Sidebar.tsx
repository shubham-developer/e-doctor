"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useApp } from "@/lib/context";
import { navItems, type NavItem } from "@/lib/nav";
import { Stethoscope, X, ChevronDown } from "lucide-react";

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
    if (href === "/dashboard/inventory")
      return pathname === "/dashboard/inventory";
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
      </aside>
    </>
  );
}
