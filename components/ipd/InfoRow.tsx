"use client";

export function InfoRow({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="flex py-1.5 border-b border-gray-100 last:border-0">
      <span className="w-36 shrink-0 text-xs font-semibold text-gray-700">
        {label}
      </span>
      <span className="text-xs text-gray-600">{value || "—"}</span>
    </div>
  );
}
