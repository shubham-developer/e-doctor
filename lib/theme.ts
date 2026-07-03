/**
 * Central design tokens for status/accent colors used across stat cards,
 * badges, and module indicators. The four semantic roles (primary/success/
 * warning/danger) are aliased in app/globals.css to Tailwind's blue/green/
 * orange/red scales — re-skinning the app means repointing those aliases in
 * one place, not editing className strings throughout the codebase. purple
 * and teal are plain Tailwind accents (no semantic role), used for module
 * indicators that don't map to a status meaning (e.g. IPD, collections).
 */

export const SEMANTIC_COLORS = ["primary", "success", "warning", "danger", "purple", "teal"] as const;
export type SemanticColor = (typeof SEMANTIC_COLORS)[number];

interface ColorClasses {
  bg: string;
  border: string;
  text: string;
}

/** Soft card/badge styling per semantic color, e.g. `bg-success-50 border-success-100 text-success-700`. */
export const SEMANTIC_COLOR_CLASSES: Record<SemanticColor, ColorClasses> = {
  primary: { bg: "bg-primary-50", border: "border-primary-100", text: "text-primary-700" },
  success: { bg: "bg-success-50", border: "border-success-100", text: "text-success-700" },
  warning: { bg: "bg-warning-50", border: "border-warning-100", text: "text-warning-700" },
  danger: { bg: "bg-danger-50", border: "border-danger-100", text: "text-danger-700" },
  purple: { bg: "bg-purple-50", border: "border-purple-100", text: "text-purple-700" },
  teal: { bg: "bg-teal-50", border: "border-teal-100", text: "text-teal-700" },
};

/** Solid (button/active-state) classes per semantic color, e.g. `bg-success-600 text-white`. */
export const SEMANTIC_SOLID_CLASSES: Record<SemanticColor, string> = {
  primary: "bg-primary-600 text-white",
  success: "bg-success-600 text-white",
  warning: "bg-warning-600 text-white",
  danger: "bg-danger-600 text-white",
  purple: "bg-purple-600 text-white",
  teal: "bg-teal-600 text-white",
};
