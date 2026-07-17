import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import RadiologyBill from "@/models/RadiologyBill";
import RadiologyResult from "@/models/RadiologyResult";
import { apiResponse, apiError } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  const tenantId = req.headers.get("x-tenant-id");
  const branchId = req.headers.get("x-branch-id") ?? undefined;
  if (!tenantId) return apiError("Unauthorized", 401);

  const { id } = await params;
  await connectDB();

  const existing = await RadiologyResult.findOne({
    tenantId,
    branchId,
    billId: id,
  }).lean();
  if (existing) return apiResponse(existing);

  const bill = await RadiologyBill.findOne({ _id: id, tenantId, branchId }).lean();
  if (!bill) return apiError("Bill not found", 404);

  const tests = bill.items.map((item) => ({
    testId: item.testId,
    testName: item.testName,
    findings: "",
    impression: "",
  }));

  return apiResponse({
    _id: null,
    billId: id,
    patientId: bill.patientId,
    billDate: bill.billDate,
    reportDate: "",
    status: "pending",
    reportedByName: "",
    verifiedByName: "",
    tests,
  });
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const tenantId = req.headers.get("x-tenant-id");
  const branchId = req.headers.get("x-branch-id") ?? undefined;
  const role = req.headers.get("x-user-role");
  if (!tenantId) return apiError("Unauthorized", 401);
  if (role === "VIEWER") return apiError("Insufficient permissions", 403);

  const { id } = await params;
  const body = await req.json();
  const { reportDate, status, reportedByName, verifiedByName, tests } = body;

  if (!tests?.length) return apiError("Tests are required", 400);

  await connectDB();

  const bill = await RadiologyBill.findOne({ _id: id, tenantId, branchId }).lean();
  if (!bill) return apiError("Bill not found", 404);

  const result = await RadiologyResult.findOneAndUpdate(
    { tenantId, branchId, billId: id },
    {
      $set: {
        tenantId,
        branchId,
        billId: id,
        patientId: bill.patientId,
        billDate: bill.billDate,
        reportDate: reportDate || "",
        status: status || "pending",
        reportedByName: reportedByName || "",
        verifiedByName: verifiedByName || "",
        tests,
      },
    },
    { upsert: true, new: true },
  );

  return apiResponse(result);
}
