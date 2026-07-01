"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useApp, useCurrency } from "@/lib/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Users,
  ChevronLeft,
  ChevronRight,
  ClipboardPlus,
  Trash2,
  MoreVertical,
  Info,
  Download,
} from "lucide-react";
import { printOpdReceipt } from "@/components/patients/OpdReceiptPrinter";
import {
  PatientForm,
  type PatientFormData,
} from "@/components/patients/PatientForm";
import { todayString, formatDate } from "@/lib/format";

interface Patient {
  _id: string;
  patientCode?: number;
  name: string;
  guardianName?: string;
  gender?: string;
  dateOfBirth?: string;
  age: number;
  ageMonths?: number;
  ageDays?: number;
  bloodGroup?: string;
  maritalStatus?: string;
  phone?: string;
  email?: string;
  address?: string;
  remarks?: string;
  allergies?: string;
  tpa?: string;
  tpaId?: string;
  tpaValidity?: string;
  nationalId?: string;
  alternateNumber?: string;
  isDead?: boolean;
  languagePref: "hi" | "en";
  createdAt: string;
}

interface Doctor {
  _id: string;
  name: string;
  specialization: string;
}

interface ChargeCategory {
  _id: string;
  name: string;
  defaultFee: number;
  isActive: boolean;
}

interface ChargeLine {
  categoryId: string;
  name: string;
  fee: string;
}

const PAGE_SIZE_OPTIONS = ["25", "50", "100"];

// ── OPD form ───────────────────────────────────────────────────────────────

function OpdForm({
  patient,
  onClose,
}: {
  patient: Patient;
  onClose: () => void;
}) {
  const t = useTranslations("opd");
  const { tenant } = useApp();
  const { sym } = useCurrency();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [categories, setCategories] = useState<ChargeCategory[]>([]);
  const [doctorId, setDoctorId] = useState("");
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [selectedCharges, setSelectedCharges] = useState<ChargeLine[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard/doctors").then((r) => r.json()),
      fetch("/api/dashboard/charges").then((r) => r.json()),
    ]).then(([docData, chargeData]) => {
      if (docData.success) setDoctors(docData.data);
      if (chargeData.success) {
        const active: ChargeCategory[] = chargeData.data.filter(
          (c: ChargeCategory) => c.isActive,
        );
        setCategories(active);
        // Pre-select all active charges with their default fees
        setSelectedCharges(
          active.map((c) => ({
            categoryId: c._id,
            name: c.name,
            fee: String(c.defaultFee),
          })),
        );
      }
    });
  }, []);

  function toggleCharge(cat: ChargeCategory) {
    setSelectedCharges((prev) => {
      const exists = prev.find((c) => c.categoryId === cat._id);
      if (exists) return prev.filter((c) => c.categoryId !== cat._id);
      return [
        ...prev,
        { categoryId: cat._id, name: cat.name, fee: String(cat.defaultFee) },
      ];
    });
  }

  function updateFee(categoryId: string, fee: string) {
    setSelectedCharges((prev) =>
      prev.map((c) => (c.categoryId === categoryId ? { ...c, fee } : c)),
    );
  }

  const total = selectedCharges.reduce(
    (sum, c) => sum + (Number(c.fee) || 0),
    0,
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const visitDate = todayString();
      const chargePayload = selectedCharges.map((c) => ({
        categoryId: c.categoryId,
        name: c.name,
        fee: Number(c.fee) || 0,
      }));
      const res = await fetch("/api/dashboard/opd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: patient._id,
          doctorId: doctorId || undefined,
          chiefComplaint: chiefComplaint.trim(),
          charges: chargePayload,
          visitDate,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error);
        return;
      }

      const { opdNumber, doctor } = data.data;
      toast.success(
        t("generated", { number: String(opdNumber).padStart(3, "0") }),
      );

      const now = new Date();
      printOpdReceipt({
        opdNumber,
        visitDate: formatDate(now),
        visitTime: now.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
        patientName: patient.name,
        patientCode: patient.patientCode,
        patientAge: patient.age,
        patientAgeMonths: patient.ageMonths,
        patientAgeDays: patient.ageDays,
        patientGender: patient.gender,
        patientBloodGroup: patient.bloodGroup,
        patientAllergies: patient.allergies,
        patientAddress: patient.address,
        doctorName: doctor?.name,
        doctorSpecialization: doctor?.specialization,
        chiefComplaint: chiefComplaint.trim(),
        charges: chargePayload,
        totalFee: total,
        clinicName: tenant?.name ?? "Clinic",
        clinicAddress: tenant?.address || undefined,
        logoUrl: tenant?.logoUrl || undefined,
      });

      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Patient summary */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 flex items-center gap-3">
        <Avatar className="w-10 h-10 shrink-0">
          <AvatarFallback className="bg-blue-200 text-blue-800 font-bold text-sm">
            {patient.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold text-gray-900 text-sm">{patient.name}</p>
          {patient.age > 0 && (
            <p className="text-xs text-gray-500">{patient.age} yrs</p>
          )}
        </div>
      </div>

      {/* Doctor */}
      <div className="space-y-2">
        <Label>{t("doctorLabel")}</Label>
        <SearchableSelect
          value={doctorId}
          onValueChange={(v) => setDoctorId(v)}
          options={doctors.map((d) => ({
            value: d._id,
            label: d.name,
            sub: d.specialization,
          }))}
          placeholder={t("doctorPlaceholder")}
          searchPlaceholder="Search by name or specialization…"
          emptyText="No doctors found. Add doctors in HR."
          clearable
        />
      </div>

      {/* Chief complaint */}
      <div className="space-y-2">
        <Label htmlFor="complaint">{t("complaintLabel")}</Label>
        <Textarea
          id="complaint"
          value={chiefComplaint}
          onChange={(e) => setChiefComplaint(e.target.value)}
          placeholder={t("complaintPlaceholder")}
          rows={2}
        />
      </div>

      {/* Charges */}
      <div className="space-y-2">
        <Label>{t("chargesLabel")}</Label>
        {categories.length === 0 ? (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            {t("noChargesConfigured")}
          </p>
        ) : (
          <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 overflow-hidden">
            {categories.map((cat) => {
              const selected = selectedCharges.find(
                (c) => c.categoryId === cat._id,
              );
              return (
                <div
                  key={cat._id}
                  className={`flex items-center gap-3 px-3 py-2.5 transition-colors ${selected ? "bg-blue-50/60" : "bg-white"}`}
                >
                  <input
                    type="checkbox"
                    id={`charge-${cat._id}`}
                    checked={!!selected}
                    onChange={() => toggleCharge(cat)}
                    className="w-4 h-4 accent-blue-600 shrink-0"
                  />
                  <label
                    htmlFor={`charge-${cat._id}`}
                    className={`flex-1 text-sm cursor-pointer ${selected ? "font-medium text-gray-900" : "text-gray-600"}`}
                  >
                    {cat.name}
                  </label>
                  <div className="relative w-24">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                      {sym}
                    </span>
                    <Input
                      type="number"
                      value={selected?.fee ?? String(cat.defaultFee)}
                      onChange={(e) =>
                        selected && updateFee(cat._id, e.target.value)
                      }
                      disabled={!selected}
                      min={0}
                      className="h-8 pl-6 text-sm"
                    />
                  </div>
                </div>
              );
            })}
            {/* Total row */}
            <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50">
              <span className="text-sm font-semibold text-gray-700">
                {t("total")}
              </span>
              <span className="text-base font-bold text-blue-700">
                {sym}
                {total.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-1">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onClose}
        >
          {t("cancel")}
        </Button>
        <Button
          type="submit"
          className="flex-1 bg-blue-600 hover:bg-blue-700"
          disabled={submitting}
        >
          <ClipboardPlus className="w-4 h-4 mr-1.5" />
          {submitting ? t("generating") : t("generate")}
        </Button>
      </div>
    </form>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

function formatAge(age: number, months?: number, days?: number) {
  return `${age ?? 0} Year, ${months ?? 0} Month, ${days ?? 0} Day`;
}

export default function PatientsPage() {
  const { user } = useApp();
  const t = useTranslations("patients");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [editPatient, setEditPatient] = useState<Patient | null>(null);
  const [opdPatient, setOpdPatient] = useState<Patient | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const canEdit = user?.role !== "VIEWER";

  const loadPatients = useCallback(
    async (p = page, q = search, size = pageSize) => {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(p),
        limit: String(size),
      });
      if (q) params.set("search", q);
      const res = await fetch(`/api/dashboard/patients?${params}`);
      const data = await res.json();
      if (data.success) {
        setPatients(data.data.patients);
        setTotal(data.data.total);
        setTotalPages(data.data.totalPages);
      }
      setLoading(false);
    },
    [page, search, pageSize],
  );

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);
  useEffect(() => {
    const id = setTimeout(() => {
      setPage(1);
      loadPatients(1, search, pageSize);
    }, 300);
    return () => clearTimeout(id);
  }, [search]);

  function handlePageChange(next: number) {
    setPage(next);
    loadPatients(next, search, pageSize);
  }
  function handlePageSizeChange(val: string) {
    const size = Number(val);
    setPageSize(size);
    setPage(1);
    loadPatients(1, search, size);
  }

  async function handleAdd(body: PatientFormData) {
    const res = await fetch("/api/dashboard/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.success) {
      toast.success(t("addedSuccess"));
      setPage(1);
      loadPatients(1, search, pageSize);
    } else {
      toast.error(data.error);
      throw new Error(data.error);
    }
  }

  async function handleEdit(body: PatientFormData) {
    if (!editPatient) return;
    const res = await fetch(`/api/dashboard/patients/${editPatient._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.success) {
      toast.success(t("updatedSuccess"));
      loadPatients(page, search, pageSize);
    } else {
      toast.error(data.error);
      throw new Error(data.error);
    }
  }

  async function handleDelete(patient: Patient) {
    if (!confirm(`Delete "${patient.name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/dashboard/patients/${patient._id}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (data.success) {
      toast.success("Patient deleted");
      loadPatients(page, search, pageSize);
    } else toast.error(data.error);
  }

  async function handleBulkDelete() {
    if (
      !confirm(
        `Delete ${selectedIds.size} selected patient(s)? This cannot be undone.`,
      )
    )
      return;
    await Promise.all(
      [...selectedIds].map((id) =>
        fetch(`/api/dashboard/patients/${id}`, { method: "DELETE" }),
      ),
    );
    toast.success(`${selectedIds.size} patients deleted`);
    setSelectedIds(new Set());
    setPage(1);
    loadPatients(1, search, pageSize);
  }

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const patientColumns: ColumnDef<Patient>[] = [
    {
      key: "createdAt",
      header: "#",
      width: "w-10",
      skeletonWidth: "w-5",
      sortable: true,
      sortValue: (r) => new Date(r.createdAt).getTime(),
      render: (_row, i) => (
        <span className="text-xs text-gray-400">{from + i}</span>
      ),
    },
    {
      key: "name",
      header: "Patient Name",
      sortable: true,
      sortValue: (r) => r.name,
      skeletonWidth: "w-36",
      render: (r) => (
        <span className="text-xs font-medium whitespace-nowrap">{r.name}</span>
      ),
    },
    {
      key: "age",
      header: "Age",
      sortable: true,
      sortValue: (r) => r.age ?? 0,
      skeletonWidth: "w-14",
      render: (r) =>
        r.age || r.ageMonths || r.ageDays ? (
          <span className="text-xs whitespace-nowrap">
            {formatAge(r.age, r.ageMonths, r.ageDays)}
          </span>
        ) : (
          <span className="text-xs text-gray-300">—</span>
        ),
    },
    {
      key: "gender",
      header: "Gender",
      skeletonWidth: "w-12",
      render: (r) => (
        <span className="text-xs text-gray-600">{r.gender || "—"}</span>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      skeletonWidth: "w-24",
      render: (r) => (
        <span className="text-xs font-mono text-gray-600">
          {r.phone || "—"}
        </span>
      ),
    },
    {
      key: "guardian",
      header: "Guardian",
      skeletonWidth: "w-24",
      render: (r) => (
        <span className="text-xs text-gray-600">{r.guardianName || "—"}</span>
      ),
    },
    {
      key: "address",
      header: "Address",
      skeletonWidth: "w-32",
      className: "max-w-48 truncate",
      render: (r) => (
        <span className="text-xs text-gray-600">{r.address || "—"}</span>
      ),
    },
    {
      key: "actions",
      header: "Action",
      align: "center",
      skeletonWidth: "w-12",
      render: (r) => (
        <div className="flex items-center justify-center gap-0.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditPatient(r);
            }}
            title="View / Edit"
            className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                <MoreVertical className="w-3.5 h-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem
                  onClick={() => setOpdPatient(r)}
                  className="gap-2 text-sm cursor-pointer"
                >
                  <ClipboardPlus className="w-3.5 h-3.5" /> Generate OPD
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setEditPatient(r)}
                  className="gap-2 text-sm cursor-pointer"
                >
                  <Info className="w-3.5 h-3.5" /> Edit Patient
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleDelete(r)}
                  className="gap-2 text-sm text-red-600 focus:text-red-600 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-0 h-full flex flex-col">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-1 pb-3">
        <h1 className="text-lg font-bold text-gray-900">Patient List</h1>
        {canEdit && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 h-8 text-xs gap-1.5"
              onClick={() => setAddOpen(true)}
            >
              <Plus className="w-3.5 h-3.5" /> Add New Patient
            </Button>
            <Link href="/dashboard/patients/import">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Import Patient
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* ── Table ── */}
      <DataTable
        columns={patientColumns}
        data={patients}
        rowKey={(r) => r._id}
        loading={loading}
        skeletonRows={8}
        defaultSortKey="createdAt"
        defaultSortDir="desc"
        emptyNode={
          <div className="flex flex-col items-center gap-2">
            <Users className="w-12 h-12 text-gray-200" />
            <p className="font-semibold text-gray-400">{t("noData")}</p>
            <p className="text-sm text-gray-400">{t("noDataDesc")}</p>
          </div>
        }
        selectable={canEdit}
        selectedKeys={selectedIds}
        onSelectAll={(keys) => setSelectedIds(new Set(keys))}
        onSelectRow={(key, checked) =>
          setSelectedIds((prev) => {
            const n = new Set(prev);
            checked ? n.add(key) : n.delete(key);
            return n;
          })
        }
        wrapperClassName="flex-1 overflow-auto"
        searchValue={search}
        onSearchChange={(v) => setSearch(v)}
        toolbarRight={
          <>
            {canEdit && selectedIds.size > 0 && (
              <Button
                size="sm"
                variant="destructive"
                className="h-8 text-xs gap-1.5"
                onClick={handleBulkDelete}
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Selected (
                {selectedIds.size})
              </Button>
            )}
            <Select
              value={String(pageSize)}
              onValueChange={(v) => handlePageSizeChange(v ?? "")}
            >
              <SelectTrigger className="h-8 w-20 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
        downloadable
        printable
        fileName="patients"
      />

      {/* ── Pagination ── */}
      <div className="flex items-center justify-between pt-3 px-1 text-xs text-gray-500">
        <span>
          {from}–{to} of {total} patients
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0"
            disabled={page <= 1}
            onClick={() => handlePageChange(page - 1)}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
          <span className="px-2 text-xs font-medium">
            {t("pageOf", { page, totalPages })}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0"
            disabled={page >= totalPages}
            onClick={() => handlePageChange(page + 1)}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* ── Dialogs ── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="w-[95vw] sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t("addNew")}</DialogTitle>
          </DialogHeader>
          <PatientForm onSave={handleAdd} onClose={() => setAddOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editPatient}
        onOpenChange={(o) => !o && setEditPatient(null)}
      >
        <DialogContent className="w-[95vw] sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t("editTitle")}</DialogTitle>
          </DialogHeader>
          {editPatient && (
            <PatientForm
              initial={editPatient}
              onSave={handleEdit}
              onClose={() => setEditPatient(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!opdPatient}
        onOpenChange={(o) => !o && setOpdPatient(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardPlus className="w-5 h-5 text-blue-600" /> Generate OPD
              Receipt
            </DialogTitle>
          </DialogHeader>
          {opdPatient && (
            <OpdForm patient={opdPatient} onClose={() => setOpdPatient(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
