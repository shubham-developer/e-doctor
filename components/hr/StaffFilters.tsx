"use client";

import { Search, X, Plus, LayoutGrid, List } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TabBar } from "@/components/common/TabBar";
import { useRoles } from "@/lib/lookups";

export function StaffFilters({
  searchInput,
  onSearchInputChange,
  roleFilter,
  onRoleFilterChange,
  view,
  onViewChange,
  total,
  onAddStaff,
}: {
  searchInput: string;
  onSearchInputChange: (v: string) => void;
  roleFilter: string;
  onRoleFilterChange: (v: string) => void;
  view: "card" | "list";
  onViewChange: (v: "card" | "list") => void;
  total: number;
  onAddStaff: () => void;
}) {
  const { data: rolesData } = useRoles();
  const roles = rolesData ?? [];
  const hasFilters = !!searchInput || !!roleFilter;

  return (
    <div className="bg-white border-b px-6 py-2.5 flex items-center gap-2.5 flex-wrap">
      <div className="relative flex-1 min-w-48 max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <Input
          value={searchInput}
          onChange={(e) => onSearchInputChange(e.target.value)}
          placeholder="Search by staff ID, name, phone…"
          className="h-8 pl-8 text-xs"
        />
      </div>

      <Select
        value={roleFilter || "__all"}
        onValueChange={(v) => onRoleFilterChange(v === "__all" ? "" : (v ?? ""))}
      >
        <SelectTrigger className="h-8 text-xs w-40 shrink-0">
          <SelectValue>{roleFilter || "All Roles"}</SelectValue>
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

      {hasFilters && (
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs shrink-0"
          onClick={() => {
            onSearchInputChange("");
            onRoleFilterChange("");
          }}
        >
          <X className="w-3.5 h-3.5" />
          Clear
        </Button>
      )}

      <div className="ml-auto flex items-center gap-2.5 shrink-0">
        <TabBar
          tabs={[
            { key: "card", label: "Card", icon: LayoutGrid },
            { key: "list", label: "List", icon: List },
          ]}
          active={view}
          onChange={onViewChange}
        />
        <span className="text-xs text-gray-400">{total} members</span>
        <Button
          size="sm"
          onClick={onAddStaff}
          className="h-8 bg-primary-600 hover:bg-primary-700 flex items-center gap-1.5 text-xs"
        >
          <Plus className="w-3.5 h-3.5" /> Add Staff
        </Button>
      </div>
    </div>
  );
}
