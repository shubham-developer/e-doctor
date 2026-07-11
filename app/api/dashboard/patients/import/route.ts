import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Patient from "@/models/Patient";
import { apiResponse, apiError } from "@/lib/api";

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  const role = req.headers.get("x-user-role");
  if (!tenantId) return apiError("Unauthorized", 401);
  if (role === "VIEWER") return apiError("Insufficient permissions", 403);

  await connectDB();

  const { patients } = await req.json();
  if (!Array.isArray(patients) || patients.length === 0)
    return apiError("No patient data provided", 400);

  const tenantOid = new mongoose.Types.ObjectId(tenantId);

  // Use raw collection to match patients stored with either tenantId form
  // (legacy imports stored it as a plain string; current code uses ObjectId).
  const maxDoc = await Patient.collection.findOne(
    { tenantId: { $in: [tenantId, tenantOid] } },
    { sort: { uhid: -1 }, projection: { uhid: 1 } },
  );
  const nextUhid = (maxDoc?.uhid ?? 0) + 1;

  const docs = [];
  const errors: string[] = [];

  for (let i = 0; i < patients.length; i++) {
    const p = patients[i];
    if (!p.name?.trim()) {
      errors.push(`Row ${i + 1}: Name is required`);
      continue;
    }

    docs.push({
      tenantId: tenantOid,
      uhid: nextUhid + docs.length,
      name: p.name.trim(),
      ...(p.guardianName?.trim() && { guardianName: p.guardianName.trim() }),
      ...(p.gender && { gender: p.gender }),
      age: Number(p.age) || 0,
      ageMonths: Number(p.ageMonths) || 0,
      ageDays: Number(p.ageDays) || 0,
      ...(p.maritalStatus?.trim() && { maritalStatus: p.maritalStatus.trim() }),
      ...(p.phone?.trim() && { phone: p.phone.trim() }),
      ...(p.email?.trim() && { email: p.email.trim() }),
      ...(p.address?.trim() && { address: p.address.trim() }),
      ...(p.remarks?.trim() && { remarks: p.remarks.trim() }),
      ...(p.allergies?.trim() && { allergies: p.allergies.trim() }),
      ...(p.nationalId?.trim() && { nationalId: p.nationalId.trim() }),
      ...(p.tpaId?.trim() && { tpaId: p.tpaId.trim() }),
      ...(p.tpaValidity?.trim() && { tpaValidity: p.tpaValidity.trim() }),
      ...(p.bloodGroup?.trim() && { bloodGroup: p.bloodGroup.trim() }),
      languagePref: "hi" as const,
    });
  }

  if (docs.length === 0) return apiError("No valid patients to import", 400);

  let insertedCount = 0;
  try {
    const result = await Patient.insertMany(docs, { ordered: false });
    insertedCount = result.length;
  } catch (err: unknown) {
    const e = err as { name?: string; insertedCount?: number };
    if (
      (e.name === "MongoBulkWriteError" || e.name === "BulkWriteError") &&
      typeof e.insertedCount === "number"
    ) {
      insertedCount = e.insertedCount;
    } else {
      throw err;
    }
  }

  return apiResponse({
    inserted: insertedCount,
    failed: errors.length + (docs.length - insertedCount),
    errors,
  });
}
