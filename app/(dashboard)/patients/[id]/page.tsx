"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useApiQuery } from "@/lib/useApiQuery";
import { apiClient } from "@/lib/apiClient";
import { TabBar } from "@/components/common/TabBar";
import { PatientHeader } from "@/components/patients/PatientHeader";
import { PatientInfoPanel } from "@/components/patients/PatientInfoPanel";
import { OpdHistoryTable } from "@/components/patients/OpdHistoryTable";
import { IpdHistoryTable } from "@/components/patients/IpdHistoryTable";
import { PharmacyHistoryTable } from "@/components/patients/PharmacyHistoryTable";
import { PathologyHistoryTable } from "@/components/patients/PathologyHistoryTable";
import { NurseNotesPanel } from "@/components/patients/NurseNotesPanel";
import { EditPatientDialog } from "@/components/patients/EditPatientDialog";
import type { PatientFormData } from "@/components/patients/PatientForm";
import type { Patient, PatientHistory } from "@/components/patients/types";

type TabKey = "opd" | "ipd" | "pharmacy" | "pathology" | "nurseNotes";
const TABS: { key: TabKey; label: string }[] = [
  { key: "opd", label: "OPD History" },
  { key: "ipd", label: "IPD History" },
  { key: "pharmacy", label: "Pharmacy Bills" },
  { key: "pathology", label: "Pathology Bills" },
  { key: "nurseNotes", label: "Nurse Notes" },
];

export default function PatientProfilePage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<TabKey>("opd");
  const [editOpen, setEditOpen] = useState(false);

  const { data: patientData, isPending: loading } = useApiQuery<Patient>(
    ["patient", id],
    `/api/dashboard/patients/${id}`,
  );
  const patient = patientData ?? null;

  const {
    data: historyData,
    isPending: hLoading,
    refetch: refetchHistory,
  } = useApiQuery<PatientHistory>(
    ["patient-history", id],
    `/api/dashboard/patients/${id}/history`,
  );
  const history = historyData ?? null;

  const counts = {
    opd: history?.opd.length ?? 0,
    ipd: history?.ipd.length ?? 0,
    pharmacy: history?.pharmacy.length ?? 0,
    pathology: history?.pathology.length ?? 0,
    nurseNotes: history?.nurseNotes.length ?? 0,
  };

  async function handleEdit(body: PatientFormData) {
    const res = await apiClient.patch<Patient>(
      `/api/dashboard/patients/${id}`,
      body,
    );
    if (!res.success) {
      toast.error(res.error ?? "Failed to update patient");
      return;
    }
    queryClient.setQueryData(["patient", id], res.data);
    queryClient.invalidateQueries({ queryKey: ["patients"] });
    setEditOpen(false);
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {editOpen && patient && (
        <EditPatientDialog
          patient={patient}
          onClose={() => setEditOpen(false)}
          onSave={handleEdit}
        />
      )}

      <PatientHeader
        patient={patient}
        loading={loading}
        onEdit={() => setEditOpen(true)}
      />

      <div className="flex-1 flex gap-4 p-4 min-h-0 overflow-hidden">
        <PatientInfoPanel
          patient={patient}
          loading={loading}
          counts={counts}
          countsLoading={hLoading}
        />

        <div className="flex-1 flex flex-col bg-white border border-gray-200 rounded-lg overflow-hidden min-w-0">
          <div className="px-3 py-2 border-b border-gray-200 shrink-0">
            <TabBar
              tabs={TABS.map((t) => ({
                ...t,
                count: hLoading ? undefined : counts[t.key],
              }))}
              active={tab}
              onChange={setTab}
            />
          </div>

          <div className="flex-1 overflow-auto">
            {tab === "opd" && (
              <OpdHistoryTable
                visits={history?.opd ?? []}
                patient={patient}
                loading={hLoading}
              />
            )}
            {tab === "ipd" && (
              <IpdHistoryTable
                admissions={history?.ipd ?? []}
                loading={hLoading}
              />
            )}
            {tab === "pharmacy" && (
              <PharmacyHistoryTable
                bills={history?.pharmacy ?? []}
                patient={patient}
                loading={hLoading}
              />
            )}
            {tab === "pathology" && (
              <PathologyHistoryTable
                bills={history?.pathology ?? []}
                patient={patient}
                loading={hLoading}
              />
            )}
            {tab === "nurseNotes" && (
              <NurseNotesPanel
                notes={history?.nurseNotes ?? []}
                patient={patient}
                onChanged={refetchHistory}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
