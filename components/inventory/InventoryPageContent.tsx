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
import { TabBar } from "@/components/common/TabBar";
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
    <div className="p-4 space-y-4 min-h-screen bg-gray-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-primary-600" />
          <h1 className="text-lg font-semibold text-gray-800">Inventory</h1>
        </div>
      </div>

      <TabBar
        tabs={TABS}
        active={tab}
        onChange={(key) => {
          const target = TABS.find((t) => t.key === key);
          if (target) router.push(target.href);
        }}
      />

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
  );
}
