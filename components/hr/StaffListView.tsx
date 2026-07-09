"use client";

import { Users, User, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { TablePagination } from "@/components/common/TablePagination";
import { StaffCard } from "./StaffCard";
import type { StaffMember } from "./types";

export function StaffListView({
  staff,
  total,
  loading,
  view,
  page,
  limit,
  onPageChange,
  onAddFirst,
  onEdit,
}: {
  staff: StaffMember[];
  total: number;
  loading: boolean;
  view: "card" | "list";
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onAddFirst: () => void;
  onEdit: (member: StaffMember) => void;
}) {
  const columns: ColumnDef<StaffMember>[] = [
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
            onEdit(m);
          }}
          className="text-primary-600 border-primary-200 hover:text-primary-800 hover:border-primary-400"
        >
          Edit
        </Button>
      ),
    },
  ];

  return (
    <div className="flex-1 overflow-auto py-4">
      {view === "list" ? (
        <DataTable<StaffMember>
          columns={columns}
          data={staff}
          rowKey={(m) => m._id}
          loading={loading}
          emptyText="No staff members found"
          onRowClick={onEdit}
          downloadable
          printable
          fileName="staff-directory"
        />
      ) : (
        <div className="border border-gray-200 bg-white px-6 py-4">
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
                onClick={onAddFirst}
                className="bg-primary-600 hover:bg-primary-700 mt-1"
              >
                Add First Staff Member
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              {staff.map((m) => (
                <StaffCard key={m._id} member={m} onClick={() => onEdit(m)} />
              ))}
            </div>
          )}
        </div>
      )}

      <TablePagination
        page={page}
        total={total}
        limit={limit}
        onPageChange={onPageChange}
        itemLabel="staff members"
        className="mt-4"
      />
    </div>
  );
}
