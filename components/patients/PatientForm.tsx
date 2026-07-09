"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useTpaCompanies } from "@/lib/lookups";

export interface PatientFormData {
  name: string;
  guardianName?: string;
  gender?: string;
  dateOfBirth?: string;
  age: number;
  ageMonths: number;
  ageDays: number;
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
  tpaCompanyId?: string;
  tpaPolicyNo?: string;
  tpaSumInsured?: number;
  tpaRoomRentLimit?: number;
  nationalId?: string;
  alternateNumber?: string;
  languagePref: "hi" | "en";
}

// Same fields as PatientFormData, but every field is a plain (always-defined)
// string since they're bound directly to controlled inputs — age fields get
// coerced back to numbers on submit.
type FormState = {
  name: string;
  guardianName: string;
  gender: string;
  dateOfBirth: string;
  age: string;
  ageMonths: string;
  ageDays: string;
  bloodGroup: string;
  maritalStatus: string;
  phone: string;
  email: string;
  address: string;
  remarks: string;
  allergies: string;
  tpa: string;
  tpaId: string;
  tpaValidity: string;
  nationalId: string;
  alternateNumber: string;
  languagePref: "hi" | "en";
};

function buildInitialState(initial?: Partial<PatientFormData>): FormState {
  return {
    name: initial?.name ?? "",
    guardianName: initial?.guardianName ?? "",
    gender: initial?.gender ?? "",
    dateOfBirth: initial?.dateOfBirth ?? "",
    age: String(initial?.age || ""),
    ageMonths: String(initial?.ageMonths || ""),
    ageDays: String(initial?.ageDays || ""),
    bloodGroup: initial?.bloodGroup ?? "",
    maritalStatus: initial?.maritalStatus ?? "",
    phone: initial?.phone ?? "",
    email: initial?.email ?? "",
    address: initial?.address ?? "",
    remarks: initial?.remarks ?? "",
    allergies: initial?.allergies ?? "",
    tpa: initial?.tpa ?? "",
    tpaId: initial?.tpaId ?? "",
    tpaValidity: initial?.tpaValidity ?? "",
    nationalId: initial?.nationalId ?? "",
    alternateNumber: initial?.alternateNumber ?? "",
    languagePref: initial?.languagePref ?? "hi",
  };
}

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

export function PatientForm({
  initial,
  onSave,
  onClose,
}: {
  initial?: Partial<PatientFormData>;
  onSave: (data: PatientFormData) => Promise<void>;
  onClose: () => void;
}) {
  const t = useTranslations("patients");
  const [form, setForm] = useState<FormState>(() => buildInitialState(initial));
  const [saving, setSaving] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // Auto-calculate age fields whenever DOB changes
  useEffect(() => {
    if (!form.dateOfBirth) return;
    const birth = new Date(form.dateOfBirth);
    if (isNaN(birth.getTime())) return;
    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();
    let days = now.getDate() - birth.getDate();
    if (days < 0) {
      months--;
      days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    }
    if (months < 0) {
      years--;
      months += 12;
    }
    if (years >= 0) {
      setForm((prev) => ({
        ...prev,
        age: String(years),
        ageMonths: String(months),
        ageDays: String(days),
      }));
    }
  }, [form.dateOfBirth]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error(t("nameRequired"));
      return;
    }
    if (!form.gender) {
      toast.error("Gender is required");
      return;
    }
    if (!form.phone.trim()) {
      toast.error("Phone number is required");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        ...form,
        age: Number(form.age) || 0,
        ageMonths: Number(form.ageMonths) || 0,
        ageDays: Number(form.ageDays) || 0,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const lbl =
    "block text-2xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5";
  const inp = "h-9 text-sm w-full";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-0">
      <div className="overflow-y-auto max-h-[62vh] px-0.5 pb-2">
        <div className="grid grid-cols-12 gap-x-3 gap-y-4">
          {/* Patient info */}
          <div className="col-span-6">
            <label className={lbl}>{t("nameLabel")} *</label>
            <Input
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder={t("namePlaceholder")}
              className={inp}
              autoFocus
            />
          </div>
          <div className="col-span-6">
            <label className={lbl}>{t("guardianNameLabel")}</label>
            <Input
              value={form.guardianName}
              onChange={(e) => update("guardianName", e.target.value)}
              className={inp}
            />
          </div>

          {/* Demographics */}
          <div className="col-span-2">
            <label className={lbl}>{t("genderLabel")} *</label>
            <Select
              value={form.gender}
              onValueChange={(v) => update("gender", v ?? "")}
            >
              <SelectTrigger className={inp}>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">{t("genderMale")}</SelectItem>
                <SelectItem value="Female">{t("genderFemale")}</SelectItem>
                <SelectItem value="Other">{t("genderOther")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-3">
            <label className={lbl}>{t("dobLabel")}</label>
            <Input
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => update("dateOfBirth", e.target.value)}
              className={inp}
            />
          </div>
          <div className="col-span-3">
            <label className={lbl}>Age (Years) *</label>
            <Input
              type="number"
              value={form.age}
              onChange={(e) => update("age", e.target.value)}
              placeholder="Years"
              min={0}
              max={120}
              className={inp}
            />
          </div>
          <div className="col-span-2">
            <label className={lbl}>{t("bloodGroupLabel")}</label>
            <Select
              value={form.bloodGroup}
              onValueChange={(v) => update("bloodGroup", v ?? "")}
            >
              <SelectTrigger className={inp}>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {BLOOD_GROUPS.map((bg) => (
                  <SelectItem key={bg} value={bg}>
                    {bg}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <label className={lbl}>{t("maritalStatusLabel")}</label>
            <Select
              value={form.maritalStatus}
              onValueChange={(v) => update("maritalStatus", v ?? "")}
            >
              <SelectTrigger className={inp}>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Single">Single</SelectItem>
                <SelectItem value="Married">Married</SelectItem>
                <SelectItem value="Divorced">Divorced</SelectItem>
                <SelectItem value="Widowed">Widowed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Contact */}
          <div className="col-span-12 border-t border-gray-100" />
          <div className="col-span-4">
            <label className={lbl}>{t("phoneLabel")} *</label>
            <Input
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              className={inp}
              placeholder="e.g. 9876543210"
            />
          </div>
          <div className="col-span-4">
            <label className={lbl}>{t("emailLabel")}</label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              className={inp}
            />
          </div>
          <div className="col-span-4">
            <label className={lbl}>{t("addressLabel")}</label>
            <Input
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              className={inp}
            />
          </div>

          {/* Medical */}
          <div className="col-span-12 border-t border-gray-100" />
          <div className="col-span-6">
            <label className={lbl}>{t("remarksLabel")}</label>
            <Textarea
              value={form.remarks}
              onChange={(e) => update("remarks", e.target.value)}
              rows={2}
              className="resize-none text-sm"
            />
          </div>
          <div className="col-span-6">
            <label className={lbl}>{t("allergiesLabel")}</label>
            <Textarea
              value={form.allergies}
              onChange={(e) => update("allergies", e.target.value)}
              rows={2}
              className="resize-none text-sm"
            />
          </div>

          {/* Insurance / TPA */}
          <div className="col-span-12 border-t border-gray-100" />
          <div className="col-span-4">
            <label className={lbl}>{t("tpaLabel")}</label>
            <Select value={form.tpa} onValueChange={(v) => update("tpa", v ?? "")}>
              <SelectTrigger className={inp}>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="None">None</SelectItem>
                {TPA_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-4">
            <label className={lbl}>{t("tpaIdLabel")} (Card No.)</label>
            <Input
              value={form.tpaId}
              onChange={(e) => update("tpaId", e.target.value)}
              className={inp}
            />
          </div>
          <div className="col-span-4">
            <label className={lbl}>{t("tpaValidityLabel")}</label>
            <Input
              value={form.tpaValidity}
              onChange={(e) => update("tpaValidity", e.target.value)}
              placeholder="YYYY-MM-DD"
              className={inp}
            />
          </div>

          {/* Other */}
          <div className="col-span-6">
            <label className={lbl}>{t("nationalIdLabel")}</label>
            <Input
              value={form.nationalId}
              onChange={(e) => update("nationalId", e.target.value)}
              className={inp}
            />
          </div>
          <div className="col-span-6" />

          <div className="col-span-6">
            <label className={lbl}>{t("alternateNumberLabel")}</label>
            <Input
              value={form.alternateNumber}
              onChange={(e) => update("alternateNumber", e.target.value)}
              className={inp}
            />
          </div>
          <div className="col-span-6">
            <label className={lbl}>{t("langLabel")}</label>
            <Select
              value={form.languagePref}
              onValueChange={(v) =>
                update("languagePref", (v ?? "hi") as "hi" | "en")
              }
            >
              <SelectTrigger className={inp}>
                <SelectValue>
                  {form.languagePref === "hi" ? "हिंदी" : "English"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hi">हिंदी</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t border-gray-100 mt-2">
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
          className="flex-1 bg-primary-600 hover:bg-primary-700"
          disabled={saving}
        >
          {saving ? t("saving") : t("save")}
        </Button>
      </div>
    </form>
  );
}
