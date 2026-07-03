"use client";
import { PageGuard } from "@/components/common/PageGuard";
export default function Layout({ children }: { children: React.ReactNode }) {
  return <PageGuard moduleKey="billing">{children}</PageGuard>;
}
