import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import OpdVisit from "@/models/OpdVisit";
import Patient from "@/models/Patient";
import Staff from "@/models/Staff";
import { apiResponse, apiError } from "@/lib/api";
import { logActivity } from "@/lib/activityLog";
import { todayString } from "@/lib/format";

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  const branchId = req.headers.get("x-branch-id") ?? undefined;
  if (!tenantId) return apiError("Unauthorized", 401);

  await connectDB();

  const sp = req.nextUrl.searchParams;
  const tab = sp.get("tab") ?? "today"; // today | upcoming | old | patients
  const date = sp.get("date") ?? ""; // exact date override
  const status = sp.get("status") ?? "";
  const search = sp.get("search") ?? "";
  const patientId = sp.get("patientId") ?? "";
  const page = Math.max(1, Number(sp.get("page") ?? "1"));
  const limit = Math.min(200, Math.max(1, Number(sp.get("limit") ?? "100")));

  const today = todayString();
  const query: Record<string, unknown> = { tenantId, branchId };

  if (date) {
    query.visitDate = date;
  } else if (tab !== "patients") {
    if (tab === "today") query.visitDate = today;
    if (tab === "upcoming") query.visitDate = { $gt: today };
    if (tab === "old") query.visitDate = { $lt: today };
  }

  if (status && status !== "ALL") query.status = status;

  if (patientId) {
    query.patientId = patientId;
  } else if (search) {
    const uhidNum = parseInt(search, 10);
    const orClauses: Record<string, unknown>[] = [
      { name: { $regex: search, $options: "i" } },
    ];
    if (!isNaN(uhidNum)) orClauses.push({ uhid: uhidNum });
    const matchingPatients = await Patient.find(
      { tenantId, $or: orClauses },
      "_id",
    );
    query.patientId = { $in: matchingPatients.map((p) => p._id) };
  }

  const total = await OpdVisit.countDocuments(query);
  const visits = await OpdVisit.find(query)
    .populate(
      "patientId",
      "name age ageMonths ageDays dateOfBirth uhid gender phone guardianName address bloodGroup allergies",
    )
    .populate("doctorId", "name specialization designation")
    .sort({ visitDate: -1, opdNumber: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  return apiResponse({
    visits,
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
    visitDate,
    chiefComplaint,
    symptomsType,
    symptomsTitle,
    note,
    knownAllergiesOverride,
    previousMedicalIssue,
    caseNumber,
    reference,
    casualty,
    isOldPatient,
    isAntenatal,
    liveConsultation,
    charges,
    totalFee,
    appliedCharge,
    discount,
    tax,
    paymentMode,
    paidAmount,
    applyTpa,
  } = body;

  if (!patientId) return apiError("Patient is required", 400);
  if (!visitDate) return apiError("Visit date is required", 400);

  const [patient, doctor, count] = await Promise.all([
    Patient.findOne({ _id: patientId, tenantId }),
    doctorId
      ? Staff.findOne({ _id: doctorId, tenantId })
      : Promise.resolve(null),
    OpdVisit.countDocuments({ tenantId, branchId, visitDate }),
  ]);

  if (!patient) return apiError("Patient not found", 404);

  const chargeLines = Array.isArray(charges) ? charges : [];
  const computedTotal =
    totalFee ??
    chargeLines.reduce(
      (s: number, c: { fee: number }) => s + (Number(c.fee) || 0),
      0,
    );
  const opdNumber = count + 1;

  const visit = await OpdVisit.create({
    tenantId,
    branchId,
    patientId,
    doctorId: doctor?._id ?? undefined,
    opdNumber,
    visitDate,
    chiefComplaint: chiefComplaint?.trim() ?? symptomsTitle?.trim() ?? "",
    ...(symptomsType?.trim() && { symptomsType: symptomsType.trim() }),
    ...(symptomsTitle?.trim() && { symptomsTitle: symptomsTitle.trim() }),
    ...(note?.trim() && { note: note.trim() }),
    ...(knownAllergiesOverride?.trim() && {
      knownAllergiesOverride: knownAllergiesOverride.trim(),
    }),
    ...(previousMedicalIssue?.trim() && {
      previousMedicalIssue: previousMedicalIssue.trim(),
    }),
    ...(caseNumber?.trim() && { caseNumber: caseNumber.trim() }),
    ...(reference?.trim() && { reference: reference.trim() }),
    casualty: Boolean(casualty),
    isOldPatient: Boolean(isOldPatient),
    isAntenatal: Boolean(isAntenatal),
    liveConsultation: Boolean(liveConsultation),
    applyTpa: Boolean(applyTpa),
    createdBy: { userId, name: userName },
    charges: chargeLines,
    totalFee: computedTotal,
    ...(appliedCharge !== undefined && {
      appliedCharge: Number(appliedCharge),
    }),
    discount: Number(discount) || 0,
    tax: Number(tax) || 0,
    paymentMode: paymentMode || "CASH",
    paidAmount: Number(paidAmount) || 0,
  });

  logActivity(req, {
    action: "create",
    module: "opd",
    description: `Created OPD visit #${opdNumber} for ${patient.name}`,
    link: `/opd/${visit._id}`,
  });

  return apiResponse(
    {
      visit,
      opdNumber,
      patient: { name: patient.name, age: patient.age },
      doctor: doctor
        ? { name: doctor.name, specialization: doctor.designation }
        : null,
    },
    201,
  );
}
