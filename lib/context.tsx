"use client";

import { useEffect, ReactNode, useCallback } from "react";
import { NextIntlClientProvider } from "next-intl";
import enMessages from "@/messages/en.json";
import hiMessages from "@/messages/hi.json";
import {
  formatDate as formatDateBase,
  formatDateTime as formatDateTimeBase,
  toDateFnsPattern,
} from "@/lib/format";
import {
  useAppStore,
  migrateLegacyLang,
  type PermCol,
} from "@/lib/store/appStore";

export function AppProvider({ children }: { children: ReactNode }) {
  const lang = useAppStore((s) => s.lang);

  useEffect(() => {
    migrateLegacyLang();
    useAppStore.persist.rehydrate();
    useAppStore.getState().fetchMe();
  }, []);

  const messages = lang === "hi" ? hiMessages : enMessages;

  return (
    <NextIntlClientProvider
      locale={lang}
      messages={messages}
      onError={() => {}}
    >
      {children}
    </NextIntlClientProvider>
  );
}

export function useApp() {
  const user = useAppStore((s) => s.user);
  const tenant = useAppStore((s) => s.tenant);
  const lang = useAppStore((s) => s.lang);
  const loading = useAppStore((s) => s.loading);
  const setLang = useAppStore((s) => s.setLang);
  const fetchMe = useAppStore((s) => s.fetchMe);

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

  return { user, tenant, lang, setLang, loading, refetch: fetchMe, can };
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
  const tenant = useAppStore((s) => s.tenant);
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
  const tenant = useAppStore((s) => s.tenant);
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
