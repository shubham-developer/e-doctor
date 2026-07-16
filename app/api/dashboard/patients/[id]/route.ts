import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Patient from "@/models/Patient";
import { apiResponse, apiError } from "@/lib/api";
import { logActivity } from "@/lib/activityLog";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return apiError("Unauthorized", 401);
  const { id } = await params;
  await connectDB();
  const patient = await Patient.findOne({ _id: id, tenantId });
  if (!patient) return apiError("Patient not found", 404);
  return apiResponse(patient);
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
  const patient = await Patient.findOneAndUpdate(
    { _id: id, tenantId },
    { $set: body },
    { new: true },
  );

  if (!patient) return apiError("Patient not found", 404);
  logActivity(req, {
    action: "update",
    module: "patients",
    description: `Updated patient ${patient.name} (UHID ${patient.uhid})`,
    link: `/patients/${patient._id}`,
  });
  return apiResponse(patient);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const tenantId = req.headers.get("x-tenant-id");
  const role = req.headers.get("x-user-role");
  if (!tenantId) return apiError("Unauthorized", 401);
  if (role !== "OWNER") return apiError("Only owners can delete patients", 403);

  const { id } = await params;
  await connectDB();

  const patient = await Patient.findOneAndDelete({ _id: id, tenantId });
  if (!patient) return apiError("Patient not found", 404);
  logActivity(req, {
    action: "delete",
    module: "patients",
    description: `Deleted patient ${patient.name} (UHID ${patient.uhid})`,
  });
  return apiResponse({ deleted: true });
}
