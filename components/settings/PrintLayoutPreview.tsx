"use client";

import type { PrintLayoutId } from "@/lib/print/layouts";

function SkeletonLine({ w, h = "h-1" }: { w: string; h?: string }) {
  return <div className={`${h} ${w} rounded-sm bg-gray-200`} />;
}

function MiniTable() {
  return (
    <div className="mt-2 space-y-1">
      <div className="h-1.5 rounded-sm bg-gray-300" />
      <SkeletonLine w="w-full" />
      <SkeletonLine w="w-full" />
      <SkeletonLine w="w-5/6" />
      <div className="flex flex-col items-end gap-1 pt-1">
        <SkeletonLine w="w-1/3" />
        <SkeletonLine w="w-1/4" h="h-1.5" />
      </div>
    </div>
  );
}

function TitleBar({ layout }: { layout: PrintLayoutId }) {
  if (layout === "minimal" || layout === "letterhead") {
    return (
      <div className="border-y-2 border-gray-800 text-center text-2xs font-bold tracking-widest text-gray-800">
        INVOICE
      </div>
    );
  }
  return (
    <div
      className={`bg-gray-800 text-center text-2xs font-bold tracking-widest text-white ${
        layout === "compact" ? "leading-3" : "py-0.5"
      }`}
    >
      INVOICE
    </div>
  );
}

function Header({
  layout,
  clinicName,
}: {
  layout: PrintLayoutId;
  clinicName: string;
}) {
  const logo = (
    <div className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm bg-danger-500 text-2xs font-bold text-white">
      ▲
    </div>
  );
  const contact = (
    <div
      className={`flex flex-col gap-0.5 ${layout === "centered" ? "items-center" : "items-end"}`}
    >
      <SkeletonLine w="w-12" h="h-0.5" />
      <SkeletonLine w="w-10" h="h-0.5" />
      <SkeletonLine w="w-11" h="h-0.5" />
    </div>
  );
  const name = (
    <div
      className={`truncate text-2xs font-bold text-gray-900 ${layout === "compact" ? "leading-3" : ""}`}
    >
      {clinicName}
    </div>
  );

  if (layout === "letterhead") {
    return (
      <div className="mb-1 flex h-10 items-center justify-center rounded-sm border border-dashed border-gray-300 text-2xs text-gray-400">
        Pre-printed letterhead space
      </div>
    );
  }
  if (layout === "centered") {
    return (
      <div className="mb-1 flex flex-col items-center gap-0.5 text-center">
        {logo}
        {name}
        {contact}
      </div>
    );
  }
  return (
    <div
      className={`flex items-start justify-between gap-2 ${layout === "compact" ? "mb-0.5" : "mb-1"}`}
    >
      <div className="min-w-0 space-y-0.5">
        {logo}
        {name}
      </div>
      {contact}
    </div>
  );
}

/** Stylized miniature of a printed A4 page for a given layout template. */
export function PrintLayoutPreview({
  layout,
  clinicName,
}: {
  layout: PrintLayoutId;
  clinicName: string;
}) {
  return (
    <div
      className={`aspect-4/5 w-full rounded border border-gray-200 bg-white shadow-sm ${
        layout === "compact" ? "p-2" : "p-3"
      }`}
    >
      <Header layout={layout} clinicName={clinicName} />
      <TitleBar layout={layout} />
      <div className="mt-1.5 grid grid-cols-3 gap-1">
        <SkeletonLine w="w-full" h="h-0.5" />
        <SkeletonLine w="w-full" h="h-0.5" />
        <SkeletonLine w="w-full" h="h-0.5" />
        <SkeletonLine w="w-4/5" h="h-0.5" />
        <SkeletonLine w="w-4/5" h="h-0.5" />
        <SkeletonLine w="w-4/5" h="h-0.5" />
      </div>
      <MiniTable />
    </div>
  );
}
