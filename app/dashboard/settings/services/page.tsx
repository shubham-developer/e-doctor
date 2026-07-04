"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiClient } from "@/lib/apiClient";
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
  const [categories, setCategories] = useState<ChargeCategoryItem[]>([]);

  async function loadLookups() {
    const catRes = await apiClient.get<ChargeCategoryItem[]>(
      "/api/dashboard/charge-categories",
    );
    if (catRes.success) setCategories(catRes.data);
    else toast.error(catRes.error);
  }

  useEffect(() => {
    loadLookups();
  }, []);

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
