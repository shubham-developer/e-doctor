"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { NextIntlClientProvider } from "next-intl";
import enMessages from "@/messages/en.json";
import hiMessages from "@/messages/hi.json";
import {
  formatDate as formatDateBase,
  formatDateTime as formatDateTimeBase,
  toDateFnsPattern,
} from "@/lib/format";

type PermCol = "view" | "add" | "edit" | "delete";
type PermEntry = Partial<Record<PermCol, boolean>>;
type Permissions = Record<string, Record<string, PermEntry>>;

interface CustomRole {
  name: string;
  permissions: Permissions;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "RECEPTIONIST" | "VIEWER";
  customRole: CustomRole | null;
}

interface TenantInfo {
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

interface AppContextType {
  user: User | null;
  tenant: TenantInfo | null;
  lang: "hi" | "en";
  setLang: (l: "hi" | "en") => void;
  loading: boolean;
  refetch: () => void;
  /** Returns true if the user can perform `action` on `moduleKey`.
   *  Users without a custom role (OWNER, RECEPTIONIST, VIEWER) always return true. */
  can: (moduleKey: string, action?: PermCol) => boolean;
}

const AppContext = createContext<AppContextType>({
  user: null,
  tenant: null,
  lang: "en",
  setLang: () => {},
  loading: true,
  refetch: () => {},
  can: () => true,
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [lang, setLangState] = useState<"hi" | "en">("en");
  const [loading, setLoading] = useState(true);

  function setLang(l: "hi" | "en") {
    setLangState(l);
    localStorage.setItem("edoctor_lang", l);
  }

  async function fetchMe() {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.data.user);
        setTenant(data.data.tenant);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const saved = localStorage.getItem("edoctor_lang") as "hi" | "en" | null;
    if (saved) setLangState(saved);
    fetchMe();
  }, []);

  const can = useCallback(
    (moduleKey: string, action: PermCol = "view"): boolean => {
      // Tenant-level gate: modules the platform admin disabled are off for every
      // user regardless of role. Empty/missing list means all modules enabled.
      if (
        tenant?.enabledModules &&
        tenant.enabledModules.length > 0 &&
        !tenant.enabledModules.includes(moduleKey)
      ) {
        return false;
      }
      // While loading, or if session failed — show everything (middleware handles auth redirect)
      if (!user) return true;
      // Users without a custom role see everything
      if (!user.customRole) return true;

      const modulePerm = user.customRole.permissions?.[moduleKey] as
        | Record<string, unknown>
        | undefined;
      if (!modulePerm) return false;
      // flat structure: { view: true, add: false, ... }
      return !!modulePerm[action];
    },
    [user, tenant],
  );

  const messages = lang === "hi" ? hiMessages : enMessages;

  return (
    <AppContext.Provider
      value={{ user, tenant, lang, setLang, loading, refetch: fetchMe, can }}
    >
      <NextIntlClientProvider
        locale={lang}
        messages={messages}
        onError={() => {}}
      >
        {children}
      </NextIntlClientProvider>
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}

/** Digit-grouping locale for a currency code (e.g. INR → lakh/crore grouping, others → standard 3-digit grouping). */
export function localeForCurrency(currency?: string) {
  return currency === "INR" ? "en-IN" : "en-US";
}

/** Formats a number using the digit grouping appropriate for the given currency, e.g. formatAmount(120200, 'INR') → "1,20,200.00" */
export function formatAmount(n: number, currency?: string, decimals = 2) {
  const safe = typeof n === "number" && isFinite(n) ? n : 0;
  return safe.toLocaleString(localeForCurrency(currency), {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Returns the tenant's currency symbol and a formatter: fmt(1234) → "₹1,234.00" */
export function useCurrency() {
  const { tenant } = useContext(AppContext);
  const sym = tenant?.currencySymbol ?? "₹";
  const fmt = (n: number, decimals = 2) =>
    sym + formatAmount(n, tenant?.currency, decimals);
  return { sym, fmt };
}

/**
 * Returns date/date-time formatters using the tenant's configured date
 * format (Settings → Date Time) as the single source of truth, instead of
 * each call site hardcoding its own pattern.
 */
export function useDateFormatter() {
  const { tenant } = useContext(AppContext);
  const pattern = tenant?.dateFormat
    ? toDateFnsPattern(tenant.dateFormat)
    : "dd/MM/yyyy";
  return {
    dateFormat: tenant?.dateFormat ?? "DD/MM/YYYY",
    formatDate: (date: Date | string) => formatDateBase(date, pattern),
    formatDateTime: (date: Date | string) =>
      formatDateTimeBase(date, `${pattern} hh:mm a`),
  };
}
