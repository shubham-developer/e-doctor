"use client";

import { PrintLayoutSettings } from "@/components/settings/PrintLayoutSettings";

export default function PrintLayoutsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-gray-800">
        Print Header &amp; Footer
      </h1>
      <PrintLayoutSettings />
    </div>
  );
}
