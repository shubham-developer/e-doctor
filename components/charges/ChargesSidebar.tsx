"use client";

import { cn } from "@/lib/utils";
import type { ChargesTab } from "./types";

const TABS: { key: ChargesTab; label: string }[] = [
  { key: "charges", label: "Services" },
  { key: "chargeCategory", label: "Service Category" },
];

export function ChargesSidebar({
  active,
  onChange,
}: {
  active: ChargesTab;
  onChange: (tab: ChargesTab) => void;
}) {
  return (
    <nav className="w-44 shrink-0 border-r border-gray-200 bg-gray-50 flex flex-col">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={cn(
            "text-left px-4 py-3 text-sm border-b border-gray-100 transition-colors",
            active === tab.key
              ? "bg-white text-primary-600 font-semibold border-l-2 border-l-primary-500"
              : "text-gray-600 hover:bg-gray-100",
          )}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
