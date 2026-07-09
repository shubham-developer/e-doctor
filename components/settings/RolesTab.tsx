"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useApiQuery } from "@/lib/useApiQuery";
import { apiClient } from "@/lib/apiClient";
import { useApp } from "@/lib/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Plus,
  Save,
  Shield,
  Pencil,
  Check,
  X,
  Crown,
  Stethoscope,
  HeartPulse,
  Headset,
  Pill,
  FlaskConical,
  Wallet,
  Eye,
  type LucideIcon,
} from "lucide-react";
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

const ROLE_ICONS: Record<string, LucideIcon> = {
  owner: Crown,
  doctor: Stethoscope,
  nurse: HeartPulse,
  receptionist: Headset,
  pharmacist: Pill,
  "lab technician": FlaskConical,
  accountant: Wallet,
  viewer: Eye,
};

function roleIcon(name: string): LucideIcon {
  return ROLE_ICONS[name.toLowerCase()] ?? Shield;
}

export function RolesTab() {
  const { user } = useApp();
  const isOwner = user?.role === "OWNER";

  const [selected, setSelected] = useState<Role | null>(null);
  const [perms, setPerms] = useState<Permissions>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const [addName, setAddName] = useState("");
  const [adding, setAdding] = useState(false);

  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState("");

  const { data: rolesData, isPending: loading } = useApiQuery<Role[]>(
    ["roles"],
    "/api/dashboard/settings/roles",
  );
  const roles = rolesData ?? [];

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["roles"] });
  }

  function selectRole(role: Role) {
    setSelected(role);
    setPerms(role.permissions ?? {});
    setDirty(false);
    setRenaming(false);
  }

  // Auto-select the first role once the list arrives
  useEffect(() => {
    if (!selected && roles.length > 0) selectRole(roles[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roles]);

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
    const res = await apiClient.patch(
      `/api/dashboard/settings/roles/${selected._id}`,
      { permissions: perms },
    );
    if (res.success) {
      toast.success("Permissions saved");
      setDirty(false);
      invalidate();
    } else {
      toast.error(res.error ?? "Failed to save");
    }
    setSaving(false);
  }

  async function addRole() {
    if (!addName.trim()) return;
    setAdding(true);
    const res = await apiClient.post<Role>("/api/dashboard/settings/roles", {
      name: addName.trim(),
    });
    if (res.success) {
      toast.success(`Role "${addName}" created`);
      setAddName("");
      invalidate();
      selectRole(res.data);
    } else {
      toast.error(res.error ?? "Failed to create role");
    }
    setAdding(false);
  }

  async function deleteRole(role: Role) {
    const res = await apiClient.delete(
      `/api/dashboard/settings/roles/${role._id}`,
    );
    if (res.success) {
      toast.success("Role deleted");
      if (selected?._id === role._id) setSelected(null);
      invalidate();
    } else {
      toast.error(res.error ?? "Failed to delete role");
    }
  }

  async function renameRole() {
    if (!selected || !newName.trim()) return;
    const res = await apiClient.patch(
      `/api/dashboard/settings/roles/${selected._id}`,
      { name: newName.trim() },
    );
    if (res.success) {
      toast.success("Role renamed");
      setRenaming(false);
      invalidate();
    } else {
      toast.error(res.error ?? "Failed to rename role");
    }
  }

  const rowChecked = (moduleKey: string) =>
    COLS.every((c) => perms[moduleKey]?.[c] === true);

  if (loading) {
    return (
      <div className="border border-gray-200 rounded-lg bg-white p-5 space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    );
  }

  const SelectedIcon = selected ? roleIcon(selected.name) : Shield;

  return (
    <div className="flex border border-gray-200 rounded-lg bg-white overflow-hidden min-h-130">
      {/* Sidebar — role list */}
      <div className="w-72 shrink-0 border-r border-gray-100 flex flex-col">
        <div className="px-4 py-3.5 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">Roles</h2>
        </div>

        <div className="flex-1 overflow-y-auto py-1.5">
          {roles.map((role) => {
            const Icon = roleIcon(role.name);
            const isSelected = selected?._id === role._id;
            return (
              <div
                key={role._id}
                className={`group flex items-center gap-2.5 mx-1.5 my-0.5 px-2.5 py-2 rounded-md cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-primary-50 text-primary-700"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
                onClick={() => selectRole(role)}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isSelected ? "text-primary-600" : "text-gray-400"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold truncate">
                      {role.name}
                    </span>
                    {role.isSystem && (
                      <span className="text-2xs font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded uppercase tracking-wide shrink-0">
                        System
                      </span>
                    )}
                  </div>
                  {role.description && (
                    <p className="text-2xs text-gray-400 truncate mt-0.5">
                      {role.description}
                    </p>
                  )}
                </div>
                {!role.isSystem && isOwner && (
                  <AlertDialog>
                    <AlertDialogTrigger
                      render={
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 text-gray-300 hover:text-danger-500 hover:bg-danger-50 transition-colors"
                        />
                      }
                    >
                      <X className="w-3.5 h-3.5" />
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Delete role &quot;{role.name}&quot;?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This role will be permanently removed. Any users
                          assigned to it will need to be reassigned.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-danger-600 hover:bg-danger-700"
                          onClick={() => deleteRole(role)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            );
          })}
        </div>

        {isOwner && (
          <div className="p-3 border-t border-gray-100 flex gap-1.5">
            <Input
              placeholder="New role name"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addRole()}
              className="h-8 text-xs"
            />
            <Button
              size="sm"
              className="h-8 px-2.5 bg-primary-600 hover:bg-primary-700 shrink-0"
              onClick={addRole}
              disabled={adding || !addName.trim()}
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Detail panel — permissions matrix */}
      <div className="flex-1 min-w-0 flex flex-col">
        {selected ? (
          <>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2">
                  {renaming ? (
                    <div className="flex items-center gap-1.5">
                      <Input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") renameRole();
                          if (e.key === "Escape") setRenaming(false);
                        }}
                        className="h-8 text-sm w-48"
                        autoFocus
                      />
                      <button
                        onClick={renameRole}
                        className="p-1.5 rounded-md bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setRenaming(false)}
                        className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <SelectedIcon className="w-4 h-4 text-primary-500" />
                      <h2 className="text-sm font-semibold text-gray-800">
                        {selected.name}
                      </h2>
                      {selected.isSystem && (
                        <span className="text-2xs font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded uppercase tracking-wide">
                          System
                        </span>
                      )}
                      {isOwner && !selected.isSystem && (
                        <button
                          onClick={() => {
                            setNewName(selected.name);
                            setRenaming(true);
                          }}
                          className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </>
                  )}
                </div>
                {selected.description && !renaming && (
                  <p className="text-xs text-gray-400 mt-1">
                    {selected.description}
                  </p>
                )}
              </div>

              {dirty && (
                <Button
                  size="sm"
                  className="h-8 bg-primary-600 hover:bg-primary-700 gap-1.5 text-xs shrink-0"
                  onClick={save}
                  disabled={saving}
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving ? "Saving…" : "Save Changes"}
                </Button>
              )}
            </div>

            <div className="overflow-auto flex-1">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 sticky top-0">
                    <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Module
                    </th>
                    <th className="py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center w-16">
                      All
                    </th>
                    {COLS.map((col) => (
                      <th
                        key={col}
                        className="py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center w-16"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MODULES.map((mod, i) => {
                    const allChecked = rowChecked(mod.key);
                    return (
                      <tr
                        key={mod.key}
                        className={`border-b border-gray-100 transition-colors ${
                          i % 2 === 0
                            ? "bg-white hover:bg-gray-50/70"
                            : "bg-gray-50/30 hover:bg-gray-100/60"
                        }`}
                      >
                        <td className="py-3 px-5 text-sm text-gray-700 font-medium">
                          {mod.label}
                        </td>

                        <td className="py-3 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={allChecked}
                            onChange={(e) =>
                              toggleRow(mod.key, e.target.checked)
                            }
                            disabled={!isOwner || selected.isSystem}
                            className="w-4 h-4 rounded accent-primary-600 cursor-pointer disabled:cursor-default"
                          />
                        </td>

                        {COLS.map((col) => (
                          <td key={col} className="py-3 px-3 text-center">
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
              <p className="px-5 py-3 text-xs text-gray-400 border-t border-gray-100">
                System roles cannot be modified.
              </p>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-gray-400">
              Select a role to manage its permissions
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
