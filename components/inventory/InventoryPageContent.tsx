"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  LayoutGrid,
  Package,
  PackagePlus,
  PackageMinus,
  Truck,
  Tags,
} from "lucide-react";
import { useApiQuery } from "@/lib/useApiQuery";
import { OverviewTab } from "./OverviewTab";
import { ItemsTab } from "./ItemsTab";
import { PurchasesTab } from "./PurchasesTab";
import { IssuesTab } from "./IssuesTab";
import { VendorsTab } from "./VendorsTab";
import { CategoriesTab } from "./CategoriesTab";
import type {
  InventoryStats,
  InventoryCategory,
  InventoryVendor,
  InventoryItem,
} from "./types";

type Tab =
  | "overview"
  | "items"
  | "purchases"
  | "issues"
  | "vendors"
  | "categories";

const TABS: {
  key: Tab;
  label: string;
  href: string;
  icon: React.ElementType;
}[] = [
  {
    key: "overview",
    label: "Overview",
    href: "/dashboard/inventory",
    icon: LayoutGrid,
  },
  {
    key: "items",
    label: "Items",
    href: "/dashboard/inventory/items",
    icon: Package,
  },
  {
    key: "purchases",
    label: "Purchases",
    href: "/dashboard/inventory/purchases",
    icon: PackagePlus,
  },
  {
    key: "issues",
    label: "Issues",
    href: "/dashboard/inventory/issues",
    icon: PackageMinus,
  },
  {
    key: "vendors",
    label: "Vendors",
    href: "/dashboard/inventory/vendors",
    icon: Truck,
  },
  {
    key: "categories",
    label: "Categories",
    href: "/dashboard/inventory/categories",
    icon: Tags,
  },
];

function tabFromPath(pathname: string): Tab {
  if (pathname.endsWith("/items")) return "items";
  if (pathname.endsWith("/purchases")) return "purchases";
  if (pathname.endsWith("/issues")) return "issues";
  if (pathname.endsWith("/vendors")) return "vendors";
  if (pathname.endsWith("/categories")) return "categories";
  return "overview";
}

export function InventoryPageContent() {
  const pathname = usePathname();
  const router = useRouter();

  const tab = tabFromPath(pathname);

  const { data: stats, isPending: statsLoading } = useApiQuery<InventoryStats>(
    ["inventory-stats"],
    "/api/dashboard/inventory/stats",
  );

  const { data: categoriesData, refetch: loadCategories } = useApiQuery<{
    categories: InventoryCategory[];
  }>(["inventory-categories"], "/api/dashboard/inventory/categories");
  const categories = categoriesData?.categories ?? [];

  const { data: vendorsData, refetch: loadVendors } = useApiQuery<{
    vendors: InventoryVendor[];
  }>(["inventory-vendors"], "/api/dashboard/inventory/vendors");
  const vendors = vendorsData?.vendors ?? [];

  const { data: allItemsData } = useApiQuery<{ items: InventoryItem[] }>(
    ["inventory-items-all"],
    "/api/dashboard/inventory/items?limit=200",
  );
  const allItems = allItemsData?.items ?? [];

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="px-4 lg:px-6 py-4 border-b border-gray-100 bg-white shrink-0">
        <h1 className="text-lg font-semibold text-gray-800">
          Inventory Management
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">
          Track stock levels, manage purchases, and issue items to departments
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 px-4 lg:px-6 shrink-0">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => router.push(t.href)}
                className={`flex items-center gap-1.5 px-3 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                  active
                    ? "border-primary-600 text-primary-700"
                    : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-200"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-4 lg:px-6 py-6">
        {tab === "overview" &&
          (statsLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-white border border-gray-200 rounded-xl p-4"
                  >
                    <div className="h-8 w-8 bg-gray-100 rounded-lg animate-pulse mb-2" />
                    <div className="h-7 bg-gray-100 rounded animate-pulse mb-1" />
                    <div className="h-3 bg-gray-100 rounded animate-pulse w-2/3" />
                  </div>
                ))}
              </div>
            </div>
          ) : stats ? (
            <OverviewTab stats={stats} />
          ) : null)}

        {tab === "items" && <ItemsTab categories={categories} />}

        {tab === "purchases" && (
          <PurchasesTab vendors={vendors} items={allItems} />
        )}

        {tab === "issues" && <IssuesTab items={allItems} />}

        {tab === "vendors" && (
          <VendorsTab vendors={vendors} onRefresh={loadVendors} />
        )}

        {tab === "categories" && (
          <CategoriesTab categories={categories} onRefresh={loadCategories} />
        )}
      </div>
    </div>
  );
}
