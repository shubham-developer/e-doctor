"use client";

import { useState, useMemo } from "react";
import { useApiQuery } from "@/lib/useApiQuery";
import { useMedicines, usePharmacyMasters } from "@/lib/lookups";
import type { Supplier } from "@/components/pharmacy/types";
import { PurchasesList } from "@/components/pharmacy/PurchasesList";
import { PurchaseMedicineForm } from "@/components/pharmacy/PurchaseMedicineForm";

export default function PurchasesPage() {
  const [showForm, setShowForm] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  const { data: suppliersData } = useApiQuery<Supplier[]>(
    ["pharmacy-suppliers"],
    "/api/dashboard/pharmacy/suppliers",
    { staleTime: 5 * 60 * 1000 },
  );
  const suppliers = suppliersData ?? [];
  const { data: medicines = [] } = useMedicines();
  const { data: categoryMasters } = usePharmacyMasters("category");
  const categories = useMemo(
    () => (categoryMasters ?? []).map((c) => c.name),
    [categoryMasters],
  );

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
