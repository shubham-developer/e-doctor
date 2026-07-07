"use client";

import { useState } from "react";
import NextTopLoader from "nextjs-toploader";
import { AppProvider } from "@/lib/context";
import { QueryProvider } from "@/lib/queryProvider";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { MobileNav } from "@/components/layout/MobileNav";
import { ModuleGuard } from "@/components/layout/ModuleGuard";
import { Toaster } from "@/components/ui/sonner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AppProvider>
      <QueryProvider>
        <NextTopLoader color="#2563eb" height={3} showSpinner={false} />
        <div className="flex h-screen bg-gray-50 overflow-hidden">
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
            <Topbar onMenuClick={() => setSidebarOpen(true)} />
            <main className="flex-1 overflow-y-auto p-2 lg:p-4 pb-20 lg:pb-4">
              <ModuleGuard>{children}</ModuleGuard>
            </main>
          </div>
          <MobileNav />
        </div>
        <Toaster richColors position="top-right" />
      </QueryProvider>
    </AppProvider>
  );
}
