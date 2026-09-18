import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { apiClient } from "@/lib/apiClient";
import type { PrintLetterheadConfig } from "@/lib/print/layouts";

export type PermCol = "view" | "add" | "edit" | "delete";
export type PermEntry = Partial<Record<PermCol, boolean>>;
export type Permissions = Record<string, Record<string, PermEntry>>;

export interface CustomRole {
  name: string;
  permissions: Permissions;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "RECEPTIONIST" | "VIEWER";
  customRole: CustomRole | null;
  avatarUrl: string | null;
}

export interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  address?: string;
  phone?: string;
  logoUrl: string;
  smallLogoUrl: string;
  brandColor: string;
  plan: "STARTER" | "GROWTH" | "PRO";
  planExpiresAt: string;
  currency: string;
  currencySymbol: string;
  /** Moment.js-style date token format from Settings → Date Time, e.g. "DD/MM/YYYY". */
  dateFormat: string;
  /** Print layout template per module (module key → PrintLayoutId), see lib/print/layouts.ts */
  printLayouts?: Record<string, string>;
  /** Whether the clinic logo prints per module (module key → boolean, default true), see lib/print/layouts.ts */
  printShowLogo?: Record<string, boolean>;
  /** Custom letterhead image per module (module key → serving URL); replaces the standard print header when set. */
  printHeaderImages?: Record<string, string>;
  /** Rich-text footer HTML per module printed at the bottom of documents. */
  printFooterContents?: Record<string, string>;
  /** Pre-printed letterhead setup per module (module key → PrintLetterheadConfig), see lib/print/layouts.ts */
  printLetterheads?: Record<string, Partial<PrintLetterheadConfig>>;
  /** Whether the title bar prints per module (module key → boolean, default true), see lib/print/layouts.ts */
  printShowTitles?: Record<string, boolean>;
  /** Custom title-bar text per module (module key → string, empty = document default). */
  printTitleTexts?: Record<string, string>;
  /** Module keys enabled for this tenant by the platform admin; null/empty means all. */
  enabledModules?: string[] | null;
  /** Days within which a returning OPD patient is not charged (0 = disabled). */
  opdRevisitDays?: number;
  /** How many return visits within the window are free (default 1). */
  opdFreeRevisits?: number;
}

export interface BranchInfo {
  id: string;
  name: string;
  code: string;
}

interface AppState {
  user: User | null;
  tenant: TenantInfo | null;
  branch: BranchInfo | null;
  branches: BranchInfo[];
  lang: "hi" | "en";
  loading: boolean;
  hasHydrated: boolean;
  setLang: (l: "hi" | "en") => void;
  setHasHydrated: (b: boolean) => void;
  fetchMe: () => Promise<void>;
  switchBranch: (branchId: string) => Promise<void>;
  reset: () => void;
}

/** Legacy pre-zustand language key (see lib/context.tsx history) — migrated once below. */
const LEGACY_LANG_KEY = "edoctor_lang";
const STORE_KEY = "doctorcloud-app-store";

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      tenant: null,
      branch: null,
      branches: [],
      lang: "en",
      loading: true,
      hasHydrated: false,
      setLang: (lang) => set({ lang }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      fetchMe: async () => {
        try {
          const res = await apiClient.get<{
            user: User;
            tenant: TenantInfo;
            branch: BranchInfo | null;
            branches: BranchInfo[];
          }>("/api/auth/me");
          if (res.success) {
            set({
              user: res.data.user,
              tenant: res.data.tenant,
              branch: res.data.branch,
              branches: res.data.branches ?? [],
            });
          } else if (res.error === "Session expired") {
            // apiClient already redirected to /login?expired=1 — also drop the
            // cached tenant/user so stale branding doesn't keep showing.
            set({ user: null, tenant: null, branch: null, branches: [] });
            useAppStore.persist.clearStorage();
          }
        } finally {
          set({ loading: false });
        }
      },
      switchBranch: async (branchId) => {
        const res = await apiClient.post<{ branch: BranchInfo }>(
          "/api/auth/switch-branch",
          { branchId },
        );
        if (res.success) {
          window.location.reload();
        }
      },
      reset: () =>
        set({ user: null, tenant: null, branch: null, branches: [], loading: false }),
    }),
    {
      name: STORE_KEY,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({
        user: state.user,
        tenant: state.tenant,
        branch: state.branch,
        branches: state.branches,
        lang: state.lang,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

/** One-time migration from the legacy plain localStorage lang key, before the persisted store's own key exists. */
export function migrateLegacyLang() {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(STORE_KEY)) return;
  const legacy = localStorage.getItem(LEGACY_LANG_KEY);
  if (legacy === "hi" || legacy === "en") {
    useAppStore.setState({ lang: legacy });
  }
}
