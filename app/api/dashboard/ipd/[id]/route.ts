import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import IpdAdmission from "@/models/IpdAdmission";
import IpdCharge from "@/models/IpdCharge";
import IpdPayment from "@/models/IpdPayment";
import Bed from "@/models/Bed";
import { apiResponse, apiError } from "@/lib/api";
import { logActivity } from "@/lib/activityLog";
import { todayString } from "@/lib/format";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return apiError("Unauthorized", 401);

  const { id } = await params;
  await connectDB();

  const admission = await IpdAdmission.findOne({ _id: id, tenantId })
    .populate(
      "patientId",
      "name age ageMonths ageDays uhid gender phone email guardianName address bloodGroup allergies remarks tpa tpaId tpaValidity nationalId",
    )
    .populate("doctorId", "name specialization staffCode designation");

  if (!admission) return apiError("IPD admission not found", 404);
  return apiResponse(admission);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const tenantId = req.headers.get("x-tenant-id");
  const role = req.headers.get("x-user-role");
  if (!tenantId) return apiError("Unauthorized", 401);
  if (role === "VIEWER") return apiError("Insufficient permissions", 403);

  const { id } = await params;
  await connectDB();

  const body = await req.json();

  // Auto-set dischargeDate when discharging
  if (body.status === "DISCHARGED" && !body.dischargeDate) {
    body.dischargeDate = todayString();
  }

  // Fetch existing admission before update so we know the current bed
  const existing = await IpdAdmission.findOne({ _id: id, tenantId });
  if (!existing) return apiError("IPD admission not found", 404);

  // Block discharge if there is an outstanding balance
  if (body.status === "DISCHARGED") {
    const [charges, payments] = await Promise.all([
      IpdCharge.find({ tenantId, ipdId: id }, "total"),
      IpdPayment.find({ tenantId, ipdId: id }, "amount"),
    ]);
    const totalCharges = charges.reduce((s, c) => s + c.total, 0);
    const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
    const balance = totalCharges - totalPaid;
    if (balance > 0) {
      return apiError(
        `Outstanding balance of ₹${balance.toFixed(2)}. Clear all dues before discharge.`,
        400,
      );
    }
  }

  // Free the old bed if discharging
  if (body.status === "DISCHARGED" && existing.bedNumber) {
    await Bed.findOneAndUpdate(
      { tenantId, name: existing.bedNumber },
      { $set: { status: "available" } },
    );
  }

  // If bed is being reassigned, free old and allot new
  const bedChanging =
    body.bedNumber !== undefined && body.bedNumber !== existing.bedNumber;
  if (bedChanging) {
    if (existing.bedNumber) {
      await Bed.findOneAndUpdate(
        { tenantId, name: existing.bedNumber },
        { $set: { status: "available" } },
      );
    }
    if (body.bedNumber) {
      await Bed.findOneAndUpdate(
        { tenantId, name: body.bedNumber },
        { $set: { status: "allotted" } },
      );
    }
    // Close current active bed history entry
    await IpdAdmission.updateOne(
      { _id: id, tenantId, "bedHistory.isActive": true },
      {
        $set: {
          "bedHistory.$[active].isActive": false,
          "bedHistory.$[active].toDate": new Date(),
        },
      },
      { arrayFilters: [{ "active.isActive": true }] },
    );
    // Push new bed history entry if a new bed is assigned
    if (body.bedNumber) {
      await IpdAdmission.updateOne(
        { _id: id, tenantId },
        {
          $push: {
            bedHistory: {
              bedGroup: body.bedGroup || existing.bedGroup,
              bedNumber: body.bedNumber,
              fromDate: new Date(),
              isActive: true,
            },
          },
        },
      );
    }
  }

  const admission = await IpdAdmission.findOneAndUpdate(
    { _id: id, tenantId },
    { $set: body },
    { new: true },
  )
    .populate("patientId", "name age uhid gender phone")
    .populate("doctorId", "name specialization staffCode designation");

  logActivity(req, {
    action: "update",
    module: "ipd",
    description:
      body.status === "DISCHARGED"
        ? `Discharged IPD admission #${existing.ipdNumber}`
        : `Updated IPD admission #${existing.ipdNumber}`,
    link: `/ipd/${id}`,
  });

  return apiResponse(admission);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const tenantId = req.headers.get("x-tenant-id");
  const role = req.headers.get("x-user-role");
  if (!tenantId) return apiError("Unauthorized", 401);
  if (role === "VIEWER") return apiError("Insufficient permissions", 403);

  const { id } = await params;
  await connectDB();

  const admission = await IpdAdmission.findOneAndDelete({ _id: id, tenantId });
  if (!admission) return apiError("IPD admission not found", 404);

  // Free the bed when the IPD record is deleted
  if (admission.bedNumber) {
    await Bed.findOneAndUpdate(
      { tenantId, name: admission.bedNumber },
      { $set: { status: "available" } },
    );
  }

  logActivity(req, {
    action: "delete",
    module: "ipd",
    description: `Deleted IPD admission #${admission.ipdNumber}`,
  });

  return apiResponse({ deleted: true });
}
