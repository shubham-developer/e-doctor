"use client";

import { useState, useMemo } from "react";
import { apiClient } from "@/lib/apiClient";
import { useDoctors, useMedicines, usePharmacyMasters } from "@/lib/lookups";
import { BillsList } from "@/components/pharmacy/BillsList";
import { GenerateBillForm } from "@/components/pharmacy/GenerateBillForm";

export default function PharmacyPage() {
  const [showGenerateBill, setShowGenerateBill] = useState(false);
  const [nextBillNumber, setNextBillNumber] = useState(1);
  const [refreshToken, setRefreshToken] = useState(0);
  const { data: medicines = [] } = useMedicines();
  const { data: categoryMasters } = usePharmacyMasters("category");
  const categories = useMemo(
    () => (categoryMasters ?? []).map((c) => c.name),
    [categoryMasters],
  );
  const { data: doctors = [] } = useDoctors();

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
