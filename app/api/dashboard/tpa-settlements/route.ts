import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import TpaSettlement from "@/models/TpaSettlement";
import TpaClaim from "@/models/TpaClaim";
import "@/models/Tpa";
import { apiResponse, apiError } from "@/lib/api";

async function nextBatchNo(tenantId: string): Promise<string> {
  const last = await TpaSettlement.findOne({ tenantId }).sort({ createdAt: -1 }).select("batchNo").lean();
  if (!last) return "SET0001";
  const num = parseInt((last as { batchNo: string }).batchNo.replace(/\D/g, "")) || 0;
  return "SET" + String(num + 1).padStart(4, "0");
}

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return apiError("Unauthorized", 401);
  await connectDB();

  const sp = req.nextUrl.searchParams;
  const tpaId = sp.get("tpaId");
  const page = Math.max(1, Number(sp.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, Number(sp.get("limit") ?? "50")));

  const tid = new mongoose.Types.ObjectId(tenantId);
  const q: Record<string, unknown> = { tenantId: tid };
  if (tpaId) q.tpaId = new mongoose.Types.ObjectId(tpaId);

  const [total, settlements] = await Promise.all([
    TpaSettlement.countDocuments(q),
    TpaSettlement.find(q)
      .populate("tpaId", "name code")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
  ]);

  return apiResponse({ settlements, total, totalPages: Math.ceil(total / limit), page });
}

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  const userName = req.headers.get("x-user-name") ?? "";
  const role = req.headers.get("x-user-role");
  if (!tenantId) return apiError("Unauthorized", 401);
  if (role === "VIEWER") return apiError("Insufficient permissions", 403);

  await connectDB();
  const body = await req.json();
  const { tpaId, settlementDate, paymentMode, paymentRef, claimIds, tdsDeducted, processingFee, remarks } = body;

  if (!tpaId) return apiError("TPA is required", 400);
  if (!settlementDate) return apiError("Settlement date is required", 400);
  if (!claimIds?.length) return apiError("At least one claim is required", 400);

  // Fetch claims to compute totals
  const claims = await TpaClaim.find({
    _id: { $in: claimIds },
    tenantId,
    tpaId,
  }).lean();

  if (!claims.length) return apiError("No valid claims found", 400);

  const totalClaimed = claims.reduce((s, c) => s + (c.claimedAmount || 0), 0);
  const totalApproved = claims.reduce((s, c) => s + (c.approvedAmount || 0), 0);
  const tds = Number(tdsDeducted) || 0;
  const fee = Number(processingFee) || 0;
  const totalSettled = totalApproved - tds - fee;

  const batchNo = await nextBatchNo(tenantId);
  const batch = await TpaSettlement.create({
    tenantId,
    batchNo,
    tpaId,
    settlementDate,
    paymentMode: paymentMode || "NEFT",
    paymentRef: paymentRef?.trim(),
    totalClaimed,
    totalApproved,
    totalSettled,
    tdsDeducted: tds,
    processingFee: fee,
    claimIds: claims.map((c) => c._id),
    remarks: remarks?.trim(),
    createdBy: userName,
  });

  // Mark claims as settled
  await TpaClaim.updateMany(
    { _id: { $in: claims.map((c) => c._id) } },
    {
      status: "SETTLED",
      settlementDate,
      settlementRef: paymentRef?.trim(),
      settlementBatchId: batch._id,
      settledAmount: undefined, // will compute per claim proportionally if needed
      updatedBy: userName,
    },
  );

  const populated = await TpaSettlement.findById(batch._id)
    .populate("tpaId", "name code")
    .lean();

  return apiResponse(populated, 201);
}
