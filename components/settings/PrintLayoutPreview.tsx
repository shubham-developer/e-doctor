"use client";

import type {
  PrintLayoutId,
  PrintLetterheadConfig,
  LetterheadFieldKey,
} from "@/lib/print/layouts";

/** Sample values shown at the configured positions in the letterhead preview. */
const SAMPLE_FIELD_VALUES: Record<LetterheadFieldKey, string> = {
  name: "Aarav Sharma",
  age: "32 Year",
  sex: "Male",
  date: "14/07/2026",
  uhid: "1042",
  phone: "9876543210",
  address: "Jain Nagar, Jagadhri",
  bloodGroup: "B+",
  doctor: "Dr. Verma",
  docNumber: "OPDN0042",
};

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

function TitleBar({ layout, label }: { layout: PrintLayoutId; label: string }) {
  if (layout === "minimal" || layout === "letterhead") {
    return (
      <div className="truncate border-y-2 border-gray-800 text-center text-2xs font-bold tracking-widest text-gray-800">
        {label}
      </div>
    );
  }
  return (
    <div
      className={`truncate bg-gray-800 text-center text-2xs font-bold tracking-widest text-white ${
        layout === "compact" ? "leading-3" : "py-0.5"
      }`}
    >
      {label}
    </div>
  );
}

function Header({
  layout,
  clinicName,
  showLogo,
}: {
  layout: PrintLayoutId;
  clinicName: string;
  showLogo: boolean;
}) {
  const logo = showLogo ? (
    <div className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm bg-danger-500 text-2xs font-bold text-white">
      ▲
    </div>
  ) : null;
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

/**
 * True-proportion A4 miniature for pre-printed letterhead mode: shows the
 * reserved blank zones and each configured field at its actual mm position
 * (mm mapped linearly to percentages of the 210×297 sheet).
 */
function LetterheadPreview({
  lh,
  showTitle,
  titleText,
}: {
  lh: PrintLetterheadConfig;
  showTitle: boolean;
  titleText: string;
}) {
  const topPct = (lh.topSpaceMm / 297) * 100;
  const bottomPct = (lh.bottomSpaceMm / 297) * 100;
  const leftWPct = (lh.leftSpaceWidthMm / 210) * 100;
  const leftHPct =
    (Math.max(lh.leftSpaceHeightMm - lh.topSpaceMm, 0) / 297) * 100;
  const zone =
    "absolute flex items-center justify-center bg-gray-50 text-2xs text-gray-400";

  return (
    <div className="relative aspect-210/297 w-full overflow-hidden rounded border border-gray-200 bg-white shadow-sm">
      <div className={`${zone} inset-x-0 top-0`} style={{ height: `${topPct}%` }}>
        Pre-printed header
      </div>
      <div
        className={`${zone} inset-x-0 bottom-0`}
        style={{ height: `${bottomPct}%` }}
      >
        Pre-printed footer
      </div>
      {leftWPct > 0 && leftHPct > 0 && (
        <div
          className={`${zone} left-0`}
          style={{
            top: `${topPct}%`,
            width: `${leftWPct}%`,
            height: `${leftHPct}%`,
          }}
        />
      )}

      {/* Content skeleton in the free area */}
      <div
        className="absolute right-0 space-y-1 p-2"
        style={{
          top: `${topPct}%`,
          bottom: `${bottomPct}%`,
          left: leftWPct > 0 && leftHPct > 0 ? `${leftWPct}%` : 0,
        }}
      >
        {showTitle && (
          <div className="truncate border-y border-gray-700 text-center text-2xs font-bold tracking-widest text-gray-700">
            {(titleText || "Prescription").toUpperCase()}
          </div>
        )}
        <div className="pt-1 space-y-1">
          <SkeletonLine w="w-full" h="h-0.5" />
          <SkeletonLine w="w-11/12" h="h-0.5" />
          <SkeletonLine w="w-full" h="h-0.5" />
          <SkeletonLine w="w-4/5" h="h-0.5" />
        </div>
        <MiniTable />
      </div>

      {/* Positioned fields (mm → % of sheet) */}
      {lh.fillFields &&
        lh.fields.map((f, i) => {
          const value = SAMPLE_FIELD_VALUES[f.key];
          return (
            <div
              key={i}
              className="absolute -translate-y-1/2 whitespace-nowrap rounded-xs bg-primary-50/90 px-0.5 font-semibold text-primary-700 outline outline-primary-200"
              style={{
                left: `${(f.xMm / 210) * 100}%`,
                top: `${(f.yMm / 297) * 100}%`,
                fontSize: "6px",
                lineHeight: "8px",
              }}
            >
              {f.label ? `${f.label}: ${value}` : value}
            </div>
          );
        })}
    </div>
  );
}

/** Stylized miniature of a printed A4 page for a given layout template. */
export function PrintLayoutPreview({
  layout,
  clinicName,
  showLogo = true,
  headerImage,
  footerImage,
  letterhead,
  showTitle = true,
  titleText = "",
}: {
  layout: PrintLayoutId;
  clinicName: string;
  showLogo?: boolean;
  /** Custom letterhead image URL; replaces the standard header when set. */
  headerImage?: string;
  /** Custom footer image URL shown as a miniature strip at the bottom. */
  footerImage?: string;
  /** Pre-printed letterhead setup; when enabled it replaces the whole preview. */
  letterhead?: PrintLetterheadConfig;
  /** Whether the title bar prints for this module. */
  showTitle?: boolean;
  /** Custom title-bar text; empty shows a generic sample. */
  titleText?: string;
}) {
  if (letterhead?.enabled) {
    return (
      <LetterheadPreview
        lh={letterhead}
        showTitle={showTitle}
        titleText={titleText}
      />
    );
  }
  return (
    <div
      className={`relative aspect-4/5 w-full rounded border border-gray-200 bg-white shadow-sm ${
        layout === "compact" ? "p-2" : "p-3"
      }`}
    >
      {headerImage ? (
        <img
          src={headerImage}
          alt="Custom header"
          className="mb-1 w-full rounded-xs"
        />
      ) : (
        <Header layout={layout} clinicName={clinicName} showLogo={showLogo} />
      )}
      {showTitle && (
        <TitleBar
          layout={layout}
          label={(titleText || "Invoice").toUpperCase()}
        />
      )}
      <div className="mt-1.5 grid grid-cols-3 gap-1">
        <SkeletonLine w="w-full" h="h-0.5" />
        <SkeletonLine w="w-full" h="h-0.5" />
        <SkeletonLine w="w-full" h="h-0.5" />
        <SkeletonLine w="w-4/5" h="h-0.5" />
        <SkeletonLine w="w-4/5" h="h-0.5" />
        <SkeletonLine w="w-4/5" h="h-0.5" />
      </div>
      <MiniTable />
      {footerImage && (
        <img
          src={footerImage}
          alt="Custom footer"
          className="absolute inset-x-2 bottom-2 w-[calc(100%-1rem)] rounded-xs"
        />
      )}
    </div>
  );
}
