"use client";

import { useState } from "react";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/apiClient";

export function PasswordSection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!currentPassword) {
      toast.error("Enter your current password");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    setSaving(true);
    const res = await apiClient.post("/api/dashboard/profile/change-password", {
      currentPassword,
      newPassword,
    });
    setSaving(false);
    if (res.success) {
      toast.success("Password updated");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      toast.error(res.error ?? "Failed to update password");
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
        <KeyRound className="w-4 h-4 text-primary-500" />
        Change Password
      </h2>
      <div className="mt-3 space-y-3 max-w-sm">
        <div>
          <Label className="text-xs font-medium text-gray-700 mb-1">
            Current Password
          </Label>
          <Input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="h-9"
          />
        </div>
        <div>
          <Label className="text-xs font-medium text-gray-700 mb-1">
            New Password
          </Label>
          <Input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="h-9"
            placeholder="Min 6 characters"
          />
        </div>
        <div>
          <Label className="text-xs font-medium text-gray-700 mb-1">
            Confirm New Password
          </Label>
          <Input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="h-9"
          />
        </div>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving}
          className="bg-primary-600 hover:bg-primary-700"
        >
          {saving ? "Updating…" : "Update Password"}
        </Button>
      </div>
    </div>
  );
}
