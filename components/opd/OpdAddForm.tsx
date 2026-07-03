"use client";

import { useEffect, useState } from "react";
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
import { printOpdReceipt } from "@/components/patients/OpdReceiptPrinter";
import {
  PatientForm,
  type PatientFormData,
} from "@/components/patients/PatientForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { todayString } from "@/lib/format";
import { apiClient } from "@/lib/apiClient";
import type { ChargeLookup } from "@/lib/types/charges";
import type { PatientOption } from "@/lib/types/patient";
import { FullScreenFormShell } from "@/components/common/FullScreenFormShell";
import type { Doctor } from "@/components/opd/types";

const PAYMENT_MODES = ["CASH", "CARD", "UPI", "CHEQUE", "ONLINE"];

export function OpdAddForm({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const { tenant } = useApp();
  const { sym } = useCurrency();

  const [selectedPatient, setSelectedPatient] = useState<PatientOption | null>(
    null,
  );
  const [showAddPatient, setShowAddPatient] = useState(false);

  // reference data
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [categories, setCategories] = useState<ChargeLookup[]>([]);

  // form state
  const [visitDate, setVisitDate] = useState(todayString());
  const [caseNumber, setCaseNumber] = useState("");
  const [casualty, setCasualty] = useState(false);
  const [isOldPatient, setIsOldPatient] = useState(false);
  const [reference, setReference] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [applyTpa, setApplyTpa] = useState(false);
  const [chargeItem, setChargeItem] = useState("");
  const [standardCharge, setStandardCharge] = useState("");
  const [appliedCharge, setAppliedCharge] = useState("");
  const [discount, setDiscount] = useState("0");
  const [tax, setTax] = useState("0");
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [paidAmount, setPaidAmount] = useState("");
  const [liveConsultation, setLiveConsultation] = useState(false);
  const [symptomsType, setSymptomsType] = useState("");
  const [symptomsTitle, setSymptomsTitle] = useState("");
  const [symptomsDescription, setSymptomsDescription] = useState("");
  const [note, setNote] = useState("");
  const [knownAllergies, setKnownAllergies] = useState("");
  const [previousMedicalIssue, setPreviousMedicalIssue] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // computed amount
  const applied = Number(appliedCharge) || 0;
  const disc = Number(discount) || 0;
  const taxPct = Number(tax) || 0;
  const amount = Math.max(
    0,
    applied - disc + ((applied - disc) * taxPct) / 100,
  );

  useEffect(() => {
    Promise.all([
      apiClient.get<Doctor[]>("/api/dashboard/doctors"),
      apiClient.get<ChargeLookup[]>("/api/dashboard/charges?module=opd"),
    ]).then(([docData, chargeData]) => {
      if (docData.success) setDoctors(docData.data);
      if (chargeData.success)
        setCategories(chargeData.data.filter((c: ChargeLookup) => c.isActive));
    });
  }, []);

  // auto-fill standard charge when category changes
  useEffect(() => {
    const cat = categories.find((c) => c._id === categoryId);
    if (cat) {
      setChargeItem(cat.name);
      setStandardCharge(String(cat.standardCharge));
      setAppliedCharge(String(cat.standardCharge));
      setTax(String(cat.taxPercent ?? 0));
    }
  }, [categoryId, categories]);

  // auto-fill paid amount = amount
  useEffect(() => {
    if (amount > 0) setPaidAmount(String(Math.round(amount)));
  }, [amount]);

  function selectPatient(p: PatientOption) {
    setSelectedPatient(p);
    if (p.allergies) setKnownAllergies(p.allergies);
  }

  async function handleSubmit(print = false) {
    if (!selectedPatient) {
      toast.error("Please select a patient");
      return;
    }
    if (!visitDate) {
      toast.error("Appointment date is required");
      return;
    }
    setSubmitting(true);
    try {
      const chargeLines = chargeItem
        ? [
            {
              categoryId: categoryId || undefined,
              name: chargeItem,
              fee: Number(appliedCharge) || 0,
            },
          ]
        : [];
      const res = await apiClient.post<{
        opdNumber: number;
        doctor?: { name: string; specialization: string };
      }>("/api/dashboard/opd", {
        patientId: selectedPatient._id,
        doctorId: doctorId || undefined,
        visitDate,
        chiefComplaint: symptomsDescription.trim() || symptomsTitle.trim(),
        symptomsType: symptomsType.trim(),
        symptomsTitle: symptomsTitle.trim(),
        note: note.trim(),
        knownAllergiesOverride: knownAllergies.trim(),
        previousMedicalIssue: previousMedicalIssue.trim(),
        caseNumber: caseNumber.trim(),
        reference: reference.trim(),
        casualty,
        isOldPatient,
        liveConsultation,
        applyTpa,
        charges: chargeLines,
        totalFee: amount || Number(appliedCharge) || 0,
        appliedCharge: Number(appliedCharge) || undefined,
        discount: Number(discount) || 0,
        tax: Number(tax) || 0,
        paymentMode,
        paidAmount: Number(paidAmount) || 0,
      });
      if (!res.success) {
        toast.error(res.error);
        return;
      }

      const { opdNumber, doctor } = res.data;
      toast.success(`OPD #${String(opdNumber).padStart(3, "0")} created`);

      if (print) {
        const now = new Date();
        printOpdReceipt({
          opdNumber,
          caseNumber: caseNumber.trim() || undefined,
          visitDate: visitDate,
          visitTime: now.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }),
          patientName: selectedPatient.name,
          patientCode: selectedPatient.patientCode,
          patientAge: selectedPatient.age,
          patientAgeMonths: selectedPatient.ageMonths,
          patientAgeDays: (
            selectedPatient as PatientOption & { ageDays?: number }
          ).ageDays,
          patientGender: selectedPatient.gender,
          patientBloodGroup: selectedPatient.bloodGroup,
          patientAllergies: knownAllergies.trim() || selectedPatient.allergies,
          patientAddress: selectedPatient.address,
          previousMedicalIssue: previousMedicalIssue.trim() || undefined,
          doctorName: doctor?.name,
          doctorSpecialization: doctor?.specialization,
          chiefComplaint: symptomsDescription.trim() || symptomsTitle.trim(),
          charges: chargeLines,
          appliedCharge: Number(appliedCharge) || undefined,
          discount: Number(discount) || 0,
          tax: Number(tax) || 0,
          totalFee: amount || Number(appliedCharge) || 0,
          clinicName: tenant?.name ?? "Clinic",
          clinicAddress: tenant?.address || undefined,
          logoUrl: tenant?.logoUrl || undefined,
        });
      }

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
        onPatientChange={selectPatient}
        onAddPatient={() => setShowAddPatient(true)}
        onClose={onClose}
        left={
          <>
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

            <div>
              <label className={lbl}>Any Known Allergies</label>
              <Textarea
                rows={3}
                className="text-sm resize-none w-full"
                value={knownAllergies}
                onChange={(e) => setKnownAllergies(e.target.value)}
                placeholder="Penicillin, Aspirin…"
              />
            </div>

            <div>
              <label className={lbl}>Previous Medical Issue</label>
              <Textarea
                rows={3}
                className="text-sm resize-none w-full"
                value={previousMedicalIssue}
                onChange={(e) => setPreviousMedicalIssue(e.target.value)}
                placeholder="Diabetes, Hypertension…"
              />
            </div>

            <div>
              <label className={lbl}>Note</label>
              <Textarea
                rows={4}
                className="text-sm resize-none w-full"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </>
        }
        right={
          <>
            {/* Appointment Date */}
            <div>
              <label className={lbl}>
                Appointment Date <span className="text-danger-500">*</span>
              </label>
              <Input
                type="date"
                className={inp}
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
              />
            </div>

            {/* Case | Reference */}
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
                <label className={lbl}>Reference</label>
                <Input
                  className={inp}
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
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

            {/* Consultant Doctor */}
            <div>
              <label className={lbl}>Consultant Doctor</label>
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
                <Select
                  value={categoryId}
                  onValueChange={(v) => setCategoryId(v ?? "")}
                >
                  <SelectTrigger className={sel}>
                    <SelectValue>
                      {categoryId
                        ? (categories.find((c) => c._id === categoryId)?.name ??
                          "Select")
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
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer select-none text-sm font-medium text-gray-700 h-9 px-3 rounded-lg border border-gray-200 bg-white w-full">
                  <Checkbox
                    checked={applyTpa}
                    onCheckedChange={(v) => setApplyTpa(Boolean(v))}
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
                  value={chargeItem}
                  onChange={(e) => setChargeItem(e.target.value)}
                  placeholder="OPD Consultation"
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
                  value={appliedCharge}
                  onChange={(e) => setAppliedCharge(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <label className={lbl}>Discount ({sym})</label>
                <Input
                  className={inp}
                  type="number"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder="0"
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
                    value={tax}
                    onChange={(e) => setTax(e.target.value)}
                    placeholder="0"
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
                <Select
                  value={paymentMode}
                  onValueChange={(v) => setPaymentMode(v ?? "")}
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
              </div>
              <div>
                <label className={lbl}>Paid ({sym})</label>
                <Input
                  className={inp}
                  type="number"
                  min="0"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
          </>
        }
        footer={
          <>
            <Button
              className="h-9 px-5 text-sm gap-2 bg-primary-600 hover:bg-primary-700"
              disabled={submitting}
              onClick={() => handleSubmit(true)}
            >
              <Printer className="w-4 h-4" />
              {submitting ? "Saving…" : "Save & Print"}
            </Button>
            <Button
              className="h-9 px-6 text-sm bg-success-600 hover:bg-success-700"
              disabled={submitting}
              onClick={() => handleSubmit(false)}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Save"
              )}
            </Button>
          </>
        }
      />

      {/* Add Patient dialog */}
      <Dialog
        open={showAddPatient}
        onOpenChange={(open) => !open && setShowAddPatient(false)}
      >
        <DialogContent className="w-[95vw] sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Add New Patient</DialogTitle>
          </DialogHeader>
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
                patientCode: res.data.patientCode,
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
        </DialogContent>
      </Dialog>
    </>
  );
}
