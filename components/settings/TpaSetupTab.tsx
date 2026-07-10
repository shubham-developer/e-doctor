"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useApiQuery } from "@/lib/useApiQuery";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { FormDialog } from "@/components/common/FormDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, ColumnDef } from "@/components/ui/data-table";

interface TpaRecord {
  _id: string;
  name: string;
  code: string;
  type: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  empanelmentNo?: string;
  isActive: boolean;
}

const TYPE_OPTIONS = [
  { value: "PRIVATE", label: "Private Insurer" },
  { value: "PSU", label: "PSU Insurer" },
  { value: "GOVT", label: "Government Scheme" },
  { value: "SCHEME", label: "State Scheme" },
];

const TYPE_BADGE: Record<string, string> = {
  PRIVATE: "bg-blue-100 text-blue-700",
  PSU: "bg-purple-100 text-purple-700",
  GOVT: "bg-green-100 text-green-700",
  SCHEME: "bg-orange-100 text-orange-700",
};

export function TpaSetupTab() {
  const qc = useQueryClient();
  const { data, isFetching } = useApiQuery<TpaRecord[]>(["tpa-companies"], "/api/dashboard/tpa");
  const tpas = data ?? [];

  const [search, setSearch] = useState("");
  const filteredTpas = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tpas;
    return tpas.filter((t) =>
      [t.name, t.code, t.contactPerson, t.phone, t.email]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q)),
    );
  }, [tpas, search]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TpaRecord | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [type, setType] = useState("PRIVATE");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [empanelmentNo, setEmpanelmentNo] = useState("");
  const [isActive, setIsActive] = useState(true);

  function openAdd() {
    setEditing(null);
    setName(""); setCode(""); setType("PRIVATE");
    setContactPerson(""); setPhone(""); setEmail("");
    setAddress(""); setEmpanelmentNo(""); setIsActive(true);
    setOpen(true);
  }

  function openEdit(t: TpaRecord) {
    setEditing(t);
    setName(t.name); setCode(t.code); setType(t.type);
    setContactPerson(t.contactPerson ?? ""); setPhone(t.phone ?? "");
    setEmail(t.email ?? ""); setAddress(t.address ?? "");
    setEmpanelmentNo(t.empanelmentNo ?? ""); setIsActive(t.isActive);
    setOpen(true);
  }

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["tpa-companies"] });
  }

  async function handleSave() {
    if (!name.trim()) { toast.error("Name is required"); return; }
    if (!code.trim()) { toast.error("Code is required"); return; }
    setSaving(true);
    const body = { name, code, type, contactPerson, phone, email, address, empanelmentNo, isActive };
    const res = editing
      ? await apiClient.put(`/api/dashboard/tpa/${editing._id}`, body)
      : await apiClient.post("/api/dashboard/tpa", body);
    setSaving(false);
    if (!res.success) { toast.error(res.error ?? "Failed"); return; }
    toast.success(editing ? "TPA updated" : "TPA added");
    setOpen(false);
    invalidate();
  }

  async function handleDelete(t: TpaRecord) {
    if (!confirm(`Delete "${t.name}"?`)) return;
    const res = await apiClient.delete(`/api/dashboard/tpa/${t._id}`);
    if (!res.success) { toast.error(res.error ?? "Failed"); return; }
    toast.success("TPA deleted");
    invalidate();
  }

  async function toggleActive(t: TpaRecord) {
    await apiClient.put(`/api/dashboard/tpa/${t._id}`, { ...t, isActive: !t.isActive });
    invalidate();
  }

  const inp = "h-8 text-xs";

  const columns: ColumnDef<TpaRecord>[] = [
    {
      key: "name", header: "TPA / Insurer Name", sortable: true,
      render: (t) => (
        <div>
          <p className="text-xs font-medium text-gray-900">{t.name}</p>
          <p className="text-2xs text-gray-400">{t.empanelmentNo && `Emp: ${t.empanelmentNo}`}</p>
        </div>
      ),
    },
    {
      key: "code", header: "Code",
      render: (t) => <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{t.code}</span>,
    },
    {
      key: "type", header: "Type",
      render: (t) => (
        <span className={`text-2xs font-semibold px-1.5 py-0.5 rounded ${TYPE_BADGE[t.type] ?? "bg-gray-100 text-gray-600"}`}>
          {TYPE_OPTIONS.find((o) => o.value === t.type)?.label ?? t.type}
        </span>
      ),
    },
    {
      key: "contactPerson", header: "Contact Person",
      render: (t) => <span className="text-xs text-gray-600">{t.contactPerson || "—"}</span>,
    },
    {
      key: "phone", header: "Phone",
      render: (t) => <span className="text-xs text-gray-600">{t.phone || "—"}</span>,
    },
    {
      key: "email", header: "Email",
      render: (t) => <span className="text-xs text-gray-600">{t.email || "—"}</span>,
    },
    {
      key: "isActive", header: "Active", width: "w-20",
      render: (t) => <Switch checked={t.isActive} onCheckedChange={() => toggleActive(t)} />,
    },
    {
      key: "actions", header: "", width: "w-20", align: "right",
      render: (t) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon-sm" onClick={() => openEdit(t)} className="text-gray-400 hover:text-gray-600">
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(t)} className="text-gray-400 hover:text-danger-500">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={filteredTpas}
        rowKey={(t) => t._id}
        loading={isFetching}
        emptyText="No TPA / insurance companies added yet"
        wrapperClassName="flex-1 overflow-auto"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search name, code, contact…"
        toolbarRight={
          <Button size="sm" className="h-8 text-xs gap-1.5 bg-primary-600 hover:bg-primary-700" onClick={openAdd}>
            <Plus className="w-3.5 h-3.5" /> Add TPA
          </Button>
        }
        downloadable
        fileName="TPA-Companies"
      />

      <FormDialog
        open={open}
        onClose={() => !saving && setOpen(false)}
        title={editing ? "Edit TPA" : "Add TPA / Insurer"}
        contentClassName="sm:w-[min(92vw,560px)]"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button className="bg-primary-600 hover:bg-primary-700" onClick={handleSave} disabled={saving}>
              <Shield className="w-3.5 h-3.5 mr-1.5" />
              {saving ? "Saving…" : editing ? "Update" : "Add TPA"}
            </Button>
          </>
        }
      >
        <div className="px-5 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <Label className="text-xs text-gray-500">TPA / Insurer Name *</Label>
              <Input className={inp} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Star Health Insurance" />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Short Code *</Label>
              <Input className={inp} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. STAR" maxLength={10} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-gray-500">Type</Label>
              <Select value={type} onValueChange={(v) => setType(v ?? "PRIVATE")}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Empanelment No.</Label>
              <Input className={inp} value={empanelmentNo} onChange={(e) => setEmpanelmentNo(e.target.value)} placeholder="Hospital empanelment number" />
            </div>
          </div>

          <div className="border-t pt-3">
            <p className="text-2xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Contact Details</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-500">Contact Person</Label>
                <Input className={inp} value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} placeholder="Name" />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Phone</Label>
                <Input className={inp} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Email</Label>
                <Input className={inp} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Address</Label>
                <Input className={inp} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Office address" />
              </div>
            </div>
          </div>

          {editing && (
            <div className="flex items-center gap-2 pt-1">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <span className="text-xs text-gray-600">Active</span>
            </div>
          )}
        </div>
      </FormDialog>
    </>
  );
}
