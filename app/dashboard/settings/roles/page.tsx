"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useApp } from "@/lib/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Save, Shield, Trash2, Pencil, Check, X } from "lucide-react";
import { APP_MODULES as MODULES } from "@/lib/constants/modules";

type PermCol = "view" | "add" | "edit" | "delete";
type ModulePerms = Partial<Record<PermCol, boolean>>;
type Permissions = Record<string, ModulePerms>;

interface Role {
  _id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  permissions: Permissions;
}

const COLS: PermCol[] = ["view", "add", "edit", "delete"];

export default function RolesPage() {
  const { user } = useApp();
  const isOwner = user?.role === "OWNER";

  const [roles, setRoles] = useState<Role[]>([]);
  const [selected, setSelected] = useState<Role | null>(null);
  const [perms, setPerms] = useState<Permissions>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // add role state
  const [addName, setAddName] = useState("");
  const [adding, setAdding] = useState(false);

  // rename state
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState("");

  async function fetchRoles() {
    const res = await fetch("/api/dashboard/settings/roles");
    const data = await res.json();
    if (data.success) {
      setRoles(data.data);
      if (!selected && data.data.length > 0) selectRole(data.data[0]);
    }
    setLoading(false);
  }

  function selectRole(role: Role) {
    setSelected(role);
    setPerms(role.permissions ?? {});
    setDirty(false);
    setRenaming(false);
  }

  useEffect(() => {
    fetchRoles();
  }, []);

  function toggle(moduleKey: string, col: PermCol) {
    if (!isOwner || selected?.isSystem) return;
    setPerms((prev) => {
      const current = prev[moduleKey]?.[col] ?? false;
      return { ...prev, [moduleKey]: { ...prev[moduleKey], [col]: !current } };
    });
    setDirty(true);
  }

  function toggleRow(moduleKey: string, checked: boolean) {
    if (!isOwner || selected?.isSystem) return;
    setPerms((prev) => ({
      ...prev,
      [moduleKey]: checked
        ? { view: true, add: true, edit: true, delete: true }
        : { view: false, add: false, edit: false, delete: false },
    }));
    setDirty(true);
  }

  async function save() {
    if (!selected) return;
    setSaving(true);
    const res = await fetch(`/api/dashboard/settings/roles/${selected._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissions: perms }),
    });
    const data = await res.json();
    if (data.success) {
      toast.success("Permissions saved");
      setDirty(false);
      fetchRoles();
    } else {
      toast.error(data.error ?? "Failed to save");
    }
    setSaving(false);
  }

  async function addRole() {
    if (!addName.trim()) return;
    setAdding(true);
    const res = await fetch("/api/dashboard/settings/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: addName.trim() }),
    });
    const data = await res.json();
    if (data.success) {
      toast.success(`Role "${addName}" created`);
      setAddName("");
      await fetchRoles();
      selectRole(data.data);
    } else {
      toast.error(data.error ?? "Failed");
    }
    setAdding(false);
  }

  async function deleteRole(role: Role) {
    if (role.isSystem) return;
    if (!confirm(`Delete role "${role.name}"?`)) return;
    const res = await fetch(`/api/dashboard/settings/roles/${role._id}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (data.success) {
      toast.success("Role deleted");
      setSelected(null);
      fetchRoles();
    } else {
      toast.error(data.error ?? "Failed");
    }
  }

  async function renameRole() {
    if (!selected || !newName.trim()) return;
    const res = await fetch(`/api/dashboard/settings/roles/${selected._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    const data = await res.json();
    if (data.success) {
      toast.success("Renamed");
      setRenaming(false);
      fetchRoles();
    } else {
      toast.error(data.error ?? "Failed");
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const rowChecked = (moduleKey: string) =>
    COLS.every((c) => perms[moduleKey]?.[c] === true);

  return (
    <div className="max-w-3xl space-y-4">
      {/* Role tabs */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">Roles</h2>
        </div>

        <div className="flex flex-wrap gap-2">
          {roles.map((role) => (
            <button
              key={role._id}
              onClick={() => selectRole(role)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                selected?._id === role._id
                  ? "bg-primary-600 text-white border-primary-600"
                  : "bg-white text-gray-600 border-gray-200 hover:border-primary-300"
              }`}
            >
              <Shield className="w-3 h-3" />
              {role.name}
              {!role.isSystem && isOwner && selected?._id !== role._id && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteRole(role);
                  }}
                  className="ml-1 text-gray-400 hover:text-danger-500"
                >
                  <X className="w-3 h-3" />
                </span>
              )}
            </button>
          ))}

          {isOwner && (
            <div className="flex items-center gap-1">
              <Input
                placeholder="New role name"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addRole()}
                className="h-8 text-xs w-36"
              />
              <Button
                size="sm"
                className="h-8 px-2 bg-primary-600 hover:bg-primary-700"
                onClick={addRole}
                disabled={adding || !addName.trim()}
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Permissions table */}
      {selected && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              {renaming ? (
                <div className="flex items-center gap-1.5">
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && renameRole()}
                    className="h-7 text-xs w-40"
                    autoFocus
                  />
                  <button
                    onClick={renameRole}
                    className="text-primary-600 hover:text-primary-700"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setRenaming(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <Shield className="w-4 h-4 text-primary-500" />
                  <span className="text-sm font-semibold text-gray-800">
                    {selected.name}
                  </span>
                  {selected.isSystem && (
                    <span className="text-2xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                      system
                    </span>
                  )}
                  {isOwner && !selected.isSystem && (
                    <button
                      onClick={() => {
                        setNewName(selected.name);
                        setRenaming(true);
                      }}
                      className="text-gray-400 hover:text-gray-700 ml-1"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                </>
              )}
            </div>

            {dirty && (
              <Button
                size="sm"
                className="h-8 bg-primary-600 hover:bg-primary-700 gap-1.5 text-xs"
                onClick={save}
                disabled={saving}
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? "Saving…" : "Save Changes"}
              </Button>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 w-full">
                    Module
                  </th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 text-center w-16">
                    All
                  </th>
                  {COLS.map((col) => (
                    <th
                      key={col}
                      className="px-4 py-2.5 text-xs font-semibold text-gray-500 text-center w-16 capitalize"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {MODULES.map((mod) => {
                  const allChecked = rowChecked(mod.key);
                  return (
                    <tr
                      key={mod.key}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-gray-700 font-medium">
                        {mod.label}
                      </td>

                      {/* Select all toggle */}
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={allChecked}
                          onChange={(e) => toggleRow(mod.key, e.target.checked)}
                          disabled={!isOwner || selected.isSystem}
                          className="w-4 h-4 rounded accent-primary-600 cursor-pointer disabled:cursor-default"
                        />
                      </td>

                      {COLS.map((col) => (
                        <td key={col} className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={!!perms[mod.key]?.[col]}
                            onChange={() => toggle(mod.key, col)}
                            disabled={!isOwner || selected.isSystem}
                            className="w-4 h-4 rounded accent-primary-600 cursor-pointer disabled:cursor-default"
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {selected.isSystem && (
            <p className="px-4 py-3 text-xs text-gray-400 border-t border-gray-100">
              System roles cannot be modified.
            </p>
          )}
        </div>
      )}

      {!selected && !loading && (
        <div className="text-center py-12 text-gray-400 text-sm">
          Select a role above to manage its permissions
        </div>
      )}
    </div>
  );
}
