"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useApp, useCurrency } from "@/lib/context";
import { useDoctors } from "@/lib/lookups";
import { useApiQuery } from "@/lib/useApiQuery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
  BedDouble,
  LogOut,
  Trash2,
  LayoutGrid,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  PatientForm,
  type PatientFormData,
} from "@/components/patients/PatientForm";
import { todayString, formatDate } from "@/lib/format";
import type { PatientOption } from "@/lib/types/patient";
import { FullScreenFormShell } from "@/components/common/FullScreenFormShell";

// ── Types ────────────────────────────────────────────────────────────────────

interface BedRecord {
  _id: string;
  bedGroup: string;
  name: string;
  floor?: string;
  status: string;
}

interface IpdAdmission {
  _id: string;
  ipdNumber: number;
  admissionDate: string;
  dischargeDate?: string;
  status: "ADMITTED" | "DISCHARGED";
  bedGroup?: string;
  bedNumber?: string;
  symptomsType?: string;
  symptomsTitle?: string;
  chiefComplaint?: string;
  note?: string;
  previousMedicalIssue?: string;
  isAntenatal?: boolean;
  tpa?: string;
  creditLimit?: number;
  casualty?: boolean;
  isOldPatient?: boolean;
  liveConsultation?: boolean;
  caseNumber?: string;
  reference?: string;
  patientId: {
    _id: string;
    name: string;
    age: number;
    ageMonths?: number;
    ageDays?: number;
    uhid?: number;
    gender?: string;
    phone?: string;
    address?: string;
    bloodGroup?: string;
    allergies?: string;
    guardianName?: string;
  } | null;
  doctorId: { name: string; specialization: string; staffCode?: number } | null;
  createdBy?: { userId: string; name: string };
  createdAt: string;
}

// ── Add IPD full-screen form ──────────────────────────────────────────────────

function IpdAddForm({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const { tenant } = useApp();
  const symbol = tenant?.currencySymbol || "₹";
  const [selectedPatient, setSelectedPatient] = useState<PatientOption | null>(
    null,
  );
  const [showAddPatient, setShowAddPatient] = useState(false);
  const { data: doctors = [] } = useDoctors();
  const { data: bedsData } = useApiQuery<{ beds: BedRecord[] }>(
    ["beds"],
    "/api/dashboard/beds",
  );
  const beds = bedsData?.beds ?? [];

  // clinical
  const [symptomsType, setSymptomsType] = useState("");
  const [symptomsTitle, setSymptomsTitle] = useState("");
  const [symptomsDescription, setSymptomsDescription] = useState("");
  const [note, setNote] = useState("");
  const [previousMedicalIssue, setPreviousMedicalIssue] = useState("");

  // admission
  const [admissionDate, setAdmissionDate] = useState(todayString());
  const [caseNumber, setCaseNumber] = useState("");
  const [tpa, setTpa] = useState("");
  const [casualty, setCasualty] = useState(false);
  const [isOldPatient, setIsOldPatient] = useState(false);
  const [creditLimit, setCreditLimit] = useState("20000");
  const [reference, setReference] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [selectedBedGroup, setSelectedBedGroup] = useState("");
  const [selectedBedNumber, setSelectedBedNumber] = useState("");
  const [liveConsultation, setLiveConsultation] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  // reset bed number when group changes
  useEffect(() => {
    setSelectedBedNumber("");
  }, [selectedBedGroup]);

  const bedGroups = [...new Set(beds.map((b) => b.bedGroup))];
  const bedNumbersForGroup = beds.filter(
    (b) => b.bedGroup === selectedBedGroup,
  );

  async function handleSubmit() {
    if (!selectedPatient) {
      toast.error("Please select a patient");
      return;
    }
    if (!admissionDate) {
      toast.error("Admission date is required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/dashboard/ipd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedPatient._id,
          doctorId: doctorId || undefined,
          admissionDate,
          bedGroup: selectedBedGroup || undefined,
          bedNumber: selectedBedNumber || undefined,
          symptomsType: symptomsType.trim() || undefined,
          symptomsTitle: symptomsTitle.trim() || undefined,
          chiefComplaint: symptomsDescription.trim(),
          note: note.trim() || undefined,
          previousMedicalIssue: previousMedicalIssue.trim() || undefined,
          tpa: tpa.trim() || undefined,
          creditLimit: Number(creditLimit) || 20000,
          casualty,
          isOldPatient,
          liveConsultation,
          caseNumber: caseNumber.trim() || undefined,
          reference: reference.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error);
        return;
      }
      toast.success(`IPD #IPDN${data.data.ipdNumber} created`);
      onSaved();
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  const inp = "h-9 text-sm w-full";
  const lbl = "text-sm font-medium text-gray-700 mb-1 block";
  const sel = "h-9 text-sm w-full";

  return (
    <>
      <FullScreenFormShell
        patient={selectedPatient}
        onPatientChange={setSelectedPatient}
        onAddPatient={() => setShowAddPatient(true)}
        onClose={onClose}
        left={
          <>
            {/* Symptoms row */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={lbl}>Symptoms Type</label>
                <Input
                  className={inp}
                  value={symptomsType}
                  onChange={(e) => setSymptomsType(e.target.value)}
                />
              </div>
              <div>
                <label className={lbl}>Symptoms Title</label>
                <Input
                  className={inp}
                  value={symptomsTitle}
                  onChange={(e) => setSymptomsTitle(e.target.value)}
                />
              </div>
              <div>
                <label className={lbl}>Symptoms Description</label>
                <Input
                  className={inp}
                  value={symptomsDescription}
                  onChange={(e) => setSymptomsDescription(e.target.value)}
                />
              </div>
            </div>

            {/* Note */}
            <div>
              <label className={lbl}>Note</label>
              <Textarea
                rows={4}
                className="text-sm resize-none w-full"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            {/* Previous Medical Issue */}
            <div>
              <label className={lbl}>Previous Medical Issue</label>
              <Textarea
                rows={4}
                className="text-sm resize-none w-full"
                value={previousMedicalIssue}
                onChange={(e) => setPreviousMedicalIssue(e.target.value)}
              />
            </div>
          </>
        }
        right={
          <>
            {/* Admission Date */}
            <div>
              <label className={lbl}>
                Admission Date <span className="text-danger-500">*</span>
              </label>
              <Input
                type="date"
                className={inp}
                value={admissionDate}
                onChange={(e) => setAdmissionDate(e.target.value)}
              />
            </div>

            {/* Case | TPA */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Case</label>
                <Input
                  className={inp}
                  value={caseNumber}
                  onChange={(e) => setCaseNumber(e.target.value)}
                />
              </div>
              <div>
                <label className={lbl}>TPA</label>
                <Input
                  className={inp}
                  value={tpa}
                  onChange={(e) => setTpa(e.target.value)}
                />
              </div>
            </div>

            {/* Casualty | Old Patient */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Casualty</label>
                <Select
                  value={casualty ? "yes" : "no"}
                  onValueChange={(v) => setCasualty(v === "yes")}
                >
                  <SelectTrigger className={sel}>
                    <SelectValue>{casualty ? "Yes" : "No"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no">No</SelectItem>
                    <SelectItem value="yes">Yes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className={lbl}>Old Patient</label>
                <Select
                  value={isOldPatient ? "yes" : "no"}
                  onValueChange={(v) => setIsOldPatient(v === "yes")}
                >
                  <SelectTrigger className={sel}>
                    <SelectValue>{isOldPatient ? "Yes" : "No"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no">No</SelectItem>
                    <SelectItem value="yes">Yes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Reference */}
            <div>
              <label className={lbl}>Reference</label>
              <Input
                className={inp}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>

            {/* Consultant Doctor */}
            <div>
              <label className={lbl}>
                Consultant Doctor <span className="text-danger-500">*</span>
              </label>
              <SearchableSelect
                value={doctorId}
                onValueChange={(v) => setDoctorId(v)}
                options={doctors.map((d) => ({
                  value: d._id,
                  label: d.name,
                  sub: d.specialization,
                }))}
                placeholder="Select"
                searchPlaceholder="Search by name or specialization…"
                emptyText="No doctors found. Add doctors in HR."
                clearable
              />
            </div>

            {/* Bed Group */}
            <div>
              <label className={lbl}>Bed Group</label>
              <Select
                value={selectedBedGroup}
                onValueChange={(v) => setSelectedBedGroup(v ?? "")}
              >
                <SelectTrigger className={sel}>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {bedGroups.length === 0 ? (
                    <SelectItem value="__none__" disabled>
                      No beds configured
                    </SelectItem>
                  ) : (
                    bedGroups.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Bed Number */}
            <div>
              <label className={lbl}>
                Bed Number <span className="text-danger-500">*</span>
              </label>
              <Select
                value={selectedBedNumber}
                onValueChange={(v) => setSelectedBedNumber(v ?? "")}
                disabled={!selectedBedGroup}
              >
                <SelectTrigger className={sel}>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {bedNumbersForGroup.length === 0 ? (
                    <SelectItem value="__none__" disabled>
                      {selectedBedGroup
                        ? "No beds in this group"
                        : "Select a bed group first"}
                    </SelectItem>
                  ) : (
                    bedNumbersForGroup.map((b) => (
                      <SelectItem key={b._id} value={b.name}>
                        {b.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Live Consultation */}
            <div>
              <label className={lbl}>Live Consultation</label>
              <Select
                value={liveConsultation ? "yes" : "no"}
                onValueChange={(v) => setLiveConsultation(v === "yes")}
              >
                <SelectTrigger className={sel}>
                  <SelectValue>{liveConsultation ? "Yes" : "No"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="yes">Yes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        }
        footer={
          <Button
            className="h-9 px-6 text-sm bg-primary-600 hover:bg-primary-700 gap-2"
            disabled={submitting}
            onClick={handleSubmit}
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Save
          </Button>
        }
      />

      {/* Add Patient dialog */}
      <Dialog
        open={showAddPatient}
        onOpenChange={(o) => !o && setShowAddPatient(false)}
      >
        <DialogContent className="w-[95vw] sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Add New Patient</DialogTitle>
          </DialogHeader>
          <PatientForm
            onClose={() => setShowAddPatient(false)}
            onSave={async (body: PatientFormData) => {
              const res = await fetch("/api/dashboard/patients", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
              });
              const data = await res.json();
              if (!data.success) {
                toast.error(data.error ?? "Failed to create patient");
                throw new Error(data.error);
              }
              toast.success(`Patient "${data.data.name}" added`);
              setSelectedPatient({
                _id: data.data._id,
                name: data.data.name,
                uhid: data.data.uhid,
                age: data.data.age ?? 0,
                ageMonths: data.data.ageMonths,
                gender: data.data.gender,
                phone: data.data.phone,
                address: data.data.address,
                bloodGroup: data.data.bloodGroup,
                allergies: data.data.allergies,
                guardianName: data.data.guardianName,
                remarks: data.data.remarks,
              });
              setShowAddPatient(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Discharge dialog ──────────────────────────────────────────────────────────

function DischargeDialog({
  admission,
  onClose,
  onDischarged,
}: {
  admission: IpdAdmission;
  onClose: () => void;
  onDischarged: () => void;
}) {
  const [dischargeDate, setDischargeDate] = useState(todayString());
  const [submitting, setSubmitting] = useState(false);

  async function handleDischarge() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/dashboard/ipd/${admission._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DISCHARGED", dischargeDate }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error);
        return;
      }
      toast.success("Patient discharged");
      onDischarged();
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Discharge{" "}
        <span className="font-semibold">{admission.patientId?.name}</span> (IPDN
        {admission.ipdNumber})?
      </p>
      <div className="space-y-2">
        <Label>Discharge Date</Label>
        <Input
          type="date"
          value={dischargeDate}
          onChange={(e) => setDischargeDate(e.target.value)}
        />
      </div>
      <div className="flex gap-3 pt-1">
        <Button variant="outline" className="flex-1" onClick={onClose}>
          Cancel
        </Button>
        <Button
          className="flex-1 bg-warning-600 hover:bg-warning-700"
          disabled={submitting}
          onClick={handleDischarge}
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            "Discharge Patient"
          )}
        </Button>
      </div>
    </div>
  );
}

// ── Main IPD page ─────────────────────────────────────────────────────────────

export default function IpdPage() {
  const { user } = useApp();
  const router = useRouter();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState(""); // debounced — drives the fetch
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [statusFilter, setStatusFilter] = useState<"ADMITTED" | "DISCHARGED">(
    "ADMITTED",
  );
  const [showAdd, setShowAdd] = useState(false);
  const [dischargeTarget, setDischargeTarget] = useState<IpdAdmission | null>(
    null,
  );
  const canEdit = user?.role !== "VIEWER";
  const { sym } = useCurrency();

  useEffect(() => {
    const id = setTimeout(() => {
      setPage(1);
      setSearch(searchInput);
    }, 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  const listParams = new URLSearchParams({
    status: statusFilter,
    page: String(page),
    limit: String(pageSize),
  });
  if (search) listParams.set("search", search);
  const {
    data: listData,
    isPending: loading,
    refetch: loadAdmissions,
  } = useApiQuery<{
    admissions: IpdAdmission[];
    total: number;
    totalPages: number;
  }>(
    ["ipd-admissions", statusFilter, search, page, pageSize],
    `/api/dashboard/ipd?${listParams}`,
    { keepPrevious: true },
  );
  const admissions = listData?.admissions ?? [];
  const total = listData?.total ?? 0;
  const totalPages = listData?.totalPages ?? 1;

  function switchStatus(s: "ADMITTED" | "DISCHARGED") {
    setStatusFilter(s);
    setPage(1);
    setSearch("");
    setSearchInput("");
  }

  async function handleDelete(a: IpdAdmission) {
    if (
      !confirm(
        `Delete IPD record for "${a.patientId?.name}"? This cannot be undone.`,
      )
    )
      return;
    const res = await fetch(`/api/dashboard/ipd/${a._id}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (data.success) {
      toast.success("IPD record deleted");
      loadAdmissions();
    } else toast.error(data.error);
  }

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const columns: ColumnDef<IpdAdmission>[] = [
    {
      key: "ipdNumber",
      header: "IPD No",
      width: "w-20",
      skeletonWidth: "w-14",
      sortable: true,
      sortValue: (a) => a.ipdNumber,
      render: (a) => (
        <span className="text-xs font-mono text-primary-600 font-bold">
          IPDN{a.ipdNumber}
        </span>
      ),
    },
    {
      key: "patient",
      header: "Patient",
      skeletonWidth: "w-32",
      sortable: true,
      sortValue: (a) => a.patientId?.name ?? "",
      render: (a) => (
        <span className="text-xs font-medium text-gray-900 truncate">
          {a.patientId?.name ?? "—"}
        </span>
      ),
    },
    {
      key: "gender",
      header: "Gender",
      width: "w-16",
      skeletonWidth: "w-10",
      render: (a) => (
        <span className="text-xs text-gray-500">
          {a.patientId?.gender ?? "—"}
        </span>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      width: "w-28",
      skeletonWidth: "w-24",
      render: (a) => (
        <span className="text-xs font-mono text-gray-600">
          {a.patientId?.phone ?? "—"}
        </span>
      ),
    },
    {
      key: "admission",
      header: "Admission",
      width: "w-24",
      skeletonWidth: "w-20",
      sortable: true,
      sortValue: (a) => a.admissionDate,
      render: (a) => (
        <span className="text-xs text-gray-600">
          {formatDate(a.admissionDate)}
        </span>
      ),
    },
    {
      key: "generatedBy",
      header: "Generated By",
      skeletonWidth: "w-24",
      render: (a) => (
        <span className="text-xs text-gray-500 truncate">
          {a.createdBy?.name ?? "—"}
        </span>
      ),
    },
    {
      key: "doctor",
      header: "Consultant",
      skeletonWidth: "w-28",
      sortable: true,
      sortValue: (a) => a.doctorId?.name ?? "",
      render: (a) => (
        <span className="text-xs text-gray-600 truncate">
          {a.doctorId?.name ?? "—"}
        </span>
      ),
    },
    {
      key: "bed",
      header: "Bed",
      skeletonWidth: "w-24",
      render: (a) => {
        if (!a.bedNumber)
          return <span className="text-xs text-gray-400">—</span>;
        return (
          <span className="text-xs text-gray-600">
            {a.bedNumber}
            {a.bedGroup ? (
              <span className="text-gray-400"> · {a.bedGroup}</span>
            ) : null}
          </span>
        );
      },
    },
    {
      key: "antenatal",
      header: "Antenatal",
      align: "center",
      width: "w-20",
      skeletonWidth: "w-10",
      render: (a) =>
        a.isAntenatal ? (
          <Badge className="bg-pink-100 text-pink-700 border-0 text-xs">
            Yes
          </Badge>
        ) : (
          <span className="text-xs text-gray-300">No</span>
        ),
    },
    {
      key: "prevIssue",
      header: "Medical Issue",
      skeletonWidth: "w-32",
      render: (a) => (
        <span className="text-xs text-gray-500 truncate max-w-40 block">
          {a.previousMedicalIssue || "—"}
        </span>
      ),
    },
    ...(canEdit
      ? [
          {
            key: "actions",
            header: "",
            width: "w-16",
            skeletonWidth: "w-10",
            render: (a: IpdAdmission) => (
              <div className="flex items-center justify-center gap-1">
                {statusFilter === "ADMITTED" && (
                  <button
                    title="Discharge Patient"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDischargeTarget(a);
                    }}
                    className="p-1.5 rounded hover:bg-warning-50 text-gray-400 hover:text-warning-500 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  title="Delete Record"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(a);
                  }}
                  className="p-1.5 rounded hover:bg-danger-50 text-gray-400 hover:text-danger-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      {showAdd && (
        <IpdAddForm
          onClose={() => setShowAdd(false)}
          onSaved={() => loadAdmissions()}
        />
      )}

      <div className="h-full flex flex-col bg-white border border-gray-200 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 shrink-0 bg-gray-50 px-3 py-2">
          <div className="flex items-center gap-2">
            <BedDouble className="w-4 h-4 text-primary-600" />
            <h1 className="text-lg font-semibold text-gray-800">IPD Patient</h1>
          </div>
          {canEdit && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1"
                onClick={() => router.push("/dashboard/ipd/bed-map")}
              >
                <LayoutGrid className="w-3.5 h-3.5" /> Bed Map
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs gap-1 bg-primary-600 hover:bg-primary-700"
                onClick={() => setShowAdd(true)}
              >
                <Plus className="w-3.5 h-3.5" /> Add Patient
              </Button>
              <Button
                size="sm"
                variant={statusFilter === "DISCHARGED" ? "default" : "outline"}
                className={`h-8 text-xs gap-1 ${statusFilter === "DISCHARGED" ? "bg-warning-600 hover:bg-warning-700" : ""}`}
                onClick={() =>
                  switchStatus(
                    statusFilter === "ADMITTED" ? "DISCHARGED" : "ADMITTED",
                  )
                }
              >
                <LogOut className="w-3.5 h-3.5" />
                {statusFilter === "ADMITTED"
                  ? "Discharged Patient"
                  : "Admitted Patient"}
              </Button>
            </div>
          )}
        </div>

        {/* Table */}
        <DataTable<IpdAdmission>
          columns={columns}
          data={admissions}
          rowKey={(a) => a._id}
          loading={loading}
          onRowClick={(a) => router.push(`/dashboard/ipd/${a._id}`)}
          skeletonRows={6}
          emptyNode={
            <div className="flex flex-col items-center gap-2">
              <BedDouble className="w-12 h-12 text-gray-200" />
              <p className="text-sm font-medium text-gray-400">
                No IPD records found
              </p>
              <p className="text-xs text-gray-400">
                {statusFilter === "ADMITTED"
                  ? 'No admitted patients. Click "+ Add Patient" to admit one.'
                  : "No discharged patients yet."}
              </p>
            </div>
          }
          wrapperClassName="flex-1 overflow-auto"
          searchValue={searchInput}
          onSearchChange={(v) => setSearchInput(v)}
          toolbarRight={
            <Select
              value={String(pageSize)}
              onValueChange={(v) => {
                setPageSize(Number(v));
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-20 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["25", "50", "100"].map((n) => (
                  <SelectItem key={n} value={n}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
          downloadable
          printable
          fileName="ipd-patients"
        />

        {/* Footer */}
        <div className="flex items-center justify-between px-3 py-1.5 border-t border-gray-200 shrink-0 bg-gray-50">
          <span className="text-xs text-gray-500">
            Records: {from} to {to} of {total}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-xs"
              className="text-gray-500 hover:bg-gray-200"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              className="text-gray-500 hover:bg-gray-200"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Discharge dialog */}
      <Dialog
        open={!!dischargeTarget}
        onOpenChange={(o) => !o && setDischargeTarget(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogOut className="w-5 h-5 text-warning-600" /> Discharge Patient
            </DialogTitle>
          </DialogHeader>
          {dischargeTarget && (
            <DischargeDialog
              admission={dischargeTarget}
              onClose={() => setDischargeTarget(null)}
              onDischarged={() => {
                loadAdmissions();
                setDischargeTarget(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
