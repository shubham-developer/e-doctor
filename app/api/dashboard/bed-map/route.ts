import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Bed from "@/models/Bed";
import IpdAdmission from "@/models/IpdAdmission";
import "@/models/Patient";
import "@/models/Staff";
import { apiResponse, apiError } from "@/lib/api";

interface PatientRef {
  _id: mongoose.Types.ObjectId;
  name: string;
  uhid?: number;
  age?: number;
  gender?: string;
}

interface StaffRef {
  _id: mongoose.Types.ObjectId;
  name: string;
}

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return apiError("Unauthorized", 401);

  await connectDB();
  const tid = new mongoose.Types.ObjectId(tenantId);

  // Fetch all beds and all currently admitted patients in parallel
  const [beds, admissions] = await Promise.all([
    Bed.find({ tenantId: tid }).sort({ floor: 1, bedGroup: 1, name: 1 }).lean(),
    IpdAdmission.find({ tenantId: tid, status: "ADMITTED" })
      .populate<{ patientId: PatientRef }>("patientId", "name uhid age gender")
      .populate<{ doctorId: StaffRef }>("doctorId", "name")
      .select("patientId doctorId bedNumber admissionDate ipdNumber")
      .lean(),
  ]);

  // Index admissions by their current bedNumber
  const occupancy = new Map<
    string,
    {
      ipdId: string;
      ipdNumber?: number;
      name: string;
      uhid?: string;
      age?: number;
      gender?: string;
      admissionDate: string;
      doctorName?: string;
      los: number;
    }
  >();

  for (const adm of admissions) {
    if (!adm.bedNumber) continue;
    const patient = adm.patientId as PatientRef | null;
    if (!patient) continue;
    occupancy.set(adm.bedNumber, {
      ipdId: String(adm._id),
      ipdNumber: adm.ipdNumber,
      name: patient.name,
      uhid: patient.uhid != null ? String(patient.uhid) : undefined,
      age: patient.age,
      gender: patient.gender,
      admissionDate: adm.admissionDate,
      doctorName: (adm.doctorId as StaffRef | null)?.name,
      los: daysSince(adm.admissionDate),
    });
  }

  // Group beds: floor → bedGroup
  interface BedEntry {
    _id: string;
    name: string;
    bedType: string;
    bedGroup: string;
    floor: string;
    status: "available" | "allotted";
    patient?: (typeof occupancy extends Map<string, infer V> ? V : never);
  }

  const floorMap = new Map<string, Map<string, BedEntry[]>>();

  for (const bed of beds) {
    const floorKey = bed.floor?.trim() || "—";
    const groupKey = bed.bedGroup?.trim() || "General";

    if (!floorMap.has(floorKey)) floorMap.set(floorKey, new Map());
    const groupMap = floorMap.get(floorKey)!;
    if (!groupMap.has(groupKey)) groupMap.set(groupKey, []);

    const patient = occupancy.get(bed.name);
    groupMap.get(groupKey)!.push({
      _id: String(bed._id),
      name: bed.name,
      bedType: bed.bedType ?? "",
      bedGroup: bed.bedGroup ?? "",
      floor: bed.floor ?? "",
      status: patient ? "allotted" : (bed.status as "available" | "allotted"),
      ...(patient ? { patient } : {}),
    });
  }

  // Build serialisable tree
  const floors = Array.from(floorMap.entries()).map(([floorName, groupMap]) => {
    const groups = Array.from(groupMap.entries()).map(([groupName, groupBeds]) => ({
      name: groupName,
      beds: groupBeds,
      total: groupBeds.length,
      occupied: groupBeds.filter((b) => b.status === "allotted").length,
    }));
    const total = groups.reduce((s, g) => s + g.total, 0);
    const occupied = groups.reduce((s, g) => s + g.occupied, 0);
    return { name: floorName, groups, total, occupied };
  });

  const totalBeds = floors.reduce((s, f) => s + f.total, 0);
  const totalOccupied = floors.reduce((s, f) => s + f.occupied, 0);

  return apiResponse({
    floors,
    summary: {
      total: totalBeds,
      occupied: totalOccupied,
      available: totalBeds - totalOccupied,
      occupancyRate: totalBeds > 0 ? Math.round((totalOccupied / totalBeds) * 100) : 0,
    },
  });
}
