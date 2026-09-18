"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useApp } from "@/lib/context";
import { navItems, type NavItem } from "@/lib/nav";
import { X, ChevronDown } from "lucide-react";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { can } = useApp();
  const t = useTranslations("nav");

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href === "/pharmacy")
      return pathname === "/pharmacy";
    if (href === "/pathology")
      return pathname === "/pathology";
    if (href === "/radiology")
      return pathname === "/radiology";
    if (href === "/inventory")
      return pathname === "/inventory";
    if (href === "/hr") return pathname === "/hr";
    if (href === "/reports")
      return pathname.startsWith("/reports");
    if (href === "/settings")
      return pathname === "/settings";
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
          "fixed top-0 left-0 h-full w-48 xl:w-56 2xl:w-64 bg-slate-900 border-r border-slate-800 z-50 flex flex-col transition-transform duration-300",
          "lg:translate-x-0 lg:static lg:z-auto lg:shrink-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-3 py-3 border-b border-slate-800">
          <div className="flex items-center gap-2 min-w-0">
            <img
              src="/brand/icon.svg"
              alt="DoctorCloud"
              className="w-7 h-7 2xl:w-9 2xl:h-9 rounded-md shrink-0"
            />
            <p className="font-bold text-white text-xs 2xl:text-sm leading-tight truncate">
              DoctorCloud
            </p>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded hover:bg-slate-800"
          >
            <X className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-1">
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
                        "w-full flex items-center gap-3 px-3 py-2 2xl:px-3.5 2xl:py-2.5 rounded-md text-xs 2xl:text-sm font-medium transition-all",
                        parentActive
                          ? "bg-primary-600 text-white"
                          : "text-slate-300 hover:bg-slate-800 hover:text-white",
                      )}
                    >
                      <item.icon
                        className={cn(
                          "w-4 h-4 2xl:w-5 2xl:h-5 shrink-0",
                          parentActive ? "text-white" : "",
                        )}
                      />
                      <span className="truncate">
                        {t(item.key as keyof typeof t)}
                      </span>
                      <ChevronDown
                        className={cn(
                          "w-3 h-3 ml-auto shrink-0 transition-transform duration-200 text-slate-500",
                          isOpen ? "rotate-180" : "",
                        )}
                      />
                    </button>

                    {isOpen && (
                      <div className="mt-1 ml-4 pl-2.5 border-l border-slate-700 space-y-1">
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
                                  "flex items-center gap-2.5 px-3 py-1.5 2xl:px-3.5 2xl:py-2 rounded-md text-2xs 2xl:text-xs transition-all",
                                  childActive
                                    ? "bg-primary-600 text-white font-medium"
                                    : "text-slate-400 hover:bg-slate-800 hover:text-white",
                                )}
                              >
                                <child.icon
                                  className={cn(
                                    "w-3.5 h-3.5 2xl:w-4 2xl:h-4 shrink-0",
                                    childActive ? "text-white" : "",
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
                    "flex items-center gap-3 px-3 py-2 2xl:px-3.5 2xl:py-2.5 rounded-md text-xs 2xl:text-sm font-medium transition-all",
                    parentActive
                      ? "bg-primary-600 text-white"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white",
                  )}
                >
                  <item.icon
                    className={cn(
                      "w-4 h-4 2xl:w-5 2xl:h-5 shrink-0",
                      parentActive ? "text-white" : "",
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
