"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Patient } from "./types";

export function PatientHeader({
  patient,
  loading,
  onEdit,
}: {
  patient: Patient | null;
  loading: boolean;
  onEdit: () => void;
}) {
  const router = useRouter();

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center gap-3 shrink-0">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => router.push("/patients")}
        className="text-gray-500"
      >
        <ArrowLeft className="w-4 h-4" />
      </Button>
      {loading ? (
        <Skeleton className="h-5 w-40" />
      ) : (
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <h1 className="text-sm font-bold text-gray-900 uppercase tracking-wide truncate">
            {patient?.name}
          </h1>
          {patient?.uhid && (
            <span className="text-2xs bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded font-mono">
              UHID{patient.uhid}
            </span>
          )}
          {patient?.gender && (
            <span className="text-2xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
              {patient.gender}
            </span>
          )}
        </div>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={onEdit}
        className="ml-auto shrink-0 gap-1.5 text-xs"
      >
        <Pencil className="w-3 h-3" /> Edit
      </Button>
    </div>
  );
}
