"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormDialog } from "@/components/common/FormDialog";
import { apiClient } from "@/lib/apiClient";
import { usePharmacyMasters } from "@/lib/lookups";
import type { Medicine } from "./types";

export function MedicineModal({
  open,
  medicine,
  onClose,
  onSaved,
}: {
  open: boolean;
  medicine?: Medicine | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!medicine;

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [company, setCompany] = useState("");
  const [composition, setComposition] = useState("");
  const [group, setGroup] = useState("");
  const [unit, setUnit] = useState("");
  const [minLevel, setMinLevel] = useState<number | "">("");
  const [reorderLevel, setReorderLevel] = useState<number | "">("");
  const [taxPercent, setTaxPercent] = useState<number | "">("");
  const [boxPacking, setBoxPacking] = useState("");
  const [vatAC, setVatAC] = useState("");
  const [rackNumber, setRackNumber] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const { data: categoriesData } = usePharmacyMasters("category");
  const { data: companiesData } = usePharmacyMasters("company");
  const { data: groupsData } = usePharmacyMasters("group");
  const { data: unitsData } = usePharmacyMasters("unit");
  const categories = categoriesData ?? [];
  const companies = companiesData ?? [];
  const groups = groupsData ?? [];
  const units = unitsData ?? [];

  useEffect(() => {
    if (medicine) {
      setName(medicine.name);
      setCategory(medicine.category ?? "");
      setCompany(medicine.company ?? "");
      setComposition(medicine.composition ?? "");
      setGroup(medicine.group ?? "");
      setUnit(medicine.unit ?? "");
      setMinLevel(medicine.minLevel ?? "");
      setReorderLevel(medicine.reorderLevel ?? "");
      setTaxPercent(medicine.taxPercent ?? "");
      setBoxPacking(medicine.boxPacking ?? "");
      setVatAC(medicine.vatAC ?? "");
      setRackNumber(medicine.rackNumber ?? "");
      setNote(medicine.note ?? "");
    } else {
      setName("");
      setCategory("");
      setCompany("");
      setComposition("");
      setGroup("");
      setUnit("");
      setMinLevel("");
      setReorderLevel("");
      setTaxPercent("");
      setBoxPacking("");
      setVatAC("");
      setRackNumber("");
      setNote("");
    }
  }, [medicine, open]);

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Medicine name is required");
      return;
    }
    if (!category.trim()) {
      toast.error("Medicine category is required");
      return;
    }
    if (!unit.trim()) {
      toast.error("Unit is required");
      return;
    }
    if (!boxPacking.trim()) {
      toast.error("Box/Packing is required");
      return;
    }
    setSaving(true);
    try {
      const data = await apiClient[isEdit ? "patch" : "post"](
        "/api/dashboard/pharmacy/medicines",
        {
          ...(isEdit && { id: medicine!._id }),
          name: name.trim(),
          category,
          company,
          composition: composition.trim(),
          group,
          unit,
          minLevel: Number(minLevel) || 0,
          reorderLevel: Number(reorderLevel) || 0,
          taxPercent: Number(taxPercent) || 0,
          boxPacking: boxPacking.trim(),
          vatAC: vatAC.trim(),
          rackNumber: rackNumber.trim(),
          note: note.trim(),
        },
      );
      if (!data.success) {
        toast.error(data.error);
        throw new Error(data.error);
      }
      queryClient.invalidateQueries({ queryKey: ["medicines"] });
      toast.success(isEdit ? "Medicine updated" : "Medicine added");
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Medicine Details" : "Add Medicine Details"}
      contentClassName="sm:w-[min(92vw,1100px)]"
      footer={
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-primary-600 hover:bg-primary-700 flex items-center gap-1.5"
        >
          {saving ? (
            "Saving…"
          ) : (
            <>
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Save
            </>
          )}
        </Button>
      }
    >
      <div className="px-5 py-4 space-y-3">
        <div className="grid grid-cols-4 gap-3">
          <div>
            <Label className="text-xs font-medium text-gray-700 mb-1 whitespace-nowrap">
              Medicine Name <span className="text-danger-500">*</span>
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-700 mb-1 whitespace-nowrap">
              Medicine Category <span className="text-danger-500">*</span>
            </Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v ?? "")}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c._id} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-700 mb-1 whitespace-nowrap">
              Medicine Company
            </Label>
            <Select value={company} onValueChange={(v) => setCompany(v ?? "")}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c._id} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-700 mb-1 whitespace-nowrap">
              Medicine Composition
            </Label>
            <Input
              value={composition}
              onChange={(e) => setComposition(e.target.value)}
              className="h-9"
            />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <div>
            <Label className="text-xs font-medium text-gray-700 mb-1 whitespace-nowrap">
              Medicine Group
            </Label>
            <Select value={group} onValueChange={(v) => setGroup(v ?? "")}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((g) => (
                  <SelectItem key={g._id} value={g.name}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-700 mb-1 whitespace-nowrap">
              Unit <span className="text-danger-500">*</span>
            </Label>
            <Select value={unit} onValueChange={(v) => setUnit(v ?? "")}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {units.map((u) => (
                  <SelectItem key={u._id} value={u.name}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-700 mb-1 whitespace-nowrap">
              Min Level
            </Label>
            <Input
              type="number"
              min="0"
              value={minLevel}
              onChange={(e) =>
                setMinLevel(e.target.value === "" ? "" : Number(e.target.value))
              }
              className="h-9"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-700 mb-1 whitespace-nowrap">
              Re-Order Level
            </Label>
            <Input
              type="number"
              min="0"
              value={reorderLevel}
              onChange={(e) =>
                setReorderLevel(
                  e.target.value === "" ? "" : Number(e.target.value),
                )
              }
              className="h-9"
            />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <div>
            <Label className="text-xs font-medium text-gray-700 mb-1 whitespace-nowrap">
              Tax
            </Label>
            <div className="relative">
              <Input
                type="number"
                min="0"
                value={taxPercent}
                onChange={(e) =>
                  setTaxPercent(
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
                className="h-9 pr-7"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                %
              </span>
            </div>
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-700 mb-1 whitespace-nowrap">
              Box/Packing <span className="text-danger-500">*</span>
            </Label>
            <Input
              value={boxPacking}
              onChange={(e) => setBoxPacking(e.target.value)}
              className="h-9"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-700 mb-1 whitespace-nowrap">
              VAT A/C
            </Label>
            <Input
              value={vatAC}
              onChange={(e) => setVatAC(e.target.value)}
              className="h-9"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-700 mb-1 whitespace-nowrap">
              Rack Number
            </Label>
            <Input
              value={rackNumber}
              onChange={(e) => setRackNumber(e.target.value)}
              className="h-9"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs font-medium text-gray-700 mb-1 whitespace-nowrap">
              Note
            </Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="text-sm resize-none"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-700 mb-1 whitespace-nowrap">
              Medicine Photo ( JPG | JPEG | PNG )
            </Label>
            <div className="border border-gray-300 rounded flex items-center justify-center gap-2 text-gray-400 text-sm cursor-pointer hover:bg-gray-50 h-22">
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                />
              </svg>
              Drop a file here or click
            </div>
          </div>
        </div>
      </div>
    </FormDialog>
  );
}
