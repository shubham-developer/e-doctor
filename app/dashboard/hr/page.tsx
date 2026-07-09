"use client";

import { useState, useEffect } from "react";
import { useApiQuery } from "@/lib/useApiQuery";
import { StaffModal } from "@/components/hr/StaffModal";
import { StaffFilters } from "@/components/hr/StaffFilters";
import { StaffListView } from "@/components/hr/StaffListView";
import type { StaffMember } from "@/components/hr/types";

export default function HRPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState(""); // debounced — drives the fetch
  const [roleFilter, setRoleFilter] = useState("");
  const [view, setView] = useState<"card" | "list">("card");
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const limit = 100;

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setSearch(searchInput);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

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

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <StaffFilters
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        roleFilter={roleFilter}
        onRoleFilterChange={(v) => {
          setRoleFilter(v);
          setPage(1);
        }}
        view={view}
        onViewChange={setView}
        total={total}
        onAddStaff={() => setShowAdd(true)}
      />

      <StaffListView
        staff={staff}
        total={total}
        loading={loading}
        view={view}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onAddFirst={() => setShowAdd(true)}
        onEdit={setEditingStaff}
      />

      <StaffModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSaved={() => fetchStaff()}
      />
      <StaffModal
        open={!!editingStaff}
        staff={editingStaff}
        onClose={() => setEditingStaff(null)}
        onSaved={() => {
          fetchStaff();
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
