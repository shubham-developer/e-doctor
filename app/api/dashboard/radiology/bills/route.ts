import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import RadiologyBill from "@/models/RadiologyBill";
import RadiologyResult from "@/models/RadiologyResult";
import "@/models/Patient";
import { apiResponse, apiError } from "@/lib/api";
import { todayString } from "@/lib/format";

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return apiError("Unauthorized", 401);
  await connectDB();

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page") ?? 1));
  const limit = Math.min(200, Number(sp.get("limit") ?? 25));
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = { tenantId };

  const [bills, total] = await Promise.all([
    RadiologyBill.find(query)
      .populate("patientId", "name patientCode")
      .sort({ billNumber: -1 })
      .skip(skip)
      .limit(limit),
    RadiologyBill.countDocuments(query),
  ]);

  const billIds = bills.map((b) => b._id);
  const results = await RadiologyResult.find(
    { tenantId, billId: { $in: billIds } },
    { billId: 1, status: 1 },
  ).lean();
  const resultStatusMap = Object.fromEntries(
    results.map((r) => [String(r.billId), r.status]),
  );

  const billsWithStatus = bills.map((b) => ({
    ...b.toObject(),
    resultStatus: resultStatusMap[String(b._id)] ?? "pending",
  }));

  return apiResponse({
    bills: billsWithStatus,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  const role = req.headers.get("x-user-role");
  const userName = req.headers.get("x-user-name") ?? "";
  const userId = req.headers.get("x-user-id") ?? "";
  if (!tenantId) return apiError("Unauthorized", 401);
  if (role === "VIEWER") return apiError("Insufficient permissions", 403);
  await connectDB();

  const body = await req.json();
  const {
    patientId,
    caseId,
    billDate,
    referenceDoctor,
    previousReportValue,
    note,
    paymentMode,
    items,
    discount,
    paidAmount,
  } = body;

  if (!patientId) return apiError("Patient is required", 400);
  if (!items?.length) return apiError("At least one test is required", 400);

  const amount = (items as { amount: number }[]).reduce(
    (s, i) => s + (i.amount ?? 0),
    0,
  );
  const taxTotal = (items as { tax: number; charge: number }[]).reduce(
    (s, i) => s + ((i.charge ?? 0) * (i.tax ?? 0)) / 100,
    0,
  );
  const disc = Number(discount) || 0;
  const netAmount = Math.max(0, amount - disc);
  const paid = Number(paidAmount) || 0;
  const balance = netAmount - paid;

  const last = await RadiologyBill.findOne({ tenantId }).sort({
    billNumber: -1,
  });
  const billNumber = (last?.billNumber ?? 0) + 1;
  const billNo = `RADB${billNumber}`;

  const bill = await RadiologyBill.create({
    tenantId,
    billNo,
    billNumber,
    patientId,
    caseId: caseId || undefined,
    billDate: billDate || todayString(),
    referenceDoctor: referenceDoctor || undefined,
    previousReportValue: previousReportValue || undefined,
    note: note || undefined,
    paymentMode: paymentMode || "Cash",
    items,
    amount,
    discount: disc,
    tax: taxTotal,
    netAmount,
    paidAmount: paid,
    balance,
    createdBy: { userId, name: userName },
  });

  await bill.populate("patientId", "name patientCode");
  return apiResponse(bill, 201);
}
