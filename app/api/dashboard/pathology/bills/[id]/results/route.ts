import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import PathologyBill from "@/models/PathologyBill";
import PathologyTest from "@/models/PathologyTest";
import PathologyResult from "@/models/PathologyResult";
import { apiResponse, apiError } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  const tenantId = req.headers.get("x-tenant-id");
  const branchId = req.headers.get("x-branch-id") ?? undefined;
  if (!tenantId) return apiError("Unauthorized", 401);

  const { id } = await params;
  await connectDB();

  // Return existing result if it exists
  const existing = await PathologyResult.findOne({
    tenantId,
    branchId,
    billId: id,
  }).lean();
  if (existing) return apiResponse(existing);

  // No result yet — initialize structure from bill + test parameters
  const bill = await PathologyBill.findOne({ _id: id, tenantId, branchId }).lean();
  if (!bill) return apiError("Bill not found", 404);

  // Load parameters for each test item that has a testId
  const testIds = bill.items
    .map((i) => i.testId)
    .filter((id): id is NonNullable<typeof id> => id != null);

  const testDefs = testIds.length
    ? await PathologyTest.find({ _id: { $in: testIds } })
        .select("name parameters")
        .lean()
    : [];

  const testDefMap = Object.fromEntries(
    testDefs.map((t) => [String(t._id), t]),
  );

  const tests = bill.items.map((item) => {
    const def = item.testId ? testDefMap[String(item.testId)] : null;
    return {
      testId: item.testId,
      testName: item.testName,
      parameters: def?.parameters?.length
        ? def.parameters.map((p: { name: string; referenceRange: string; unit: string }) => ({
            name: p.name,
            value: "",
            unit: p.unit ?? "",
            referenceRange: p.referenceRange ?? "",
            flag: "",
          }))
        : [{ name: "Result", value: "", unit: "", referenceRange: "", flag: "" }],
      remarks: "",
    };
  });

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

  const bill = await PathologyBill.findOne({ _id: id, tenantId, branchId }).lean();
  if (!bill) return apiError("Bill not found", 404);

  const result = await PathologyResult.findOneAndUpdate(
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
