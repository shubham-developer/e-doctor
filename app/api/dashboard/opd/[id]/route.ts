import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import OpdVisit from "@/models/OpdVisit";
import { apiResponse, apiError } from "@/lib/api";

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
  const visit = await OpdVisit.findOneAndUpdate(
    { _id: id, tenantId },
    { $set: body },
    { new: true },
  )
    .populate("patientId", "name age whatsappNumber")
    .populate("doctorId", "name specialization");

  if (!visit) return apiError("OPD visit not found", 404);
  return apiResponse(visit);
}
