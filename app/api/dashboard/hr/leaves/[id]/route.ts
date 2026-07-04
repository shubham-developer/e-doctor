import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import StaffLeave from "@/models/StaffLeave";
import { apiResponse, apiError } from "@/lib/api";

// Approve / Reject / Cancel
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenantId = req.headers.get("x-tenant-id");
  const userName = req.headers.get("x-user-name") ?? "";
  if (!tenantId) return apiError("Unauthorized", 401);

  const { id } = await params;
  await connectDB();
  const body = await req.json();
  const { action, rejectedReason } = body; // action: "approve" | "reject" | "cancel"

  const leave = await StaffLeave.findOne({ _id: id, tenantId });
  if (!leave) return apiError("Not found", 404);

  if (action === "approve") {
    if (leave.status !== "pending") return apiError("Only pending leaves can be approved", 400);
    leave.status = "approved";
    leave.approvedBy = userName;
    leave.approvedAt = new Date();
  } else if (action === "reject") {
    if (leave.status !== "pending") return apiError("Only pending leaves can be rejected", 400);
    leave.status = "rejected";
    leave.rejectedReason = rejectedReason ?? "";
  } else if (action === "cancel") {
    if (leave.status === "cancelled") return apiError("Already cancelled", 400);
    leave.status = "cancelled";
  } else {
    return apiError("Invalid action", 400);
  }

  await leave.save();
  return apiResponse({ leave });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return apiError("Unauthorized", 401);

  const { id } = await params;
  await connectDB();

  const leave = await StaffLeave.findOne({ _id: id, tenantId });
  if (!leave) return apiError("Not found", 404);
  if (leave.status === "approved") return apiError("Cannot delete an approved leave", 400);

  await leave.deleteOne();
  return apiResponse({ message: "Deleted" });
}
