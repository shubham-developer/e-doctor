"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
import { toast } from "sonner";
import { useApp, useCurrency } from "@/lib/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Loader2, Printer } from "lucide-react";
import { printPrescription } from "@/components/opd/PrescriptionPrinter";
import {
  PatientForm,
  type PatientFormData,
} from "@/components/patients/PatientForm";
import { todayString, nowTimeString } from "@/lib/format";
import { apiClient } from "@/lib/apiClient";
import { useDoctors, useCharges } from "@/lib/lookups";
import type { PatientOption } from "@/lib/types/patient";
import { FullScreenFormShell } from "@/components/common/FullScreenFormShell";
import { FormDialog } from "@/components/common/FormDialog";

const PAYMENT_MODES = ["CASH", "CARD", "UPI", "CHEQUE", "ONLINE"];

function computeAmount(
  appliedStr: string,
  discountStr: string,
  taxStr: string,
): number {
  const applied = Number(appliedStr) || 0;
  const disc = Number(discountStr) || 0;
  const taxPct = Number(taxStr) || 0;
  return Math.max(0, applied - disc + ((applied - disc) * taxPct) / 100);
}

type FormValues = {
  visitDate: string;
  visitTime: string;
  caseNumber: string;
  casualty: boolean;
  isOldPatient: boolean;
  reference: string;
  doctorId: string;
  categoryId: string;
  applyTpa: boolean;
  chargeItem: string;
  appliedCharge: string;
  discount: string;
  tax: string;
  paymentMode: string;
  paidAmount: string;
  liveConsultation: boolean;
  symptomsType: string;
  symptomsTitle: string;
  symptomsDescription: string;
  note: string;
  knownAllergies: string;
  previousMedicalIssue: string;
};

export function OpdAddForm({
  onClose,
  onSaved,
  initialPatient,
}: {
  onClose: () => void;
  onSaved: () => void;
  initialPatient?: PatientOption;
}) {
  const { tenant } = useApp();
  const { sym } = useCurrency();

  const [selectedPatient, setSelectedPatient] = useState<PatientOption | null>(
    initialPatient ?? null,
  );
  const [showAddPatient, setShowAddPatient] = useState(false);

  // reference data (cached lookups)
  const { data: doctors = [] } = useDoctors();
  const { data: opdCharges } = useCharges("opd");
  const categories = useMemo(
    () => (opdCharges ?? []).filter((c) => c.isActive),
    [opdCharges],
  );

  const {
    register,
    control,
    setValue,
    handleSubmit,
    formState: { isDirty: formIsDirty, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      visitDate: todayString(),
      visitTime: nowTimeString(),
      caseNumber: "",
      casualty: false,
      isOldPatient: false,
      reference: "",
      doctorId: "",
      categoryId: "",
      applyTpa: false,
      chargeItem: "",
      appliedCharge: "",
      discount: "0",
      tax: "0",
      paymentMode: "CASH",
      paidAmount: "",
      liveConsultation: false,
      symptomsType: "",
      symptomsTitle: "",
      symptomsDescription: "",
      note: "",
      knownAllergies: "",
      previousMedicalIssue: "",
    },
  });

  const [isReturningPatient, setIsReturningPatient] = useState(false);
  const [isReturnExhausted, setIsReturnExhausted] = useState(false);
  const [revisitNumber, setRevisitNumber] = useState(0);

  const dirty = formIsDirty || Boolean(selectedPatient);

  const categoryId = useWatch({ control, name: "categoryId" });
  const appliedChargeVal = useWatch({ control, name: "appliedCharge" });
  const discountVal = useWatch({ control, name: "discount" });
  const taxVal = useWatch({ control, name: "tax" });

  const standardCharge = useMemo(() => {
    const cat = categories.find((c) => c._id === categoryId);
    return cat ? String(cat.standardCharge) : "";
  }, [categories, categoryId]);

  const amount = useMemo(
    () => computeAmount(appliedChargeVal, discountVal, taxVal),
    [appliedChargeVal, discountVal, taxVal],
  );

  // default-select the charge category when there's only one to choose from
  useEffect(() => {
    if (!categoryId && categories.length === 1) {
      setValue("categoryId", categories[0]._id);
    }
  }, [categories, categoryId, setValue]);

  // auto-fill charge name/tax when category changes (skip applied charge if returning patient)
  useEffect(() => {
    const cat = categories.find((c) => c._id === categoryId);
    if (cat) {
      setValue("chargeItem", cat.name);
      if (!isReturningPatient)
        setValue("appliedCharge", String(cat.standardCharge));
      setValue("tax", String(cat.taxPercent ?? 0));
    }
  }, [categoryId, categories, isReturningPatient, setValue]);

  // auto-fill paid amount = amount
  useEffect(() => {
    if (amount > 0) setValue("paidAmount", String(Math.round(amount)));
  }, [amount, setValue]);

  // Returns { isReturning, freeUsed } where freeUsed = free follow-ups already taken since the
  // most recent PAID visit in the window. Each paid consultation restarts the free-visit counter.
  async function checkRevisitStatus(
    patientId: string,
  ): Promise<{ isReturning: boolean; freeUsed: number }> {
    const revisitDays = tenant?.opdRevisitDays ?? 0;
    if (revisitDays <= 0) return { isReturning: false, freeUsed: 0 };
    const res = await apiClient.get<{
      visits: {
        visitDate: string;
        opdNumber?: number;
        paidAmount?: number;
        totalFee?: number;
      }[];
    }>(`/api/dashboard/opd?patientId=${patientId}&limit=50&tab=patients`);
    const visits = res.data?.visits ?? [];
    // Sort ascending by date then opdNumber so same-day visits are correctly ordered
    const sorted = [...visits].sort((a, b) => {
      const dc = a.visitDate
        .slice(0, 10)
        .localeCompare(b.visitDate.slice(0, 10));
      return dc !== 0 ? dc : (a.opdNumber ?? 0) - (b.opdNumber ?? 0);
    });
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - revisitDays);
    const windowStartStr = `${windowStart.getFullYear()}-${String(windowStart.getMonth() + 1).padStart(2, "0")}-${String(windowStart.getDate()).padStart(2, "0")}`;
    const inWindow = sorted.filter((v) => {
      const vd = v.visitDate.slice(0, 10);
      return vd >= windowStartStr && vd <= todayStr;
    });
    // Find the most recent paid visit (a paid consultation opens a new free-follow-up window)
    const lastPaidIdx = inWindow.reduce(
      (acc, v, i) =>
        (v.paidAmount ?? 0) > 0 || (v.totalFee ?? 0) > 0 ? i : acc,
      -1,
    );
    if (lastPaidIdx === -1) return { isReturning: false, freeUsed: 0 };
    // Visits after the last paid visit are already-used free follow-ups
    return { isReturning: true, freeUsed: inWindow.length - lastPaidIdx - 1 };
  }

  function applyRevisitFree(status: {
    isReturning: boolean;
    freeUsed: number;
  }) {
    // freeRevisits = 0 means unlimited free follow-ups after each paid consultation
    const freeRevisits = tenant?.opdFreeRevisits ?? 0;
    const isFree =
      status.isReturning &&
      (freeRevisits === 0 || status.freeUsed < freeRevisits);
    const isExhausted =
      status.isReturning && freeRevisits > 0 && status.freeUsed >= freeRevisits;
    if (isFree) {
      setIsReturningPatient(true);
      setIsReturnExhausted(false);
      setRevisitNumber(status.freeUsed + 1);
      setValue("appliedCharge", "0");
      setValue("paidAmount", "0");
      return true;
    }
    setIsReturningPatient(false);
    setIsReturnExhausted(isExhausted);
    setRevisitNumber(0);
    return false;
  }

  // Revisit check for pre-selected patient (initialPatient bypasses selectPatient)
  useEffect(() => {
    if (!initialPatient) return;
    checkRevisitStatus(initialPatient._id).then(applyRevisitFree);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPatient?._id, tenant?.opdRevisitDays, tenant?.opdFreeRevisits]);

  async function selectPatient(p: PatientOption) {
    setSelectedPatient(p);
    if (p.allergies) setValue("knownAllergies", p.allergies);
    const status = await checkRevisitStatus(p._id);
    applyRevisitFree(status);
  }

  function submit(print: boolean) {
    return handleSubmit(
      async (form) => {
        if (!selectedPatient) {
          toast.error("Please select a patient");
          return;
        }
        const chargeLines = form.chargeItem
          ? [
              {
                categoryId: form.categoryId || undefined,
                name: form.chargeItem,
                fee: Number(form.appliedCharge) || 0,
              },
            ]
          : [];
        const amt = computeAmount(form.appliedCharge, form.discount, form.tax);
        const res = await apiClient.post<{
          opdNumber: number;
          doctor?: { name: string; specialization: string };
        }>("/api/dashboard/opd", {
          patientId: selectedPatient._id,
          doctorId: form.doctorId || undefined,
          visitDate: form.visitDate,
          visitTime: form.visitTime,
          chiefComplaint:
            form.symptomsDescription.trim() || form.symptomsTitle.trim(),
          symptomsType: form.symptomsType.trim(),
          symptomsTitle: form.symptomsTitle.trim(),
          note: form.note.trim(),
          knownAllergiesOverride: form.knownAllergies.trim(),
          previousMedicalIssue: form.previousMedicalIssue.trim(),
          caseNumber: form.caseNumber.trim(),
          reference: form.reference.trim(),
          casualty: form.casualty,
          isOldPatient: form.isOldPatient,
          liveConsultation: form.liveConsultation,
          applyTpa: form.applyTpa,
          charges: chargeLines,
          totalFee: amt || Number(form.appliedCharge) || 0,
          appliedCharge: Number(form.appliedCharge) || undefined,
          discount: Number(form.discount) || 0,
          tax: Number(form.tax) || 0,
          paymentMode: form.paymentMode,
          paidAmount: Number(form.paidAmount) || 0,
        });
        if (!res.success) {
          toast.error(res.error);
          return;
        }

        const { opdNumber, doctor } = res.data;
        toast.success(`OPD #${String(opdNumber).padStart(3, "0")} created`);

        if (print) {
          printPrescription({
            layoutModule: "manualPrescription",
            opdNumber,
            caseNumber: form.caseNumber.trim() || undefined,
            visitDate: form.visitDate,
            patientName: selectedPatient.name,
            uhid: selectedPatient.uhid,
            patientAge: selectedPatient.age,
            patientAgeMonths: selectedPatient.ageMonths,
            patientAgeDays: (
              selectedPatient as PatientOption & { ageDays?: number }
            ).ageDays,
            patientGender: selectedPatient.gender,
            patientPhone: selectedPatient.phone,
            patientBloodGroup: selectedPatient.bloodGroup,
            patientAllergies:
              form.knownAllergies.trim() || selectedPatient.allergies,
            patientAddress: selectedPatient.address,
            doctorName: doctor?.name,
            manualContent: "",
            medicines: [],
            findings: [],
            clinicName: tenant?.name ?? "Clinic",
            clinicAddress: tenant?.address || undefined,
            logoUrl: tenant?.logoUrl || undefined,
            printLayouts: tenant?.printLayouts,
            printShowLogo: tenant?.printShowLogo,
            printHeaderImages: tenant?.printHeaderImages,
            printFooterContents: tenant?.printFooterContents,
            printLetterheads: tenant?.printLetterheads,
            printShowTitles: tenant?.printShowTitles,
            printTitleTexts: tenant?.printTitleTexts,
          });
        }

        onSaved();
        onClose();
      },
      (errors) => {
        const message = errors.visitDate?.message ?? errors.visitTime?.message;
        if (message) toast.error(message);
      },
    );
  }

  const inp = "h-9 text-sm w-full";
  const lbl = "text-sm font-medium text-gray-700 mb-1 block";
  const sel = "h-9 text-sm w-full";

  return (
    <>
      <FullScreenFormShell
        title="New OPD Visit"
        patient={selectedPatient}
        onPatientChange={selectPatient}
        onAddPatient={() => setShowAddPatient(true)}
        onClose={onClose}
        isDirty={dirty}
        left={
          <>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={lbl}>Symptoms Type</label>
                <Input className={inp} {...register("symptomsType")} />
              </div>
              <div>
                <label className={lbl}>Symptoms Title</label>
                <Input className={inp} {...register("symptomsTitle")} />
              </div>
              <div>
                <label className={lbl}>Symptoms Description</label>
                <Input className={inp} {...register("symptomsDescription")} />
              </div>
            </div>

            <div>
              <label className={lbl}>Any Known Allergies</label>
              <Textarea
                rows={3}
                className="text-sm resize-none w-full"
                placeholder="Penicillin, Aspirin…"
                {...register("knownAllergies")}
              />
            </div>

            <div>
              <label className={lbl}>Previous Medical Issue</label>
              <Textarea
                rows={3}
                className="text-sm resize-none w-full"
                placeholder="Diabetes, Hypertension…"
                {...register("previousMedicalIssue")}
              />
            </div>

            <div>
              <label className={lbl}>Note</label>
              <Textarea
                rows={4}
                className="text-sm resize-none w-full"
                {...register("note")}
              />
            </div>
          </>
        }
        right={
          <>
            {/* Returning patient banner */}
            {isReturningPatient && (
              <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-xs text-green-800">
                <span className="font-semibold">Returning Patient</span>
                <span className="text-green-600">
                  {(tenant?.opdFreeRevisits ?? 0) > 0
                    ? `— Revisit ${revisitNumber} of ${tenant?.opdFreeRevisits} free (within ${tenant?.opdRevisitDays}-day window)`
                    : `— Free revisit (within ${tenant?.opdRevisitDays}-day window)`}
                </span>
              </div>
            )}
            {isReturnExhausted && (
              <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                <span className="font-semibold">Returning Patient</span>
                <span className="text-amber-700">
                  — All {tenant?.opdFreeRevisits} free revisit
                  {(tenant?.opdFreeRevisits ?? 0) !== 1 ? "s" : ""} used.
                  Standard charge applies.
                </span>
              </div>
            )}

            {/* Appointment Date | Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>
                  Appointment Date <span className="text-danger-500">*</span>
                </label>
                <Input
                  type="date"
                  className={inp}
                  {...register("visitDate", {
                    required: "Appointment date is required",
                  })}
                />
              </div>
              <div>
                <label className={lbl}>
                  Appointment Time <span className="text-danger-500">*</span>
                </label>
                <Input
                  type="time"
                  className={inp}
                  {...register("visitTime", {
                    required: "Appointment time is required",
                  })}
                />
              </div>
            </div>

            {/* Case | Reference */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Case</label>
                <Input className={inp} {...register("caseNumber")} />
              </div>
              <div>
                <label className={lbl}>Reference</label>
                <Input className={inp} {...register("reference")} />
              </div>
            </div>

            {/* Casualty | Old Patient */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Casualty</label>
                <Controller
                  control={control}
                  name="casualty"
                  render={({ field }) => (
                    <Select
                      value={field.value ? "yes" : "no"}
                      onValueChange={(v) => field.onChange(v === "yes")}
                    >
                      <SelectTrigger className={sel}>
                        <SelectValue>{field.value ? "Yes" : "No"}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no">No</SelectItem>
                        <SelectItem value="yes">Yes</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div>
                <label className={lbl}>Old Patient</label>
                <Controller
                  control={control}
                  name="isOldPatient"
                  render={({ field }) => (
                    <Select
                      value={field.value ? "yes" : "no"}
                      onValueChange={(v) => field.onChange(v === "yes")}
                    >
                      <SelectTrigger className={sel}>
                        <SelectValue>{field.value ? "Yes" : "No"}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no">No</SelectItem>
                        <SelectItem value="yes">Yes</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            {/* Live Consultation */}
            <div>
              <label className={lbl}>Live Consultation</label>
              <Controller
                control={control}
                name="liveConsultation"
                render={({ field }) => (
                  <Select
                    value={field.value ? "yes" : "no"}
                    onValueChange={(v) => field.onChange(v === "yes")}
                  >
                    <SelectTrigger className={sel}>
                      <SelectValue>{field.value ? "Yes" : "No"}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no">No</SelectItem>
                      <SelectItem value="yes">Yes</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Consultant Doctor */}
            <div>
              <label className={lbl}>Consultant Doctor</label>
              <Controller
                control={control}
                name="doctorId"
                render={({ field }) => (
                  <SearchableSelect
                    value={field.value}
                    onValueChange={(v) => field.onChange(v)}
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
                )}
              />
            </div>

            {/* Divider */}
            <div className="pt-1 border-t border-gray-200">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                Billing
              </p>
            </div>

            {/* Charge Category | Apply TPA */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Charge Category</label>
                <Controller
                  control={control}
                  name="categoryId"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(v) => field.onChange(v ?? "")}
                    >
                      <SelectTrigger className={sel}>
                        <SelectValue>
                          {field.value
                            ? (categories.find((c) => c._id === field.value)
                                ?.name ?? "Select")
                            : "Select"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c._id} value={c._id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer select-none text-sm font-medium text-gray-700 h-9 px-3 rounded-lg border border-gray-200 bg-white w-full">
                  <Controller
                    control={control}
                    name="applyTpa"
                    render={({ field }) => (
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(v) => field.onChange(Boolean(v))}
                      />
                    )}
                  />
                  Apply TPA
                </label>
              </div>
            </div>

            {/* Charge Name | Standard Charge */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Charge Name</label>
                <Input
                  className={inp}
                  placeholder="OPD Consultation"
                  {...register("chargeItem")}
                />
              </div>
              <div>
                <label className={lbl}>Standard ({sym})</label>
                <Input
                  className={`${inp} bg-gray-50 text-gray-500`}
                  value={standardCharge}
                  readOnly
                  tabIndex={-1}
                />
              </div>
            </div>

            {/* Applied Charge | Discount */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Applied ({sym})</label>
                <Input
                  className={inp}
                  type="number"
                  min="0"
                  placeholder="0"
                  {...register("appliedCharge")}
                />
              </div>
              <div>
                <label className={lbl}>Discount ({sym})</label>
                <Input
                  className={inp}
                  type="number"
                  min="0"
                  placeholder="0"
                  {...register("discount")}
                />
              </div>
            </div>

            {/* Tax | Amount */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Tax (%)</label>
                <div className="relative">
                  <Input
                    className={`${inp} pr-8`}
                    type="number"
                    min="0"
                    placeholder="0"
                    {...register("tax")}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                    %
                  </span>
                </div>
              </div>
              <div>
                <label className={lbl}>Amount ({sym})</label>
                <Input
                  className={`${inp} bg-primary-50 text-primary-800 font-bold border-primary-200`}
                  value={amount > 0 ? `${sym} ${amount.toFixed(2)}` : ""}
                  readOnly
                  tabIndex={-1}
                />
              </div>
            </div>

            {/* Payment Mode | Paid Amount */}
            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-gray-200">
              <div>
                <label className={lbl}>Payment Mode</label>
                <Controller
                  control={control}
                  name="paymentMode"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(v) => field.onChange(v ?? "")}
                    >
                      <SelectTrigger className={sel}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_MODES.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div>
                <label className={lbl}>Paid ({sym})</label>
                <Input
                  className={inp}
                  type="number"
                  min="0"
                  placeholder="0"
                  {...register("paidAmount")}
                />
              </div>
            </div>
          </>
        }
        footer={
          <>
            <Button
              className="h-9 px-5 text-sm gap-2 bg-primary-600 hover:bg-primary-700"
              disabled={isSubmitting}
              onClick={submit(true)}
            >
              <Printer className="w-4 h-4" />
              {isSubmitting ? "Saving…" : "Save & Print"}
            </Button>
            <Button
              className="h-9 px-6 text-sm bg-success-600 hover:bg-success-700"
              disabled={isSubmitting}
              onClick={submit(false)}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Save"
              )}
            </Button>
          </>
        }
      />

      {/* Add Patient dialog */}
      <FormDialog
        open={showAddPatient}
        onClose={() => setShowAddPatient(false)}
        title="Add New Patient"
        contentClassName="w-[95vw] sm:max-w-3xl"
      >
        <div className="px-5 py-4 max-h-[75vh] overflow-y-auto">
          <PatientForm
            onClose={() => setShowAddPatient(false)}
            onSave={async (body: PatientFormData) => {
              const res = await apiClient.post<PatientOption>(
                "/api/dashboard/patients",
                body,
              );
              if (!res.success) {
                toast.error(res.error ?? "Failed to create patient");
                throw new Error(res.error);
              }
              toast.success(`Patient "${res.data.name}" added`);
              selectPatient({
                _id: res.data._id,
                name: res.data.name,
                uhid: res.data.uhid,
                age: res.data.age ?? 0,
                ageMonths: res.data.ageMonths,
                gender: res.data.gender,
                phone: res.data.phone,
                email: res.data.email,
                guardianName: res.data.guardianName,
                bloodGroup: res.data.bloodGroup,
                address: res.data.address,
                allergies: res.data.allergies,
                nationalId: res.data.nationalId,
                tpa: res.data.tpa,
                tpaId: res.data.tpaId,
                tpaValidity: res.data.tpaValidity,
                remarks: res.data.remarks,
              });
              setShowAddPatient(false);
            }}
          />
        </div>
      </FormDialog>
    </>
  );
}
