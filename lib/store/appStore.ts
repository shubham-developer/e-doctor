import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

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
  /** Module keys enabled for this tenant by the platform admin; null/empty means all. */
  enabledModules?: string[] | null;
}

interface AppState {
  user: User | null;
  tenant: TenantInfo | null;
  lang: "hi" | "en";
  loading: boolean;
  hasHydrated: boolean;
  setLang: (l: "hi" | "en") => void;
  setHasHydrated: (b: boolean) => void;
  fetchMe: () => Promise<void>;
  reset: () => void;
}

/** Legacy pre-zustand language key (see lib/context.tsx history) — migrated once below. */
const LEGACY_LANG_KEY = "edoctor_lang";
const STORE_KEY = "edoctor-app-store";

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      tenant: null,
      lang: "en",
      loading: true,
      hasHydrated: false,
      setLang: (lang) => set({ lang }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      fetchMe: async () => {
        try {
          const res = await fetch("/api/auth/me");
          if (res.ok) {
            const data = await res.json();
            set({ user: data.data.user, tenant: data.data.tenant });
          } else if (res.status === 401) {
            // Expired/invalid session — drop the cached tenant/user so stale
            // branding doesn't keep showing, then match apiClient's redirect.
            set({ user: null, tenant: null });
            useAppStore.persist.clearStorage();
            if (typeof window !== "undefined") {
              window.location.href = "/login?expired=1";
            }
          }
        } finally {
          set({ loading: false });
        }
      },
      reset: () => set({ user: null, tenant: null, loading: false }),
    }),
    {
      name: STORE_KEY,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({
        user: state.user,
        tenant: state.tenant,
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
