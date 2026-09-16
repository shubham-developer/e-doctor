"use client";

import { useState } from "react";
import { TabBar } from "@/components/common/TabBar";
import { RefList } from "@/components/common/RefList";
import { FindingListSection } from "./FindingListSection";

type SubSection = "category" | "list";

const SECTIONS: { key: SubSection; label: string }[] = [
  { key: "category", label: "Categories" },
  { key: "list", label: "List" },
];

export function FindingsTab() {
  const [active, setActive] = useState<SubSection>("category");

  return (
    <div className="flex flex-col h-[calc(100vh-220px)] min-h-96 border border-gray-200 rounded-lg overflow-hidden bg-white">
      <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 shrink-0">
        <TabBar tabs={SECTIONS} active={active} onChange={setActive} />
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {active === "category" && (
          <RefList
            title="Finding Category"
            apiPath="/api/dashboard/findings/categories"
          />
        )}
        {active === "list" && <FindingListSection />}
      </div>
    </div>
  );
}
