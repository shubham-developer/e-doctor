import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import IpdVital from "@/models/IpdVital";
import { apiResponse, apiError } from "@/lib/api";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const tenantId = req.headers.get("x-tenant-id");
  const branchId = req.headers.get("x-branch-id") ?? undefined;
  if (!tenantId) return apiError("Unauthorized", 401);

  const { id } = await params;
  await connectDB();

  const vitals = await IpdVital.find({ tenantId, branchId, ipdId: id })
    .sort({ recordedAt: 1 })
    .lean();

  return apiResponse(vitals);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const tenantId = req.headers.get("x-tenant-id");
  const branchId = req.headers.get("x-branch-id") ?? undefined;
  const userName = req.headers.get("x-user-name");
  const role = req.headers.get("x-user-role");
  if (!tenantId) return apiError("Unauthorized", 401);
  if (role === "VIEWER") return apiError("Insufficient permissions", 403);

  const { id } = await params;
  const body = await req.json();
  const {
    recordedAt,
    temperature,
    bpSystolic,
    bpDiastolic,
    pulseRate,
    spo2,
    respiratoryRate,
    rbs,
    weight,
    note,
  } = body as Record<string, unknown>;

  if (!recordedAt || typeof recordedAt !== "string") {
    return apiError("Recorded date/time is required", 400);
  }

  const hasAnyVital =
    temperature != null ||
    bpSystolic != null ||
    bpDiastolic != null ||
    pulseRate != null ||
    spo2 != null ||
    respiratoryRate != null ||
    rbs != null ||
    weight != null;

  if (!hasAnyVital) return apiError("At least one vital sign is required", 400);

  await connectDB();

  const vital = await IpdVital.create({
    tenantId,
    branchId,
    ipdId: id,
    recordedAt,
    temperature: temperature != null ? Number(temperature) : undefined,
    bpSystolic: bpSystolic != null ? Number(bpSystolic) : undefined,
    bpDiastolic: bpDiastolic != null ? Number(bpDiastolic) : undefined,
    pulseRate: pulseRate != null ? Number(pulseRate) : undefined,
    spo2: spo2 != null ? Number(spo2) : undefined,
    respiratoryRate: respiratoryRate != null ? Number(respiratoryRate) : undefined,
    rbs: rbs != null ? Number(rbs) : undefined,
    weight: weight != null ? Number(weight) : undefined,
    note: typeof note === "string" && note.trim() ? note.trim() : undefined,
    recordedByName: userName ?? undefined,
  });

  return apiResponse(vital, 201);
}
