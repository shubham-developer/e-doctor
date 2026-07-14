"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  BarChart3,
  BedDouble,
  ClipboardList,
  FlaskConical,
  ImageIcon,
  PanelBottom,
  PenLine,
  Pill,
  Printer,
  ScanLine,
  Stethoscope,
  Trash2,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { useApp } from "@/lib/context";
import { apiClient } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/ui/page-loader";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PRINT_LAYOUTS,
  PRINT_LAYOUT_IDS,
  PRINT_MODULES,
  DEFAULT_PRINT_LAYOUT,
  resolvePrintLayout,
  resolvePrintShowLogo,
  type PrintLayoutId,
  type PrintModuleKey,
} from "@/lib/print/layouts";
import { PrintLayoutPreview } from "./PrintLayoutPreview";

type LayoutMap = Record<PrintModuleKey, PrintLayoutId>;
type ShowLogoMap = Record<PrintModuleKey, boolean>;
type StringMap = Record<PrintModuleKey, string>;

const MODULE_ICONS: Record<PrintModuleKey, LucideIcon> = {
  opd: Stethoscope,
  ipd: BedDouble,
  pharmacy: Pill,
  pathology: FlaskConical,
  radiology: ScanLine,
  prescription: ClipboardList,
  manualPrescription: PenLine,
  reports: BarChart3,
};

function layoutMapFrom(saved?: Record<string, string> | null): LayoutMap {
  return Object.fromEntries(
    PRINT_MODULES.map(({ key }) => [key, resolvePrintLayout(saved, key)]),
  ) as LayoutMap;
}

function showLogoMapFrom(saved?: Record<string, boolean> | null): ShowLogoMap {
  return Object.fromEntries(
    PRINT_MODULES.map(({ key }) => [key, resolvePrintShowLogo(saved, key)]),
  ) as ShowLogoMap;
}

function stringMapFrom(saved?: Record<string, string> | null): StringMap {
  return Object.fromEntries(
    PRINT_MODULES.map(({ key }) => [key, saved?.[key] ?? ""]),
  ) as StringMap;
}

export function PrintLayoutSettings() {
  const { user, tenant, refetch } = useApp();
  const isOwner = user?.role === "OWNER";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"header" | "footer" | null>(
    null,
  );
  const [layouts, setLayouts] = useState<LayoutMap>(() => layoutMapFrom(null));
  const [showLogo, setShowLogo] = useState<ShowLogoMap>(() =>
    showLogoMapFrom(null),
  );
  const [headerImages, setHeaderImages] = useState<StringMap>(() =>
    stringMapFrom(null),
  );
  const [footers, setFooters] = useState<StringMap>(() => stringMapFrom(null));
  /** Bumped after each upload so <img> previews bypass the browser cache. */
  const [imgVersion, setImgVersion] = useState(0);
  const [active, setActive] = useState<PrintModuleKey>(PRINT_MODULES[0].key);
  const headerFileRef = useRef<HTMLInputElement>(null);
  const footerFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiClient
      .get<{
        tenant: {
          printLayouts?: Record<string, string>;
          printShowLogo?: Record<string, boolean>;
          printHeaderImages?: Record<string, string>;
          printFooterContents?: Record<string, string>;
        };
      }>("/api/dashboard/settings")
      .then((d) => {
        if (d.success) {
          setLayouts(layoutMapFrom(d.data?.tenant.printLayouts));
          setShowLogo(showLogoMapFrom(d.data?.tenant.printShowLogo));
          setHeaderImages(stringMapFrom(d.data?.tenant.printHeaderImages));
          setFooters(stringMapFrom(d.data?.tenant.printFooterContents));
        } else toast.error(d.error ?? "Failed to load print layout settings");
        setLoading(false);
      });
  }, []);

  async function handleSave() {
    setSaving(true);
    const d = await apiClient.patch("/api/dashboard/settings", {
      printLayouts: layouts,
      printShowLogo: showLogo,
    });
    setSaving(false);
    if (d.success) {
      toast.success("Print settings saved");
      refetch();
    } else {
      toast.error(d.error ?? "Failed to save print settings");
    }
  }

  async function handleImageUpload(
    slot: "header" | "footer",
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("File must be an image");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2 MB");
      return;
    }

    setUploading(slot);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(
        `/api/dashboard/settings/print-${slot}/${active}`,
        { method: "POST", body: formData },
      );
      const d = await res.json();
      if (d.success) {
        if (slot === "header") {
          setHeaderImages((prev) => ({ ...prev, [active]: d.data.url }));
        } else {
          setFooters((prev) => ({ ...prev, [active]: d.data.html }));
        }
        setImgVersion((v) => v + 1);
        toast.success(`${slot === "header" ? "Header" : "Footer"} image uploaded`);
        refetch();
      } else {
        toast.error(d.error ?? `Failed to upload ${slot} image`);
      }
    } catch {
      toast.error(`Failed to upload ${slot} image`);
    } finally {
      setUploading(null);
    }
  }

  async function handleImageDelete(slot: "header" | "footer") {
    const d = await apiClient.delete(
      `/api/dashboard/settings/print-${slot}/${active}`,
    );
    if (d.success) {
      if (slot === "header") {
        setHeaderImages((prev) => ({ ...prev, [active]: "" }));
      } else {
        setFooters((prev) => ({ ...prev, [active]: "" }));
      }
      toast.success(`${slot === "header" ? "Header" : "Footer"} image removed`);
      refetch();
    } else {
      toast.error(d.error ?? `Failed to remove ${slot} image`);
    }
  }

  if (loading) return <PageLoader rows={6} />;

  const activeLabel = PRINT_MODULES.find((m) => m.key === active)?.label;
  const ActiveIcon = MODULE_ICONS[active] ?? Printer;
  const headerImage = headerImages[active];
  const headerImageSrc = headerImage
    ? `${headerImage}?v=${imgVersion}`
    : undefined;
  const hasFooterImage = !!footers[active].trim();
  const footerImageSrc = hasFooterImage
    ? `/api/dashboard/settings/print-footer/${active}?v=${imgVersion}`
    : undefined;

  return (
    <div className="flex border border-gray-200 rounded-lg bg-white overflow-hidden min-h-130">
      {/* Sidebar — print module list */}
      <div className="w-72 shrink-0 border-r border-gray-100 flex flex-col">
        <div className="px-4 py-3.5 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">
            Print Modules
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto py-1.5">
          {PRINT_MODULES.map(({ key, label }) => {
            const Icon = MODULE_ICONS[key] ?? Printer;
            const isSelected = active === key;
            const isCustom =
              layouts[key] !== DEFAULT_PRINT_LAYOUT ||
              !!headerImages[key] ||
              !!footers[key].trim();
            return (
              <div
                key={key}
                className={`flex items-center gap-2.5 mx-1.5 my-0.5 px-2.5 py-2 rounded-md cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-primary-50 text-primary-700"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
                onClick={() => setActive(key)}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isSelected ? "text-primary-600" : "text-gray-400"
                  }`}
                />
                <span className="text-xs font-semibold truncate flex-1">
                  {label}
                </span>
                {isCustom && (
                  <span className="text-2xs font-semibold text-primary-500 bg-primary-50 px-1.5 py-0.5 rounded uppercase tracking-wide shrink-0">
                    Custom
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail panel — header/footer & layout config for the selected module */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ActiveIcon className="w-4 h-4 text-primary-500" />
            <h2 className="text-sm font-semibold text-gray-800">
              {activeLabel} — Header &amp; Footer
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">
              Apply layout to all modules
            </span>
            <Select
              value=""
              onValueChange={(v) => {
                if (!v) return;
                setLayouts(
                  layoutMapFrom(
                    Object.fromEntries(PRINT_MODULES.map(({ key }) => [key, v])),
                  ),
                );
              }}
              disabled={!isOwner}
            >
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue placeholder="Choose layout…" />
              </SelectTrigger>
              <SelectContent>
                {PRINT_LAYOUT_IDS.map((id) => (
                  <SelectItem key={id} value={id}>
                    {PRINT_LAYOUTS[id].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid gap-6 px-5 py-4 lg:grid-cols-[1fr_260px]">
            <div className="min-w-0 space-y-5">
              {/* Layout & logo */}
              <div className="rounded-lg border border-gray-200">
                <div className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Label className="text-xs text-gray-600">Layout</Label>
                    <Select
                      value={layouts[active]}
                      onValueChange={(v) =>
                        v &&
                        setLayouts((prev) => ({
                          ...prev,
                          [active]: v as PrintLayoutId,
                        }))
                      }
                      disabled={!isOwner}
                    >
                      <SelectTrigger className="h-8 w-40 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRINT_LAYOUT_IDS.map((id) => (
                          <SelectItem key={id} value={id}>
                            {PRINT_LAYOUTS[id].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Label
                      htmlFor={`show-logo-${active}`}
                      className="text-xs text-gray-500 cursor-pointer"
                    >
                      Logo
                    </Label>
                    <Switch
                      id={`show-logo-${active}`}
                      size="sm"
                      checked={showLogo[active]}
                      onCheckedChange={(v) =>
                        setShowLogo((prev) => ({ ...prev, [active]: v }))
                      }
                      disabled={!isOwner || !!headerImage}
                    />
                  </div>
                </div>
                <p className="px-4 pb-3 text-xs text-gray-500">
                  <span className="font-medium text-gray-700">
                    {PRINT_LAYOUTS[layouts[active]].label}:
                  </span>{" "}
                  {PRINT_LAYOUTS[layouts[active]].description}
                </p>
              </div>

              {/* Header image */}
              <div className="rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-4 py-2.5 rounded-t-lg">
                  <ImageIcon className="h-3.5 w-3.5 text-gray-500" />
                  <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Header Image
                  </h3>
                  <span className="text-2xs text-gray-400">
                    (2230px × 300px)
                  </span>
                </div>
                <div className="space-y-3 px-4 py-4">
                  <p className="text-xs text-gray-500">
                    A full-width letterhead image printed instead of the
                    standard logo, clinic name and contact details.
                  </p>
                  {headerImageSrc ? (
                    <>
                      <img
                        src={headerImageSrc}
                        alt={`${activeLabel} header`}
                        className="w-full rounded border border-gray-200 bg-white"
                      />
                      {isOwner && (
                        <button
                          type="button"
                          onClick={() => handleImageDelete("header")}
                          className="flex items-center gap-1.5 text-xs text-danger-600 hover:text-danger-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Remove header
                          image
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="flex h-20 items-center justify-center rounded border border-dashed border-gray-300 text-xs text-gray-400">
                      No header image — the standard header will print
                    </div>
                  )}
                  {isOwner && (
                    <>
                      <input
                        ref={headerFileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload("header", e)}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={uploading === "header"}
                        onClick={() => headerFileRef.current?.click()}
                        className="h-8 text-xs gap-1.5"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        {uploading === "header"
                          ? "Uploading…"
                          : headerImage
                            ? "Replace image"
                            : "Upload image"}
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Footer image */}
              <div className="rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-4 py-2.5 rounded-t-lg">
                  <PanelBottom className="h-3.5 w-3.5 text-gray-500" />
                  <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Footer Image
                  </h3>
                  <span className="text-2xs text-gray-400">
                    (2230px × 200px)
                  </span>
                </div>
                <div className="space-y-3 px-4 py-4">
                  <p className="text-xs text-gray-500">
                    A full-width image printed at the bottom of every{" "}
                    {activeLabel?.toLowerCase()} document — e.g. terms,
                    signatures or registration numbers.
                  </p>
                  {footerImageSrc ? (
                    <>
                      <img
                        src={footerImageSrc}
                        alt={`${activeLabel} footer`}
                        className="w-full rounded border border-gray-200 bg-white"
                      />
                      {isOwner && (
                        <button
                          type="button"
                          onClick={() => handleImageDelete("footer")}
                          className="flex items-center gap-1.5 text-xs text-danger-600 hover:text-danger-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Remove footer
                          image
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="flex h-20 items-center justify-center rounded border border-dashed border-gray-300 text-xs text-gray-400">
                      No footer image — documents print without a footer
                    </div>
                  )}
                  {isOwner && (
                    <>
                      <input
                        ref={footerFileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload("footer", e)}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={uploading === "footer"}
                        onClick={() => footerFileRef.current?.click()}
                        className="h-8 text-xs gap-1.5"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        {uploading === "footer"
                          ? "Uploading…"
                          : hasFooterImage
                            ? "Replace image"
                            : "Upload image"}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Live preview */}
            <div className="lg:sticky lg:top-4 self-start">
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                Preview — {activeLabel}
              </h3>
              <PrintLayoutPreview
                layout={layouts[active]}
                clinicName={tenant?.name ?? "Clinic"}
                showLogo={showLogo[active]}
                headerImage={headerImageSrc}
                footerImage={footerImageSrc}
              />
            </div>
          </div>
        </div>

        {isOwner && (
          <div className="px-5 py-4 border-t border-gray-100 flex justify-end">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-primary-600 hover:bg-primary-700 px-8"
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
