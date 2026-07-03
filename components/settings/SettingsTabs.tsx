"use client";

import { cn } from "@/lib/utils";

/** Top tab bar for settings pages — same visual language as the OPD page tab bar. */
export function SettingsTabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: readonly { key: T; label: string }[];
  active: T;
  onChange: (key: T) => void;
}) {
  return (
    <div className="flex border-b border-gray-200 shrink-0 bg-gray-50 overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
            active === tab.key
              ? "border-primary-500 text-primary-600 bg-white"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
