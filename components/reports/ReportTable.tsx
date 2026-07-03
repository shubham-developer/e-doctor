"use client";

import { DataCard } from "@/components/common/DataCard";

export function ReportTable({
  title,
  empty,
  footer,
  headers,
  children,
}: {
  title: string;
  empty: boolean;
  footer: string;
  headers: string[];
  children: React.ReactNode;
}) {
  return (
    <DataCard title={title} meta={footer} isEmpty={empty}>
      <table className="w-full text-xs min-w-[600px]">
        <thead>
          <tr className="text-gray-500 border-b border-gray-100">
            {headers.map((h) => (
              <th
                key={h}
                className={`px-4 py-2 ${
                  h === "Amount" || h === "Total" || h === "Total Paid" ? "text-right" : "text-left"
                }`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">{children}</tbody>
      </table>
    </DataCard>
  );
}
