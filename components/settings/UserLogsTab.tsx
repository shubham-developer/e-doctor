"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { TablePagination } from "@/components/common/TablePagination";
import {
  SearchableSelect,
  type SelectOption,
} from "@/components/ui/searchable-select";
import { useDateFormatter } from "@/lib/context";
import { useApiQuery } from "@/lib/useApiQuery";

interface ActivityLogRow {
  _id: string;
  userId?: string;
  userName: string;
  userRole: string;
  action: "login" | "logout" | "create" | "update" | "delete";
  module: string;
  description: string;
  link?: string;
  createdAt: string;
}

interface LogUser {
  _id: string;
  name: string;
  role: string;
}

const MODULE_OPTIONS: SelectOption[] = [
  { value: "auth", label: "Auth" },
  { value: "patients", label: "Patients" },
  { value: "opd", label: "OPD" },
  { value: "ipd", label: "IPD" },
  { value: "pharmacy", label: "Pharmacy" },
  { value: "pathology", label: "Pathology" },
  { value: "radiology", label: "Radiology" },
];

const ACTION_OPTIONS: SelectOption[] = [
  { value: "login", label: "Login" },
  { value: "logout", label: "Logout" },
  { value: "create", label: "Create" },
  { value: "update", label: "Update" },
  { value: "delete", label: "Delete" },
];

const ACTION_STYLES: Record<ActivityLogRow["action"], string> = {
  login: "bg-blue-50 text-blue-700",
  logout: "bg-gray-100 text-gray-600",
  create: "bg-success-50 text-success-700",
  update: "bg-amber-50 text-amber-700",
  delete: "bg-danger-50 text-danger-700",
};

function getLogColumns(
  formatDateTime: (date: Date | string) => string,
): ColumnDef<ActivityLogRow>[] {
  return [
    {
      key: "createdAt",
      header: "Date & Time",
      sortable: true,
      sortValue: (l) => new Date(l.createdAt),
      skeletonWidth: "w-32",
      csvValue: (l) => formatDateTime(l.createdAt),
      render: (l) => (
        <span className="text-xs whitespace-nowrap text-gray-600">
          {formatDateTime(l.createdAt)}
        </span>
      ),
    },
    {
      key: "user",
      header: "User",
      sortable: true,
      sortValue: (l) => l.userName,
      skeletonWidth: "w-28",
      csvValue: (l) => l.userName,
      render: (l) => (
        <div className="flex flex-col">
          <span className="text-xs font-medium text-gray-800">
            {l.userName || "—"}
          </span>
          {l.userRole && (
            <span className="text-2xs text-gray-400">{l.userRole}</span>
          )}
        </div>
      ),
    },
    {
      key: "action",
      header: "Action",
      skeletonWidth: "w-16",
      csvValue: (l) => l.action,
      render: (l) => (
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-2xs font-semibold uppercase tracking-wide",
            ACTION_STYLES[l.action] ?? "bg-gray-100 text-gray-600",
          )}
        >
          {l.action}
        </span>
      ),
    },
    {
      key: "module",
      header: "Module",
      skeletonWidth: "w-20",
      csvValue: (l) => l.module,
      render: (l) => (
        <span className="text-xs text-gray-600 capitalize">{l.module}</span>
      ),
    },
    {
      key: "description",
      header: "Description",
      skeletonWidth: "w-48",
      csvValue: (l) => l.description,
      render: (l) => (
        <span className="text-xs text-gray-800">{l.description}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "center",
      width: "w-12",
      skeletonWidth: "w-8",
      render: (l) =>
        l.link ? (
          <Link
            href={l.link}
            title="Open record"
            className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-primary-600"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        ) : null,
    },
  ];
}

export function UserLogsTab() {
  const { formatDateTime } = useDateFormatter();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [userId, setUserId] = useState("");
  const [module_, setModule] = useState("");
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);
  const limit = 50;

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isPending: loading } = useApiQuery<{
    logs: ActivityLogRow[];
    total: number;
    totalPages: number;
    users: LogUser[];
  }>(
    ["user-logs", search, userId, module_, action, page],
    `/api/dashboard/settings/user-logs?search=${encodeURIComponent(search)}&userId=${userId}&module=${module_}&action=${action}&page=${page}&limit=${limit}`,
    { keepPrevious: true },
  );

  const logs = data?.logs ?? [];
  const total = data?.total ?? 0;
  const userOptions: SelectOption[] = (data?.users ?? []).map((u) => ({
    value: u._id,
    label: u.name,
    sub: u.role,
  }));

  const columns = getLogColumns(formatDateTime);

  const filterTrigger = "h-8 text-xs px-2";

  return (
    <div className="space-y-3">
      <DataTable<ActivityLogRow>
        columns={columns}
        data={logs}
        rowKey={(l) => l._id}
        loading={loading}
        skeletonRows={10}
        emptyText="No activity recorded yet"
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Search user or description..."
        toolbarRight={
          <div className="flex items-center gap-1.5">
            <SearchableSelect
              value={userId}
              onValueChange={(v) => {
                setUserId(v);
                setPage(1);
              }}
              options={userOptions}
              placeholder="All users"
              className="w-36"
              triggerClassName={filterTrigger}
            />
            <SearchableSelect
              value={module_}
              onValueChange={(v) => {
                setModule(v);
                setPage(1);
              }}
              options={MODULE_OPTIONS}
              placeholder="All modules"
              className="w-32"
              triggerClassName={filterTrigger}
            />
            <SearchableSelect
              value={action}
              onValueChange={(v) => {
                setAction(v);
                setPage(1);
              }}
              options={ACTION_OPTIONS}
              placeholder="All actions"
              className="w-32"
              triggerClassName={filterTrigger}
            />
          </div>
        }
        downloadable
        printable
        fileName="user-logs"
      />

      <TablePagination
        page={page}
        total={total}
        limit={limit}
        onPageChange={setPage}
        itemLabel="log entries"
      />
    </div>
  );
}
