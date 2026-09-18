"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiClient } from "@/lib/apiClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Users,
  CalendarDays,
  Stethoscope,
  CheckCircle2,
  UserCog,
  UsersRound,
  XCircle,
} from "lucide-react";
import { formatDate } from "@/lib/format";
import { HospitalSettingsCard } from "@/components/admin/HospitalSettingsCard";
import { HospitalTeamCard } from "@/components/admin/HospitalTeamCard";
import { AdminTenant, AdminTenantUser } from "@/components/admin/types";

const PLAN_COLOR: Record<string, string> = {
  STARTER: "bg-gray-100 text-gray-700",
  GROWTH: "bg-primary-100 text-primary-700",
  PRO: "bg-warning-100 text-warning-700",
};

interface TenantDetail {
  tenant: AdminTenant;
  users: AdminTenantUser[];
  doctorCount: number;
  appointmentCount: number;
  patientCount: number;
  staffCount: number;
}

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [tenant, setTenant] = useState<AdminTenant | null>(null);
  const [users, setUsers] = useState<AdminTenantUser[]>([]);
  const [doctorCount, setDoctorCount] = useState(0);
  const [appointmentCount, setAppointmentCount] = useState(0);
  const [patientCount, setPatientCount] = useState(0);
  const [staffCount, setStaffCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const data = await apiClient.get<TenantDetail>(`/api/admin/tenants/${id}`);
    if (data.success) {
      setTenant(data.data.tenant);
      setUsers(data.data.users);
      setDoctorCount(data.data.doctorCount);
      setAppointmentCount(data.data.appointmentCount);
      setPatientCount(data.data.patientCount);
      setStaffCount(data.data.staffCount);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleActive() {
    const data = await apiClient.patch(`/api/admin/tenants/${id}`, {
      isActive: !tenant?.isActive,
    });
    if (data.success) {
      toast.success(
        tenant?.isActive ? "Hospital suspended" : "Hospital activated",
      );
      load();
    } else {
      toast.error(data.error ?? "Failed to update hospital");
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 max-w-3xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!tenant) return <p className="text-gray-500">Hospital not found</p>;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900 truncate">
              {tenant.name}
            </h1>
            <Badge className={`${PLAN_COLOR[tenant.plan]} border-0`}>
              {tenant.plan}
            </Badge>
            {tenant.isActive ? (
              <span className="flex items-center gap-1 text-xs text-success-600">
                <CheckCircle2 className="w-3.5 h-3.5" /> Active
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-danger-500">
                <XCircle className="w-3.5 h-3.5" /> Suspended
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400">
            {tenant.slug} · Created {formatDate(tenant.createdAt)}
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <button
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  tenant.isActive
                    ? "bg-danger-50 text-danger-600 hover:bg-danger-100"
                    : "bg-success-50 text-success-700 hover:bg-success-100"
                }`}
              >
                {tenant.isActive ? "Suspend" : "Activate"}
              </button>
            }
          />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {tenant.isActive
                  ? "Suspend this hospital?"
                  : "Activate this hospital?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {tenant.isActive
                  ? "The hospital owner and all users will lose access immediately."
                  : "The hospital and its users will regain access."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className={
                  tenant.isActive
                    ? "bg-danger-600 hover:bg-danger-700"
                    : "bg-success-600 hover:bg-success-700"
                }
                onClick={toggleActive}
              >
                {tenant.isActive ? "Yes, suspend" : "Yes, activate"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          {
            label: "Patients",
            value: patientCount,
            icon: UsersRound,
            color: "bg-success-50 text-success-600",
          },
          {
            label: "Doctors",
            value: doctorCount,
            icon: Stethoscope,
            color: "bg-primary-50 text-primary-600",
          },
          {
            label: "Staff",
            value: staffCount,
            icon: UserCog,
            color: "bg-purple-50 text-purple-600",
          },
          {
            label: "Team Members",
            value: users.length,
            icon: Users,
            color: "bg-indigo-50 text-indigo-600",
          },
          {
            label: "Appointments",
            value: appointmentCount,
            icon: CalendarDays,
            color: "bg-warning-50 text-warning-600",
          },
        ].map((s) => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.color}`}
                >
                  <s.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <HospitalSettingsCard key={tenant._id} tenant={tenant} onSaved={load} />

      <HospitalTeamCard users={users} />
    </div>
  );
}
