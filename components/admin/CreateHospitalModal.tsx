"use client";

import { useState } from "react";
import { toast } from "sonner";
import { apiClient } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";

interface CreateHospitalModalProps {
  onCreated: () => void;
}

export function CreateHospitalModal({ onCreated }: CreateHospitalModalProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [plan, setPlan] = useState("STARTER");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [creating, setCreating] = useState(false);

  async function create() {
    if (!name || !slug || !ownerName || !ownerEmail || !ownerPassword) {
      toast.error("All fields are required");
      return;
    }
    setCreating(true);
    const data = await apiClient.post("/api/admin/tenants", {
      name,
      slug,
      plan,
      ownerName,
      ownerEmail,
      ownerPassword,
    });
    if (data.success) {
      toast.success("Hospital created");
      setOpen(false);
      setName("");
      setSlug("");
      setPlan("STARTER");
      setOwnerName("");
      setOwnerEmail("");
      setOwnerPassword("");
      onCreated();
    } else {
      toast.error(data.error ?? "Failed to create hospital");
    }
    setCreating(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4" />
            New Hospital
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Hospital</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Hospital Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter hospital name"
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Slug</Label>
              <Input
                value={slug}
                onChange={(e) =>
                  setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))
                }
                placeholder="Enter slug"
                className="h-10"
              />
            </div>
          </div>
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
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-1">
            Owner Account
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Owner Name</Label>
              <Input
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Enter owner name"
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Owner Email</Label>
              <Input
                type="email"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                placeholder="Enter owner email"
                className="h-10"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Temporary Password</Label>
            <Input
              type="text"
              value={ownerPassword}
              onChange={(e) => setOwnerPassword(e.target.value)}
              placeholder="Enter temporary password"
              className="h-10"
            />
          </div>
          <Button
            className="w-full bg-indigo-600 hover:bg-indigo-700"
            onClick={create}
            disabled={creating}
          >
            {creating ? "Creating..." : "Create Hospital"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
