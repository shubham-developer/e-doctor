"use client";

import { usePathname } from "next/navigation";
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
    <div className="space-y-4">
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
