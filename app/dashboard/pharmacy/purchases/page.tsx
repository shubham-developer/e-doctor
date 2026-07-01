"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { apiClient } from "@/lib/apiClient";
import type { Medicine } from "@/lib/types/pharmacy";
import type { Supplier } from "@/components/pharmacy/types";
import { PurchasesList } from "@/components/pharmacy/PurchasesList";
import { PurchaseMedicineForm } from "@/components/pharmacy/PurchaseMedicineForm";

export default function PurchasesPage() {
  const [showForm, setShowForm] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    apiClient
      .get<Supplier[]>("/api/dashboard/pharmacy/suppliers")
      .then((d) => {
        if (d.success) setSuppliers(d.data ?? []);
        else toast.error("Failed to load suppliers");
      });
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
  }, []);

  return (
    <div className="h-full flex flex-col bg-white">
      <PurchasesList
        onAddPurchase={() => setShowForm(true)}
        refreshToken={refreshToken}
      />
      {showForm && (
        <PurchaseMedicineForm
          suppliers={suppliers}
          medicines={medicines}
          categories={categories}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            setRefreshToken((t) => t + 1);
          }}
        />
      )}
    </div>
  );
}
