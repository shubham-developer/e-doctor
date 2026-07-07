"use client";

import { useState } from "react";
import { useApiQuery } from "@/lib/useApiQuery";
import { useRouter } from "next/navigation";
import {
  Users,
  LayoutGrid,
  List,
  Search,
  Plus,
  CalendarDays,
  Banknote,
  TreePalm,
  User,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { TabBar } from "@/components/common/TabBar";
import { TablePagination } from "@/components/common/TablePagination";
import { StaffModal } from "@/components/hr/StaffModal";
import { StaffCard } from "@/components/hr/StaffCard";
import { TodayAttendancePanel } from "@/components/hr/TodayAttendancePanel";
import type { CustomRole, StaffMember } from "@/components/hr/types";

export default function HRPage() {
  const router = useRouter();
  const [view, setView] = useState<"card" | "list">("card");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const limit = 100;

  const { data: rolesData } = useApiQuery<CustomRole[]>(
    ["roles"],
    "/api/dashboard/settings/roles",
    { staleTime: 5 * 60 * 1000 },
  );
  const roles = rolesData ?? [];

  const staffParams = new URLSearchParams({
    search,
    page: String(page),
    limit: String(limit),
    ...(roleFilter && { role: roleFilter }),
  });
  const {
    data: staffData,
    isPending: loading,
    refetch: fetchStaff,
  } = useApiQuery<{
    staff: StaffMember[];
    total: number;
    totalPages: number;
  }>(
    ["hr-staff", search, roleFilter, page],
    `/api/dashboard/hr?${staffParams}`,
    { keepPrevious: true },
  );
  const staff = staffData?.staff ?? [];
  const total = staffData?.total ?? 0;

  function handleSearch() {
    setSearch(searchInput);
    setPage(1);
  }

  function handleSaved() {
    fetchStaff();
  }

  const staffListColumns: ColumnDef<StaffMember>[] = [
    {
      key: "staffCode",
      header: "Staff ID",
      sortable: true,
      sortValue: (m) => m.staffCode,
      skeletonWidth: "w-12",
      render: (m) => (
        <span className="font-mono text-xs text-gray-500">{m.staffCode}</span>
      ),
    },
    {
      key: "name",
      header: "Name",
      sortable: true,
      sortValue: (m) => m.name,
      skeletonWidth: "w-36",
      render: (m) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
            {m.photoUrl ? (
              <img
                src={m.photoUrl}
                alt={m.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-4 h-4 text-gray-300" />
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-gray-900 whitespace-nowrap">
              {m.name}
            </p>
            {m.email && <p className="text-xs text-gray-400">{m.email}</p>}
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      sortable: true,
      sortValue: (m) => m.role,
      skeletonWidth: "w-20",
      render: (m) => (
        <div className="flex items-center gap-1.5">
          <span className="text-xs border border-gray-300 text-gray-600 px-1.5 py-0.5 rounded whitespace-nowrap">
            {m.role}
          </span>
          {m.customRoleId && (
            <span className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded flex items-center gap-0.5 whitespace-nowrap">
              <Shield className="w-2.5 h-2.5" />
              {m.customRoleId.name}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "designation",
      header: "Designation",
      sortable: true,
      sortValue: (m) => m.designation ?? "",
      skeletonWidth: "w-24",
      render: (m) => (
        <span className="text-xs text-gray-600">{m.designation || "—"}</span>
      ),
    },
    {
      key: "department",
      header: "Department",
      sortable: true,
      sortValue: (m) => m.department ?? "",
      skeletonWidth: "w-28",
      render: (m) => (
        <span className="text-xs text-gray-600">{m.department || "—"}</span>
      ),
    },
    {
      key: "floor",
      header: "Floor",
      skeletonWidth: "w-16",
      render: (m) => (
        <span className="text-xs text-gray-600">{m.floor || "—"}</span>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      skeletonWidth: "w-24",
      render: (m) => (
        <span className="text-xs font-mono text-gray-600">
          {m.phone || "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      skeletonWidth: "w-14",
      render: (m) => (
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${m.status === "active" ? "bg-success-50 text-success-700" : "bg-danger-50 text-danger-600"}`}
        >
          {m.status}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      skeletonWidth: "w-10",
      render: (m) => (
        <Button
          variant="outline"
          size="xs"
          onClick={(e) => {
            e.stopPropagation();
            setEditingStaff(m);
          }}
          className="text-primary-600 border-primary-200 hover:text-primary-800 hover:border-primary-400"
        >
          Edit
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 pt-4 pb-3 flex items-center gap-3 shrink-0">
        <h1 className="text-lg font-semibold text-gray-800">Staff Directory</h1>
        <div className="ml-auto flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setShowAdd(true)}
            className="bg-primary-600 hover:bg-primary-700 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add Staff
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/dashboard/hr/attendance")}
            className="flex items-center gap-1.5"
          >
            <CalendarDays className="w-4 h-4" /> Staff Attendance
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/dashboard/hr/payroll")}
            className="flex items-center gap-1.5"
          >
            <Banknote className="w-4 h-4" /> Payroll
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/dashboard/hr/leaves")}
            className="flex items-center gap-1.5"
          >
            <TreePalm className="w-4 h-4" /> Leaves
          </Button>
        </div>
      </div>

      {/* Today's attendance panel */}
      <TodayAttendancePanel />

      {/* Filters */}
      <div className="bg-white border-b px-6 py-4">
        <div className="grid grid-cols-2 gap-6 max-w-2xl">
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-1.5">
              Filter by Role
            </Label>
            <Select
              value={roleFilter || "__all"}
              onValueChange={(v) => {
                setRoleFilter(v === "__all" ? "" : (v ?? ""));
                setPage(1);
              }}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All Roles</SelectItem>
                {roles.map((r) => (
                  <SelectItem key={r._id} value={r.name}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-1.5">
              Search By Keyword
            </Label>
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search By Staff ID, Name, Role etc..."
              className="h-10"
            />
          </div>
        </div>
        <div className="mt-3 flex gap-3">
          <Button
            size="sm"
            onClick={handleSearch}
            className="bg-primary-600 hover:bg-primary-700 flex items-center gap-1.5"
          >
            <Search className="w-4 h-4" /> Search
          </Button>
          {(search || roleFilter) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("");
                setSearchInput("");
                setRoleFilter("");
                setPage(1);
              }}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* View toggle + count */}
      <div className="bg-white border-b px-6 py-2 flex items-center">
        <TabBar
          tabs={[
            { key: "card", label: "Card View", icon: LayoutGrid },
            { key: "list", label: "List View", icon: List },
          ]}
          active={view}
          onChange={setView}
        />
        <span className="ml-auto text-xs text-gray-400">{total} members</span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-gray-400">
            Loading…
          </div>
        ) : staff.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-gray-400">
            <Users className="w-10 h-10" />
            <p>No staff members found</p>
            <Button
              size="sm"
              onClick={() => setShowAdd(true)}
              className="bg-primary-600 hover:bg-primary-700 mt-1"
            >
              Add First Staff Member
            </Button>
          </div>
        ) : view === "card" ? (
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {staff.map((m) => (
              <StaffCard
                key={m._id}
                member={m}
                onClick={() => setEditingStaff(m)}
              />
            ))}
          </div>
        ) : (
          <DataTable<StaffMember>
            columns={staffListColumns}
            data={staff}
            rowKey={(m) => m._id}
            loading={loading}
            emptyText="No staff members found"
            onRowClick={(m) => setEditingStaff(m)}
            downloadable
            printable
            fileName="staff-directory"
          />
        )}

        <TablePagination
          page={page}
          total={total}
          limit={limit}
          onPageChange={setPage}
          itemLabel="staff members"
          className="mt-4"
        />
      </div>

      <StaffModal
        open={showAdd}
        roles={roles}
        onClose={() => setShowAdd(false)}
        onSaved={handleSaved}
      />
      <StaffModal
        open={!!editingStaff}
        staff={editingStaff}
        roles={roles}
        onClose={() => setEditingStaff(null)}
        onSaved={() => {
          handleSaved();
          setEditingStaff(null);
        }}
        onDeleted={() => {
          setEditingStaff(null);
          fetchStaff();
        }}
      />
    </div>
  );
}
