"use client";

import { SEMANTIC_COLOR_CLASSES, type SemanticColor } from "@/lib/theme";

export function StatCard({
  label,
  icon: Icon,
  value,
  sub,
  color,
  bold,
}: {
  label: string;
  icon?: React.ElementType;
  value: React.ReactNode;
  sub?: React.ReactNode;
  color: SemanticColor;
  bold?: boolean;
}) {
  const { bg, border, text } = SEMANTIC_COLOR_CLASSES[color];
  return (
    <div className={`rounded-lg border p-3 ${bg} ${border}`}>
      <div className={`flex items-center gap-1.5 text-2xs uppercase tracking-wide font-medium ${text}`}>
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </div>
      <div className={`text-sm mt-1 ${bold ? "font-bold" : "font-semibold"} ${text}`}>{value}</div>
      {sub != null && <div className="text-2xs text-gray-600 mt-0.5">{sub}</div>}
    </div>
  );
}
