import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import TpaClaim from "@/models/TpaClaim";
import "@/models/Patient";
import "@/models/Tpa";
import { apiResponse, apiError } from "@/lib/api";
import { todayString } from "@/lib/format";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return apiError("Unauthorized", 401);
  const { id } = await params;
  await connectDB();
  const claim = await TpaClaim.findOne({ _id: id, tenantId })
    .populate("patientId", "name patientCode phone age gender dateOfBirth tpa tpaId tpaValidity")
    .populate("tpaId", "name code type phone email contactPerson")
    .lean();
  if (!claim) return apiError("Claim not found", 404);
  return apiResponse(claim);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenantId = req.headers.get("x-tenant-id");
  const userName = req.headers.get("x-user-name") ?? "";
  const role = req.headers.get("x-user-role");
  if (!tenantId) return apiError("Unauthorized", 401);
  if (role === "VIEWER") return apiError("Insufficient permissions", 403);

  const { id } = await params;
  await connectDB();
  const body = await req.json();
  const {
    claimedAmount, approvedAmount, settledAmount, coPayment, tdsDeducted, processingFee,
    preAuthNo, preAuthDate, preAuthRequestedAmount, preAuthApprovedAmount, preAuthStatus, preAuthRemarks,
    filedDate, status, rejectionReason, remarks,
    settlementDate, settlementRef,
  } = body;

  const existing = await TpaClaim.findOne({ _id: id, tenantId });
  if (!existing) return apiError("Claim not found", 404);

  const update: Record<string, unknown> = {
    claimedAmount: Number(claimedAmount) || existing.claimedAmount,
    coPayment: Number(coPayment) || existing.coPayment || 0,
    updatedBy: userName,
  };

  if (approvedAmount !== undefined) update.approvedAmount = Number(approvedAmount);
  if (settledAmount !== undefined) update.settledAmount = Number(settledAmount);
  if (tdsDeducted !== undefined) update.tdsDeducted = Number(tdsDeducted);
  if (processingFee !== undefined) update.processingFee = Number(processingFee);
  if (preAuthNo !== undefined) update.preAuthNo = preAuthNo?.trim();
  if (preAuthDate !== undefined) update.preAuthDate = preAuthDate;
  if (preAuthRequestedAmount !== undefined) update.preAuthRequestedAmount = Number(preAuthRequestedAmount);
  if (preAuthApprovedAmount !== undefined) update.preAuthApprovedAmount = Number(preAuthApprovedAmount);
  if (preAuthStatus !== undefined) update.preAuthStatus = preAuthStatus;
  if (preAuthRemarks !== undefined) update.preAuthRemarks = preAuthRemarks?.trim();
  if (status !== undefined) {
    update.status = status;
    if (status === "FILED" && !existing.filedDate) update.filedDate = filedDate || todayString();
    if (status === "SETTLED" && !existing.settlementDate) update.settlementDate = settlementDate || todayString();
  }
  if (filedDate !== undefined) update.filedDate = filedDate;
  if (rejectionReason !== undefined) update.rejectionReason = rejectionReason?.trim();
  if (remarks !== undefined) update.remarks = remarks?.trim();
  if (settlementDate !== undefined) update.settlementDate = settlementDate;
  if (settlementRef !== undefined) update.settlementRef = settlementRef?.trim();

  const updated = await TpaClaim.findByIdAndUpdate(id, update, { new: true })
    .populate("patientId", "name patientCode phone")
    .populate("tpaId", "name code type")
    .lean();

  return apiResponse(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenantId = req.headers.get("x-tenant-id");
  const role = req.headers.get("x-user-role");
  if (!tenantId) return apiError("Unauthorized", 401);
  if (role === "VIEWER") return apiError("Insufficient permissions", 403);

  const { id } = await params;
  await connectDB();
  const claim = await TpaClaim.findOneAndDelete({ _id: id, tenantId });
  if (!claim) return apiError("Claim not found", 404);
  return apiResponse({ deleted: true });
}
