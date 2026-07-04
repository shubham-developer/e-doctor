"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useApiQuery } from "@/lib/useApiQuery";
import { SettingsTabs } from "@/components/settings/SettingsTabs";
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
      <SettingsTabs tabs={TABS} active={activeTab} onChange={setActiveTab} />

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
  );
}
