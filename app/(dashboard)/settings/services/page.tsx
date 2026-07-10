"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useApiQuery } from "@/lib/useApiQuery";
import { TabBar } from "@/components/common/TabBar";
import { ChargesList } from "@/components/charges/ChargesList";
import { ChargeCategorySection } from "@/components/charges/ChargeCategorySection";
import type { ChargesTab } from "@/components/charges/types";
import type { ChargeCategoryItem } from "@/lib/types/charges";

const TABS: { key: ChargesTab; label: string }[] = [
  { key: "charges", label: "Services" },
  { key: "chargeCategory", label: "Service Categories" },
];

export default function ServicesSettingsPage() {
  const [activeTab, setActiveTab] = useState<ChargesTab>("charges");
  const queryClient = useQueryClient();

  const { data: categoriesData } = useApiQuery<ChargeCategoryItem[]>(
    ["charge-categories"],
    "/api/dashboard/charge-categories",
  );
  const categories = categoriesData ?? [];

  function loadLookups() {
    queryClient.invalidateQueries({ queryKey: ["charge-categories"] });
    queryClient.invalidateQueries({ queryKey: ["charges"] });
  }

  return (
    <div className="flex flex-col h-[calc(100vh-220px)] min-h-96 border border-gray-200 rounded-lg overflow-hidden bg-white">
      <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 shrink-0">
        <TabBar tabs={TABS} active={activeTab} onChange={setActiveTab} />
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
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
  );
}
