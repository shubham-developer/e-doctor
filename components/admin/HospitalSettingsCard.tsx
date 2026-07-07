"use client";

import { useState } from "react";
import { toast } from "sonner";
import { apiClient } from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  APP_MODULES,
  ALL_MODULE_KEYS,
  CORE_MODULE_KEYS,
} from "@/lib/constants/modules";
import { AdminTenant } from "./types";

interface HospitalSettingsCardProps {
  tenant: AdminTenant;
  onSaved: () => void;
}

export function HospitalSettingsCard({
  tenant,
  onSaved,
}: HospitalSettingsCardProps) {
  const [name, setName] = useState(tenant.name);
  const [address, setAddress] = useState(tenant.address ?? "");
  const [plan, setPlan] = useState<string>(tenant.plan);
  const [planExpiresAt, setPlanExpiresAt] = useState(
    tenant.planExpiresAt ? tenant.planExpiresAt.slice(0, 10) : "",
  );
  // Tenants created before module gating have no list — that means all enabled
  const [enabledModules, setEnabledModules] = useState<string[]>(
    tenant.enabledModules?.length ? tenant.enabledModules : [...ALL_MODULE_KEYS],
  );
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const data = await apiClient.patch(`/api/admin/tenants/${tenant._id}`, {
      name,
      address,
      plan,
      planExpiresAt,
      enabledModules,
    });
    if (data.success) {
      toast.success("Hospital updated");
      onSaved();
    } else {
      toast.error(data.error ?? "Failed to update hospital");
    }
    setSaving(false);
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Hospital Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Hospital Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Address</Label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="City, State"
              className="h-10"
            />
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Plan</Label>
            <Select value={plan} onValueChange={(v) => v && setPlan(v)}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="STARTER">Starter</SelectItem>
                <SelectItem value="GROWTH">Growth</SelectItem>
                <SelectItem value="PRO">Pro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Plan Expiry</Label>
            <Input
              type="date"
              value={planExpiresAt}
              onChange={(e) => setPlanExpiresAt(e.target.value)}
              className="h-10"
            />
          </div>
        </div>

        <Separator />

        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Modules
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            Only the selected modules are available to this hospital&apos;s
            users.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5">
          {APP_MODULES.map((mod) => {
            const isCore = CORE_MODULE_KEYS.includes(mod.key);
            return (
              <label
                key={mod.key}
                className={`flex items-center gap-2 text-sm ${
                  isCore ? "text-gray-400" : "text-gray-700 cursor-pointer"
                }`}
              >
                <Checkbox
                  checked={isCore || enabledModules.includes(mod.key)}
                  disabled={isCore}
                  onCheckedChange={(checked) =>
                    setEnabledModules((prev) =>
                      checked
                        ? [...prev, mod.key]
                        : prev.filter((k) => k !== mod.key),
                    )
                  }
                />
                {mod.label}
              </label>
            );
          })}
        </div>

        <Button
          className="bg-indigo-600 hover:bg-indigo-700 w-full sm:w-auto"
          onClick={save}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </CardContent>
    </Card>
  );
}
