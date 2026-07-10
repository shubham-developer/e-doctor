"use client";

import { useState } from "react";
import { TabBar } from "@/components/common/TabBar";
import { RefList } from "./RefList";
import { BedGroupSection } from "./BedGroupSection";
import { BedTable } from "./BedTable";

type SubSection = "bed-status" | "bed" | "bed-type" | "bed-group" | "floor";

const SECTIONS: { key: SubSection; label: string }[] = [
  { key: "bed-status", label: "Bed Status" },
  { key: "bed", label: "Bed" },
  { key: "bed-type", label: "Bed Type" },
  { key: "bed-group", label: "Bed Group" },
  { key: "floor", label: "Floor" },
];

export function BedSetupTab() {
  const [active, setActive] = useState<SubSection>("bed-status");

  return (
    <div className="flex flex-col h-[calc(100vh-220px)] min-h-96 border border-gray-200 rounded-lg overflow-hidden bg-white">
      <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 shrink-0">
        <TabBar tabs={SECTIONS} active={active} onChange={setActive} />
      </div>

      <div className="flex-1 overflow-hidden">
        {active === "bed-status" && <BedTable readOnly />}
        {active === "bed" && <BedTable />}
        {active === "bed-type" && (
          <RefList title="Bed Type" apiPath="/api/dashboard/bed-types" />
        )}
        {active === "bed-group" && <BedGroupSection />}
        {active === "floor" && (
          <RefList title="Floor" apiPath="/api/dashboard/floors" />
        )}
      </div>
    </div>
  );
}
