import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import TpaClaim from "@/models/TpaClaim";
import "@/models/Patient";
import "@/models/Tpa";
import { apiResponse, apiError } from "@/lib/api";
import { todayString } from "@/lib/format";

async function nextClaimNo(tenantId: string): Promise<string> {
  const last = await TpaClaim.findOne({ tenantId }).sort({ createdAt: -1 }).select("claimNo").lean();
  if (!last) return "CLM0001";
  const num = parseInt((last as { claimNo: string }).claimNo.replace(/\D/g, "")) || 0;
  return "CLM" + String(num + 1).padStart(4, "0");
}

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return apiError("Unauthorized", 401);
  await connectDB();

  const sp = req.nextUrl.searchParams;
  const status = sp.get("status");
  const tpaId = sp.get("tpaId");
  const moduleType = sp.get("moduleType");
  const referenceId = sp.get("referenceId");
  const from = sp.get("from");
  const to = sp.get("to");
  const page = Math.max(1, Number(sp.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, Number(sp.get("limit") ?? "50")));

  const tid = new mongoose.Types.ObjectId(tenantId);
  const q: Record<string, unknown> = { tenantId: tid };
  if (status && status !== "all") q.status = status;
  if (tpaId) q.tpaId = new mongoose.Types.ObjectId(tpaId);
  if (moduleType) q.moduleType = moduleType;
  if (referenceId) q.referenceId = new mongoose.Types.ObjectId(referenceId);
  if (from && to) q.createdAt = { $gte: new Date(from + "T00:00:00Z"), $lte: new Date(to + "T23:59:59Z") };

  const [total, claims] = await Promise.all([
    TpaClaim.countDocuments(q),
    TpaClaim.find(q)
      .populate("patientId", "name patientCode phone")
      .populate("tpaId", "name code type")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
  ]);

  return apiResponse({ claims, total, totalPages: Math.ceil(total / limit), page });
}

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  const branchId = req.headers.get("x-branch-id") ?? undefined;
  const userName = req.headers.get("x-user-name") ?? "";
  const role = req.headers.get("x-user-role");
  if (!tenantId) return apiError("Unauthorized", 401);
  if (role === "VIEWER") return apiError("Insufficient permissions", 403);

  await connectDB();
  const body = await req.json();
  const {
    patientId, tpaId, moduleType, referenceId,
    claimedAmount, coPayment,
    preAuthNo, preAuthDate, preAuthRequestedAmount, preAuthApprovedAmount, preAuthStatus, preAuthRemarks,
    filedDate, status, remarks,
  } = body;

  if (!patientId) return apiError("Patient is required", 400);
  if (!tpaId) return apiError("TPA is required", 400);

  const claimNo = await nextClaimNo(tenantId);

  const claim = await TpaClaim.create({
    tenantId,
    branchId,
    claimNo,
    patientId,
    tpaId,
    moduleType,
    referenceId,
    claimedAmount: Number(claimedAmount) || 0,
    coPayment: Number(coPayment) || 0,
    preAuthNo: preAuthNo?.trim(),
    preAuthDate,
    preAuthRequestedAmount: preAuthRequestedAmount ? Number(preAuthRequestedAmount) : undefined,
    preAuthApprovedAmount: preAuthApprovedAmount ? Number(preAuthApprovedAmount) : undefined,
    preAuthStatus: preAuthStatus || undefined,
    preAuthRemarks: preAuthRemarks?.trim(),
    filedDate: filedDate || (status === "FILED" ? todayString() : undefined),
    status: status || "DRAFT",
    remarks: remarks?.trim(),
    createdBy: userName,
  });

  const populated = await TpaClaim.findById(claim._id)
    .populate("patientId", "name patientCode phone")
    .populate("tpaId", "name code type")
    .lean();

  return apiResponse(populated, 201);
}
