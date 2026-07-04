import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import OpdVisit from "@/models/OpdVisit";
import IpdAdmission from "@/models/IpdAdmission";
import PharmacyBill from "@/models/PharmacyBill";
import PathologyBill from "@/models/PathologyBill";
import RadiologyBill from "@/models/RadiologyBill";
import NurseNote from "@/models/NurseNote";
import "@/models/Patient";
import { apiResponse, apiError } from "@/lib/api";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return apiError("Unauthorized", 401);

  const { id } = await params;
  await connectDB();

  const pid = new mongoose.Types.ObjectId(id);
  const tid = new mongoose.Types.ObjectId(tenantId);

  const [opd, ipd, pharmacy, pathology, radiology, nurseNotes] =
    await Promise.all([
    OpdVisit.find({ tenantId: tid, patientId: pid })
      .populate("doctorId", "name specialization")
      .sort({ createdAt: -1 })
      .limit(100),

    IpdAdmission.find({ tenantId: tid, patientId: pid })
      .populate("doctorId", "name specialization")
      .sort({ admissionDate: -1 })
      .limit(50),

    PharmacyBill.find({ tenantId: tid, patientId: pid })
      .sort({ createdAt: -1 })
      .limit(100),

    PathologyBill.find({ tenantId: tid, patientId: pid })
      .sort({ createdAt: -1 })
      .limit(100),

    RadiologyBill.find({ tenantId: tid, patientId: pid })
      .sort({ createdAt: -1 })
      .limit(100),

    NurseNote.find({ tenantId: tid, patientId: pid })
      .sort({ createdAt: -1 })
      .limit(100),
  ]);

  return apiResponse({ opd, ipd, pharmacy, pathology, radiology, nurseNotes });
}
