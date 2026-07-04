"use client";

import { useCurrency } from "@/lib/context";
import {
  Package,
  AlertTriangle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Tags,
  Truck,
  IndianRupee,
} from "lucide-react";
import type { InventoryStats } from "./types";

interface Props {
  stats: InventoryStats;
}

export function OverviewTab({ stats }: Props) {
  const { fmt: format } = useCurrency();

  const stockPercent = (item: { currentStock: number; maxStock: number }) => {
    if (!item.maxStock) return 0;
    return Math.min(100, Math.round((item.currentStock / item.maxStock) * 100));
  };

  const categoryName = (item: {
    categoryId: { _id: string; name: string } | string;
  }) => (typeof item.categoryId === "object" ? item.categoryId.name : "—");

  return (
    <div className="space-y-6">
      {/* Stat cards — row 1 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        <StatCard
          icon={Package}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
          label="Total Items"
          value={stats.totalItems}
        />
        <StatCard
          icon={AlertTriangle}
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
          label="Low Stock"
          value={stats.lowStockItems}
          alert={stats.lowStockItems > 0}
        />
        <StatCard
          icon={XCircle}
          iconBg="bg-red-100"
          iconColor="text-red-600"
          label="Out of Stock"
          value={stats.outOfStockItems}
          alert={stats.outOfStockItems > 0}
        />
        <StatCard
          icon={Tags}
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
          label="Categories"
          value={stats.totalCategories}
        />
        <StatCard
          icon={Truck}
          iconBg="bg-teal-100"
          iconColor="text-teal-600"
          label="Vendors"
          value={stats.totalVendors}
        />
      </div>

      {/* Stat cards — row 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <IndianRupee className="w-4 h-4 text-blue-600" />
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Stock Value
            </p>
          </div>
          <p className="text-xl font-bold text-gray-900">
            {format(stats.totalStockValue)}
          </p>
          <p className="text-2xs text-gray-400 mt-0.5">
            Current inventory value
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              This Month — Purchases
            </p>
          </div>
          <p className="text-xl font-bold text-gray-900">
            {format(stats.monthPurchaseTotal)}
          </p>
          <p className="text-2xs text-gray-400 mt-0.5">
            {stats.monthPurchaseCount} purchase orders
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-orange-600" />
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              This Month — Issues
            </p>
          </div>
          <p className="text-xl font-bold text-gray-900">
            {format(stats.monthIssueTotal)}
          </p>
          <p className="text-2xs text-gray-400 mt-0.5">
            {stats.monthIssueCount} issue slips
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low stock alert table */}
        <div className="bg-white border border-gray-200 rounded-xl">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-gray-800">
              Low Stock Alerts
            </h2>
          </div>
          {stats.lowStockList.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              All items are well-stocked
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {stats.lowStockList.map((item) => {
                const pct = stockPercent(item);
                const isOut = item.currentStock === 0;
                return (
                  <div
                    key={item._id}
                    className="px-4 py-3 flex items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {categoryName(item)} · {item.unit}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p
                        className={`text-sm font-bold ${
                          isOut ? "text-red-600" : "text-amber-600"
                        }`}
                      >
                        {item.currentStock} / {item.reorderLevel}
                      </p>
                      <p className="text-2xs text-gray-400">stock / reorder</p>
                    </div>
                    <div className="w-16 shrink-0">
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            isOut
                              ? "bg-red-500"
                              : pct < 30
                                ? "bg-amber-500"
                                : "bg-green-500"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Category breakdown */}
        <div className="bg-white border border-gray-200 rounded-xl">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-800">
              Stock by Category
            </h2>
          </div>
          {stats.categoryBreakdown.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              No data
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {stats.categoryBreakdown.map((cat) => {
                const maxValue = stats.categoryBreakdown[0]?.value ?? 1;
                const pct =
                  maxValue > 0 ? Math.round((cat.value / maxValue) * 100) : 0;
                return (
                  <div key={cat._id ?? "uncategorized"} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-gray-800">
                        {cat.name ?? "Uncategorized"}
                      </p>
                      <div className="text-right">
                        <span className="text-sm font-bold text-gray-900">
                          {format(cat.value)}
                        </span>
                        <span className="text-xs text-gray-400 ml-1.5">
                          {cat.count} items
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActivityList
          title="Recent Purchases"
          icon={TrendingUp}
          iconColor="text-green-600"
          items={stats.recentPurchases.map((p) => ({
            id: p._id,
            label: p.vendorName || "Direct Purchase",
            sub: p.invoiceNumber ? `#${p.invoiceNumber}` : "No invoice",
            date: p.purchaseDate,
            amount: p.totalAmount,
          }))}
          format={format}
        />
        <ActivityList
          title="Recent Issues"
          icon={TrendingDown}
          iconColor="text-orange-600"
          items={stats.recentIssues.map((i) => ({
            id: i._id,
            label: i.department || i.issuedTo || "General Issue",
            sub: i.purpose || "—",
            date: i.issueDate,
            amount: i.totalAmount,
          }))}
          format={format}
        />
      </div>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
  alert,
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  label: string;
  value: number;
  alert?: boolean;
}) {
  return (
    <div
      className={`bg-white border rounded-xl p-4 ${
        alert ? "border-amber-200" : "border-gray-200"
      }`}
    >
      <div
        className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center mb-2`}
      >
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

// ── Activity list ─────────────────────────────────────────────────────────────

function ActivityList({
  title,
  icon: Icon,
  iconColor,
  items,
  format,
}: {
  title: string;
  icon: React.ElementType;
  iconColor: string;
  items: {
    id: string;
    label: string;
    sub: string;
    date: string;
    amount: number;
  }[];
  format: (n: number) => string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <Icon className={`w-4 h-4 ${iconColor}`} />
        <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
      </div>
      {items.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-gray-400">
          No recent activity
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {items.map((it) => (
            <div key={it.id} className="px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {it.label}
                </p>
                <p className="text-xs text-gray-400 truncate">{it.sub}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-gray-900">
                  {format(it.amount)}
                </p>
                <p className="text-2xs text-gray-400">
                  {new Date(it.date).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
