"use client";

import { useEffect, useMemo } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
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
import { INDIAN_STATES } from "@/lib/constants/indianStates";
import { INDIAN_CITIES_BY_STATE } from "@/lib/constants/indianCities";

const STATE_OPTIONS = INDIAN_STATES.map((s) => ({ value: s, label: s }));

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
  city?: string;
  state?: string;
  pincode?: string;
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
// string since they're bound directly to controlled inputs — numeric fields get
// coerced back to numbers on submit.
type FormValues = {
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
  city: string;
  state: string;
  pincode: string;
  remarks: string;
  allergies: string;
  tpa: string;
  tpaId: string;
  tpaValidity: string;
  tpaCompanyId: string;
  tpaPolicyNo: string;
  tpaSumInsured: string;
  tpaRoomRentLimit: string;
  nationalId: string;
  alternateNumber: string;
  languagePref: "hi" | "en";
};

function buildInitialValues(initial?: Partial<PatientFormData>): FormValues {
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
    city: initial?.city ?? "",
    state: initial?.state ?? "",
    pincode: initial?.pincode ?? "",
    remarks: initial?.remarks ?? "",
    allergies: initial?.allergies ?? "",
    tpa: initial?.tpa ?? "",
    tpaId: initial?.tpaId ?? "",
    tpaValidity: initial?.tpaValidity ?? "",
    tpaCompanyId: initial?.tpaCompanyId ?? "",
    tpaPolicyNo: initial?.tpaPolicyNo ?? "",
    tpaSumInsured: String(initial?.tpaSumInsured ?? ""),
    tpaRoomRentLimit: String(initial?.tpaRoomRentLimit ?? ""),
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
  const { data: tpaCompanies = [] } = useTpaCompanies();
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { isSubmitting },
  } = useForm<FormValues>({ defaultValues: buildInitialValues(initial) });

  const dateOfBirth = useWatch({ control, name: "dateOfBirth" });
  const selectedState = useWatch({ control, name: "state" });

  const cityOptions = useMemo(() => {
    const cities = INDIAN_CITIES_BY_STATE[selectedState] ?? [];
    return cities.map((c) => ({ value: c, label: c }));
  }, [selectedState]);

  // Auto-calculate age fields whenever DOB changes
  useEffect(() => {
    if (!dateOfBirth) return;
    const birth = new Date(dateOfBirth);
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
      setValue("age", String(years));
      setValue("ageMonths", String(months));
      setValue("ageDays", String(days));
    }
  }, [dateOfBirth, setValue]);

  const onSubmit = handleSubmit(
    async (form) => {
      await onSave({
        ...form,
        age: Number(form.age) || 0,
        ageMonths: Number(form.ageMonths) || 0,
        ageDays: Number(form.ageDays) || 0,
        tpaCompanyId: form.tpaCompanyId || undefined,
        tpaPolicyNo: form.tpaPolicyNo || undefined,
        tpaSumInsured: form.tpaSumInsured ? Number(form.tpaSumInsured) : undefined,
        tpaRoomRentLimit: form.tpaRoomRentLimit
          ? Number(form.tpaRoomRentLimit)
          : undefined,
      });
      onClose();
    },
    (errors) => {
      const message =
        errors.name?.message ?? errors.gender?.message ?? errors.phone?.message;
      if (message) toast.error(message);
    },
  );

  const lbl =
    "block text-2xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5";
  const inp = "h-9 text-sm w-full";

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-0">
      <div className="overflow-y-auto max-h-[62vh] px-0.5 pb-2">
        <div className="grid grid-cols-12 gap-x-3 gap-y-4">
          {/* Patient info */}
          <div className="col-span-6">
            <label className={lbl}>{t("nameLabel")} *</label>
            <Input
              placeholder={t("namePlaceholder")}
              className={inp}
              autoFocus
              {...register("name", { required: t("nameRequired") })}
            />
          </div>
          <div className="col-span-6">
            <label className={lbl}>{t("guardianNameLabel")}</label>
            <Input className={inp} {...register("guardianName")} />
          </div>

          {/* Demographics */}
          <div className="col-span-2">
            <label className={lbl}>{t("genderLabel")} *</label>
            <Controller
              control={control}
              name="gender"
              rules={{ required: "Gender is required" }}
              render={({ field }) => (
                <Select value={field.value} onValueChange={(v) => field.onChange(v ?? "")}>
                  <SelectTrigger className={inp}>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">{t("genderMale")}</SelectItem>
                    <SelectItem value="Female">{t("genderFemale")}</SelectItem>
                    <SelectItem value="Other">{t("genderOther")}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="col-span-3">
            <label className={lbl}>{t("dobLabel")}</label>
            <Input type="date" className={inp} {...register("dateOfBirth")} />
          </div>
          <div className="col-span-3">
            <label className={lbl}>Age (Years) *</label>
            <Input
              type="number"
              placeholder="Years"
              min={0}
              max={120}
              className={inp}
              {...register("age")}
            />
          </div>
          <div className="col-span-2">
            <label className={lbl}>{t("bloodGroupLabel")}</label>
            <Controller
              control={control}
              name="bloodGroup"
              render={({ field }) => (
                <Select value={field.value} onValueChange={(v) => field.onChange(v ?? "")}>
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
              )}
            />
          </div>
          <div className="col-span-2">
            <label className={lbl}>{t("maritalStatusLabel")}</label>
            <Controller
              control={control}
              name="maritalStatus"
              render={({ field }) => (
                <Select value={field.value} onValueChange={(v) => field.onChange(v ?? "")}>
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
              )}
            />
          </div>

          {/* Contact */}
          <div className="col-span-12 border-t border-gray-100" />
          <div className="col-span-4">
            <label className={lbl}>{t("phoneLabel")} *</label>
            <Input
              placeholder="e.g. 9876543210"
              className={inp}
              {...register("phone", { required: "Phone number is required" })}
            />
          </div>
          <div className="col-span-4">
            <label className={lbl}>{t("emailLabel")}</label>
            <Input type="email" className={inp} {...register("email")} />
          </div>
          <div className="col-span-4">
            <label className={lbl}>{t("addressLabel")}</label>
            <Input className={inp} {...register("address")} />
          </div>

          <div className="col-span-4">
            <label className={lbl}>State</label>
            <Controller
              control={control}
              name="state"
              render={({ field }) => (
                <SearchableSelect
                  value={field.value}
                  onValueChange={(v) => {
                    field.onChange(v);
                    setValue("city", "");
                  }}
                  options={STATE_OPTIONS}
                  placeholder="Select state…"
                  triggerClassName={inp}
                />
              )}
            />
          </div>
          <div className="col-span-4">
            <label className={lbl}>City</label>
            <Controller
              control={control}
              name="city"
              render={({ field }) => (
                <SearchableSelect
                  value={field.value}
                  onValueChange={field.onChange}
                  options={cityOptions}
                  placeholder={selectedState ? "Select city…" : "Select state first"}
                  triggerClassName={inp}
                  disabled={!selectedState}
                />
              )}
            />
          </div>
          <div className="col-span-4">
            <label className={lbl}>Pincode</label>
            <Input
              inputMode="numeric"
              maxLength={6}
              className={inp}
              {...register("pincode")}
              onChange={(e) =>
                setValue("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))
              }
            />
          </div>

          {/* Medical */}
          <div className="col-span-12 border-t border-gray-100" />
          <div className="col-span-6">
            <label className={lbl}>{t("remarksLabel")}</label>
            <Textarea
              rows={2}
              className="resize-none text-sm"
              {...register("remarks")}
            />
          </div>
          <div className="col-span-6">
            <label className={lbl}>{t("allergiesLabel")}</label>
            <Textarea
              rows={2}
              className="resize-none text-sm"
              {...register("allergies")}
            />
          </div>

          {/* Insurance / TPA */}
          <div className="col-span-12 border-t border-gray-100" />
          <div className="col-span-6">
            <label className={lbl}>TPA / Insurer</label>
            <Controller
              control={control}
              name="tpaCompanyId"
              render={({ field }) => (
                <SearchableSelect
                  options={tpaCompanies
                    .filter((c) => c.isActive)
                    .map((c) => ({ value: c._id, label: `${c.name} (${c.code})` }))}
                  value={field.value}
                  onValueChange={(v) => {
                    const id = v ?? "";
                    const found = tpaCompanies.find((c) => c._id === id);
                    field.onChange(id);
                    if (found) setValue("tpa", found.name);
                  }}
                  placeholder="Select TPA / Insurer"
                  triggerClassName={inp}
                />
              )}
            />
          </div>
          <div className="col-span-6">
            <label className={lbl}>Policy / Member No.</label>
            <Input
              placeholder="Policy number"
              className={inp}
              {...register("tpaPolicyNo")}
            />
          </div>
          <div className="col-span-4">
            <label className={lbl}>{t("tpaIdLabel")} (Card No.)</label>
            <Input
              placeholder="TPA card / member ID"
              className={inp}
              {...register("tpaId")}
            />
          </div>
          <div className="col-span-4">
            <label className={lbl}>Sum Insured (₹)</label>
            <Input
              type="number"
              placeholder="0"
              className={inp}
              {...register("tpaSumInsured")}
            />
          </div>
          <div className="col-span-4">
            <label className={lbl}>Room Rent Limit (₹/day)</label>
            <Input
              type="number"
              placeholder="0"
              className={inp}
              {...register("tpaRoomRentLimit")}
            />
          </div>
          <div className="col-span-4">
            <label className={lbl}>{t("tpaValidityLabel")}</label>
            <Input
              placeholder="YYYY-MM-DD"
              className={inp}
              {...register("tpaValidity")}
            />
          </div>

          {/* Other */}
          <div className="col-span-12 border-t border-gray-100" />
          <div className="col-span-6">
            <label className={lbl}>{t("nationalIdLabel")}</label>
            <Input className={inp} {...register("nationalId")} />
          </div>
          <div className="col-span-6" />

          <div className="col-span-6">
            <label className={lbl}>{t("alternateNumberLabel")}</label>
            <Input className={inp} {...register("alternateNumber")} />
          </div>
          <div className="col-span-6" />
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
          disabled={isSubmitting}
        >
          {isSubmitting ? t("saving") : t("save")}
        </Button>
      </div>
    </form>
  );
}
