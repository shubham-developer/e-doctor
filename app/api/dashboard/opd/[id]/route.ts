import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import OpdVisit from "@/models/OpdVisit";
import Charge from "@/models/Charge";
import "@/models/ChargeCategory";
import { apiResponse, apiError } from "@/lib/api";
import { logActivity } from "@/lib/activityLog";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const tenantId = req.headers.get("x-tenant-id");
  const branchId = req.headers.get("x-branch-id") ?? undefined;
  if (!tenantId) return apiError("Unauthorized", 401);

  const { id } = await params;
  await connectDB();

  const visit = await OpdVisit.findOne({ _id: id, tenantId, branchId })
    .populate(
      "patientId",
      "name age ageMonths ageDays dateOfBirth uhid gender phone email guardianName address bloodGroup allergies remarks tpa tpaId tpaValidity nationalId",
    )
    .populate("doctorId", "name specialization");

  if (!visit) return apiError("OPD visit not found", 404);

  // Resolve each charge line's category name. `charges.categoryId` stores a
  // Charge id (from the /charges?module=opd lookup); its chargeCategoryId
  // carries the actual category.
  const obj = visit.toObject() as unknown as {
    charges: { categoryId?: unknown; name: string; fee: number }[];
  } & Record<string, unknown>;
  const chargeIds = obj.charges.map((c) => c.categoryId).filter(Boolean);
  if (chargeIds.length > 0) {
    const chargeDocs = await Charge.find({
      _id: { $in: chargeIds },
      tenantId,
    }).populate("chargeCategoryId", "name");
    const categoryById = new Map(
      chargeDocs.map((c) => [
        String(c._id),
        (c.chargeCategoryId as { name?: string } | null)?.name ?? null,
      ]),
    );
    obj.charges = obj.charges.map((c) => ({
      ...c,
      categoryName: c.categoryId
        ? categoryById.get(String(c.categoryId)) ?? null
        : null,
    }));
  }

  return apiResponse(obj);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const tenantId = req.headers.get("x-tenant-id");
  const branchId = req.headers.get("x-branch-id") ?? undefined;
  const role = req.headers.get("x-user-role");
  if (!tenantId) return apiError("Unauthorized", 401);
  if (role === "VIEWER") return apiError("Insufficient permissions", 403);

  const { id } = await params;
  await connectDB();

  const body = await req.json();
  delete body.branchId;
  const visit = await OpdVisit.findOneAndUpdate(
    { _id: id, tenantId, branchId },
    { $set: body },
    { new: true },
  )
    .populate("patientId", "name age whatsappNumber")
    .populate("doctorId", "name specialization");

  if (!visit) return apiError("OPD visit not found", 404);
  logActivity(req, {
    action: "update",
    module: "opd",
    description: `Updated OPD visit #${visit.opdNumber}`,
    link: `/opd/${visit._id}`,
  });
  return apiResponse(visit);
}
