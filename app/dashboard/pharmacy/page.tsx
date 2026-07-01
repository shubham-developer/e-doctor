"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { apiClient } from "@/lib/apiClient";
import type { Medicine } from "@/lib/types/pharmacy";
import { BillsList } from "@/components/pharmacy/BillsList";
import { GenerateBillForm } from "@/components/pharmacy/GenerateBillForm";

export default function PharmacyPage() {
  const [showGenerateBill, setShowGenerateBill] = useState(false);
  const [nextBillNumber, setNextBillNumber] = useState(1);
  const [refreshToken, setRefreshToken] = useState(0);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [doctors, setDoctors] = useState<{ _id: string; name: string }[]>([]);

  useEffect(() => {
    apiClient
      .get<{ medicines: Medicine[] }>(
        "/api/dashboard/pharmacy/medicines?limit=200",
      )
      .then((d) => {
        if (d.success) setMedicines(d.data.medicines ?? []);
        else toast.error("Failed to load medicines");
      });
    apiClient
      .get<{ name: string }[]>("/api/dashboard/pharmacy/masters?type=category")
      .then((d) => {
        if (d.success) setCategories(d.data.map((c) => c.name));
        else toast.error("Failed to load medicine categories");
      });
    apiClient
      .get<{ _id: string; name: string }[]>("/api/dashboard/doctors")
      .then((d) => {
        if (d.success) setDoctors(d.data);
        else toast.error("Failed to load doctors");
      });
  }, []);

  async function openGenerateBill() {
    const data = await apiClient.get<{ total: number }>(
      "/api/dashboard/pharmacy/bills?limit=1",
    );
    if (data.success) setNextBillNumber((data.data.total ?? 0) + 1);
    setShowGenerateBill(true);
  }

  return (
    <div className="h-full flex flex-col bg-white">
      <BillsList
        onGenerateBill={openGenerateBill}
        refreshToken={refreshToken}
      />
      {showGenerateBill && (
        <GenerateBillForm
          billNumber={nextBillNumber}
          medicines={medicines}
          categories={categories}
          doctors={doctors}
          onClose={() => setShowGenerateBill(false)}
          onSaved={() => {
            setShowGenerateBill(false);
            setRefreshToken((t) => t + 1);
          }}
        />
      )}
    </div>
  );
}
