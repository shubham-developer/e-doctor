"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  Users,
  CalendarDays,
  ChevronRight,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { formatDate } from "@/lib/format";
import { apiClient } from "@/lib/apiClient";
import { CreateHospitalModal } from "@/components/admin/CreateHospitalModal";
import { AdminTenantListItem, AdminTenantStats } from "@/components/admin/types";

interface TenantsResponse {
  tenants: AdminTenantListItem[];
  stats: AdminTenantStats;
}

const PLAN_COLOR: Record<string, string> = {
  STARTER: "bg-gray-100 text-gray-700",
  GROWTH: "bg-primary-100 text-primary-700",
  PRO: "bg-warning-100 text-warning-700",
};

export default function AdminPage() {
  const [tenants, setTenants] = useState<AdminTenantListItem[]>([]);
  const [stats, setStats] = useState<AdminTenantStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  async function load() {
    const data = await apiClient.get<TenantsResponse>("/api/admin/tenants");
    if (data.success) {
      setTenants(data.data.tenants);
      setStats(data.data.stats);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.slug.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Hospital Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            All hospitals on the e-doctor platform
          </p>
        </div>
        <CreateHospitalModal onCreated={load} />
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.total}
                  </p>
                  <p className="text-xs text-gray-500">Total Hospitals</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-success-50 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-success-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.active}
                  </p>
                  <p className="text-xs text-gray-500">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-warning-50 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-warning-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.byPlan.PRO + stats.byPlan.GROWTH}
                  </p>
                  <p className="text-xs text-gray-500">Paid Plans</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-danger-50 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-danger-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.inactive}
                  </p>
                  <p className="text-xs text-gray-500">Suspended</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Plan breakdown */}
      {stats && (
        <div className="flex gap-3 flex-wrap">
          {(["STARTER", "GROWTH", "PRO"] as const).map((plan) => (
            <span
              key={plan}
              className={`px-3 py-1 rounded-full text-sm font-medium ${PLAN_COLOR[plan]}`}
            >
              {plan}: {stats.byPlan[plan]}
            </span>
          ))}
        </div>
      )}

      {/* Tenant list */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base flex-1">All Hospitals</CardTitle>
            <Input
              placeholder="Search by name, slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-64"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-50">
            {filtered.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">
                No hospitals found
              </p>
            )}
            {filtered.map((t) => (
              <Link
                key={t._id}
                href={`/admin/tenants/${t._id}`}
                className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors group"
              >
                <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-gray-900 truncate">
                      {t.name}
                    </p>
                    {!t.isActive && (
                      <span className="text-xs bg-danger-100 text-danger-600 px-1.5 py-0.5 rounded font-medium">
                        Suspended
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">{t.slug}</p>
                </div>
                <div className="hidden sm:flex items-center gap-6 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> {t.userCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <CalendarDays className="w-3.5 h-3.5" />{" "}
                    {t.appointmentCount}
                  </span>
                  <span className="text-gray-400">
                    {formatDate(t.createdAt)}
                  </span>
                </div>
                <Badge
                  className={`${PLAN_COLOR[t.plan]} border-0 text-xs shrink-0`}
                >
                  {t.plan}
                </Badge>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 shrink-0" />
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
