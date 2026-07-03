"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiClient } from "@/lib/apiClient";
import { ChargesSidebar } from "@/components/charges/ChargesSidebar";
import { ChargesList } from "@/components/charges/ChargesList";
import { ChargeCategorySection } from "@/components/charges/ChargeCategorySection";
import type { ChargesTab } from "@/components/charges/types";
import type { ChargeCategoryItem } from "@/lib/types/charges";

const TAB_TITLES: Record<ChargesTab, string> = {
  charges: "Services",
  chargeCategory: "Service Categories",
};

export default function ChargesPage() {
  const [activeTab, setActiveTab] = useState<ChargesTab>("charges");
  const [categories, setCategories] = useState<ChargeCategoryItem[]>([]);

  async function loadLookups() {
    const catRes = await apiClient.get<ChargeCategoryItem[]>("/api/dashboard/charge-categories");
    if (catRes.success) setCategories(catRes.data);
    else toast.error(catRes.error);
  }

  useEffect(() => {
    loadLookups();
  }, []);

  return (
    <div className="flex h-[calc(100vh-220px)] min-h-96 border border-gray-200 rounded-lg overflow-hidden bg-white">
      <ChargesSidebar active={activeTab} onChange={setActiveTab} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
          <h2 className="text-sm font-semibold text-gray-800">
            {TAB_TITLES[activeTab]}
          </h2>
        </div>

        <div className="flex-1 overflow-hidden">
          {activeTab === "charges" && (
            <ChargesList
              categories={categories}
              units={[]}
              taxCategories={[]}
              onMasterDataChanged={loadLookups}
            />
          )}
          {activeTab === "chargeCategory" && (
            <ChargeCategorySection types={[]} onChanged={loadLookups} />
          )}
        </div>
      </div>
    </div>
  );
}
