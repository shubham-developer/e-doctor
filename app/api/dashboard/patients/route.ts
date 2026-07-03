import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Patient from "@/models/Patient";
import { apiResponse, apiError } from "@/lib/api";

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return apiError("Unauthorized", 401);

  await connectDB();

  const search = req.nextUrl.searchParams.get("search") ?? "";
  const query: Record<string, unknown> = { tenantId };
  if (search) {
    const codeNum = parseInt(search, 10);
    const orClauses: Record<string, unknown>[] = [
      { name: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
    ];
    if (!isNaN(codeNum)) orClauses.push({ patientCode: codeNum });
    query.$or = orClauses;
  }

  const page = Math.max(
    1,
    parseInt(req.nextUrl.searchParams.get("page") ?? "1"),
  );
  const limit = Math.min(
    100,
    Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") ?? "20")),
  );
  const skip = (page - 1) * limit;

  const [patients, total] = await Promise.all([
    Patient.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Patient.countDocuments(query),
  ]);

  return apiResponse({
    patients,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  const role = req.headers.get("x-user-role");
  if (!tenantId) return apiError("Unauthorized", 401);
  if (role === "VIEWER") return apiError("Insufficient permissions", 403);

  await connectDB();
  const body = await req.json();
  const {
    name,
    guardianName,
    gender,
    dateOfBirth,
    age,
    ageMonths,
    ageDays,
    bloodGroup,
    maritalStatus,
    phone,
    email,
    address,
    remarks,
    allergies,
    tpa,
    tpaId,
    tpaValidity,
    nationalId,
    alternateNumber,
    languagePref,
  } = body;

  if (!name?.trim()) return apiError("Name is required", 400);

  try {
    const count = await Patient.countDocuments({ tenantId });
    const patient = await Patient.create({
      tenantId,
      patientCode: 2000 + count,
      name: name.trim(),
      ...(guardianName?.trim() && { guardianName: guardianName.trim() }),
      ...(gender && { gender }),
      ...(dateOfBirth?.trim() && { dateOfBirth: dateOfBirth.trim() }),
      age: Number(age) || 0,
      ageMonths: Number(ageMonths) || 0,
      ageDays: Number(ageDays) || 0,
      ...(bloodGroup && { bloodGroup }),
      ...(maritalStatus && { maritalStatus }),
      ...(phone?.trim() && { phone: phone.trim() }),
      ...(email?.trim() && { email: email.trim() }),
      ...(address?.trim() && { address: address.trim() }),
      ...(remarks?.trim() && { remarks: remarks.trim() }),
      ...(allergies?.trim() && { allergies: allergies.trim() }),
      ...(tpa && tpa !== "None" && { tpa }),
      ...(tpaId?.trim() && { tpaId: tpaId.trim() }),
      ...(tpaValidity?.trim() && { tpaValidity: tpaValidity.trim() }),
      ...(nationalId?.trim() && { nationalId: nationalId.trim() }),
      ...(alternateNumber?.trim() && {
        alternateNumber: alternateNumber.trim(),
      }),
      languagePref: languagePref || "hi",
    });
    return apiResponse(patient, 201);
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 11000) {
      return apiError("Failed to create patient. Please try again.", 500);
    }
    throw err;
  }
}
