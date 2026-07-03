import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import RadiologyTest, { IRadiologyTest } from "@/models/RadiologyTest";
import "@/models/Charge";
import { apiResponse, apiError } from "@/lib/api";

function serialize(test: IRadiologyTest) {
  const obj = test.toObject() as Record<string, unknown>;
  const charge = obj.chargeId as { _id: string; name: string } | null;
  return {
    ...obj,
    chargeId: charge?._id ?? null,
    chargeName: charge?.name ?? null,
  };
}

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return apiError("Unauthorized", 401);
  await connectDB();

  const search = req.nextUrl.searchParams.get("search") ?? "";
  const query: Record<string, unknown> = { tenantId };
  if (search) query.name = { $regex: search, $options: "i" };

  const tests = await RadiologyTest.find(query)
    .sort({ createdAt: -1 })
    .populate("chargeId", "name");
  const serialized = tests.map(serialize);
  return apiResponse({ tests: serialized, total: serialized.length });
}

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  const role = req.headers.get("x-user-role");
  if (!tenantId) return apiError("Unauthorized", 401);
  if (role === "VIEWER") return apiError("Insufficient permissions", 403);
  await connectDB();

  const body = await req.json();
  const { name, chargeId, reportDays, standardCharge, amount } = body;

  if (!name?.trim()) return apiError("Test name is required", 400);

  const test = await RadiologyTest.create({
    tenantId,
    name: name.trim(),
    chargeId: chargeId || undefined,
    reportDays: Number(reportDays) || 0,
    standardCharge: Number(standardCharge) || 0,
    amount: Number(amount) || 0,
  });

  return apiResponse(test, 201);
}
