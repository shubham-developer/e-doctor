"use client";

import { NextIntlClientProvider } from "next-intl";
import enMessages from "@/messages/en.json";
import { Toaster } from "@/components/ui/sonner";

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NextIntlClientProvider
      locale="en"
      messages={enMessages}
      onError={() => {}}
    >
      {children}
      <Toaster richColors position="top-right" />
    </NextIntlClientProvider>
  );
}
