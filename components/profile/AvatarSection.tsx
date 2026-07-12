"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Camera } from "lucide-react";
import { useApp } from "@/lib/context";

export function AvatarSection() {
  const { user, refetch } = useApp();
  const ref = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2 MB");
      e.target.value = "";
      return;
    }
    e.target.value = "";

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/dashboard/profile", {
        method: "PATCH",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Profile picture updated");
        refetch();
      } else {
        toast.error(data.error ?? "Failed to update profile picture");
      }
    } catch {
      toast.error("Failed to update profile picture");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 flex items-center gap-4">
      <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden shrink-0">
        {user?.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-primary-700 text-2xl font-semibold">
            {initials}
          </span>
        )}
      </div>
      <div>
        <h2 className="text-sm font-semibold text-gray-800">
          Profile Picture
        </h2>
        <p className="text-xs text-gray-400 mt-0.5">JPG or PNG, up to 2 MB</p>
        <button
          type="button"
          disabled={saving}
          onClick={() => ref.current?.click()}
          className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Camera className="w-3.5 h-3.5" />
          {saving ? "Uploading…" : "Change Photo"}
        </button>
        <input
          ref={ref}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />
      </div>
    </div>
  );
}
