import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import IpdAdmission from "@/models/IpdAdmission";
import Patient from "@/models/Patient";
import Staff from "@/models/Staff";
import Bed from "@/models/Bed";
import { apiResponse, apiError } from "@/lib/api";
import { logActivity } from "@/lib/activityLog";
import { todayString } from "@/lib/format";

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  const branchId = req.headers.get("x-branch-id") ?? undefined;
  if (!tenantId) return apiError("Unauthorized", 401);

  await connectDB();

  const sp = req.nextUrl.searchParams;
  const status = sp.get("status") ?? "ADMITTED";
  const search = sp.get("search") ?? "";
  const page = Math.max(1, Number(sp.get("page") ?? "1"));
  const limit = Math.min(200, Math.max(1, Number(sp.get("limit") ?? "100")));

  const query: Record<string, unknown> = { tenantId, branchId };
  if (status && status !== "ALL") query.status = status;

  if (search) {
    const uhidNum = parseInt(search, 10);
    const orClauses: Record<string, unknown>[] = [
      { name: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
    ];
    if (!isNaN(uhidNum)) orClauses.push({ uhid: uhidNum });
    const matchingPatients = await Patient.find(
      { tenantId, $or: orClauses },
      "_id",
    );
    query.patientId = { $in: matchingPatients.map((p) => p._id) };
  }

  const total = await IpdAdmission.countDocuments(query);
  const admissions = await IpdAdmission.find(query)
    .populate(
      "patientId",
      "name age ageMonths ageDays uhid gender phone guardianName address bloodGroup allergies",
    )
    .populate("doctorId", "name specialization staffCode designation")
    .sort({ ipdNumber: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  return apiResponse({
    admissions,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  const branchId = req.headers.get("x-branch-id") ?? undefined;
  const role = req.headers.get("x-user-role");
  const userId = req.headers.get("x-user-id") ?? "";
  const userName = req.headers.get("x-user-name") ?? "";
  if (!tenantId) return apiError("Unauthorized", 401);
  if (role === "VIEWER") return apiError("Insufficient permissions", 403);

  await connectDB();
  const body = await req.json();
  const {
    patientId,
    doctorId,
    admissionDate,
    bedGroup,
    bedNumber,
    symptomsType,
    symptomsTitle,
    chiefComplaint,
    note,
    previousMedicalIssue,
    isAntenatal,
    tpa,
    creditLimit,
    casualty,
    isOldPatient,
    liveConsultation,
    caseNumber,
    reference,
  } = body;

  if (!patientId) return apiError("Patient is required", 400);

  const date = admissionDate || todayString();

  const [patient, doctor, count] = await Promise.all([
    Patient.findOne({ _id: patientId, tenantId }),
    doctorId
      ? Staff.findOne({ _id: doctorId, tenantId })
      : Promise.resolve(null),
    IpdAdmission.countDocuments({ tenantId, branchId }),
  ]);

  if (!patient) return apiError("Patient not found", 404);

  const ipdNumber = count + 1;

  // Mark bed as allotted when a bed is assigned
  if (bedNumber?.trim()) {
    await Bed.findOneAndUpdate(
      { tenantId, branchId, name: bedNumber.trim() },
      { $set: { status: "allotted" } },
    );
  }

  const initialBedHistory =
    bedGroup?.trim() || bedNumber?.trim()
      ? [
          {
            bedGroup: bedGroup?.trim() || undefined,
            bedNumber: bedNumber?.trim() || undefined,
            fromDate: new Date(),
            isActive: true,
          },
        ]
      : [];

  const admission = await IpdAdmission.create({
    tenantId,
    branchId,
    patientId,
    doctorId: doctor?._id ?? undefined,
    ipdNumber,
    admissionDate: date,
    status: "ADMITTED",
    bedHistory: initialBedHistory,
    ...(bedGroup?.trim() && { bedGroup: bedGroup.trim() }),
    ...(bedNumber?.trim() && { bedNumber: bedNumber.trim() }),
    ...(symptomsType?.trim() && { symptomsType: symptomsType.trim() }),
    ...(symptomsTitle?.trim() && { symptomsTitle: symptomsTitle.trim() }),
    chiefComplaint: chiefComplaint?.trim() ?? "",
    ...(note?.trim() && { note: note.trim() }),
    ...(previousMedicalIssue?.trim() && {
      previousMedicalIssue: previousMedicalIssue.trim(),
    }),
    isAntenatal: Boolean(isAntenatal),
    ...(tpa?.trim() && { tpa: tpa.trim() }),
    creditLimit: Number(creditLimit) || 20000,
    casualty: Boolean(casualty),
    isOldPatient: Boolean(isOldPatient),
    liveConsultation: Boolean(liveConsultation),
    ...(caseNumber?.trim() && { caseNumber: caseNumber.trim() }),
    ...(reference?.trim() && { reference: reference.trim() }),
    createdBy: { userId, name: userName },
  });

  logActivity(req, {
    action: "create",
    module: "ipd",
    description: `Created IPD admission #${ipdNumber} for ${patient.name}`,
    link: `/ipd/${admission._id}`,
  });

  return apiResponse(
    {
      admission,
      ipdNumber,
      patient: { name: patient.name },
      doctor: doctor ? { name: doctor.name } : null,
    },
    201,
  );
}
