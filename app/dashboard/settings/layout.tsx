"use client";

import { PageGuard } from "@/components/common/PageGuard";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PageGuard moduleKey="settings">{children}</PageGuard>;
}
