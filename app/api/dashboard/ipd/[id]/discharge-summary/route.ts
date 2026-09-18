import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import IpdDischargeSummary from "@/models/IpdDischargeSummary";
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

  const summary = await IpdDischargeSummary.findOne({
    ipdId: id,
    tenantId,
    branchId,
  });
  return apiResponse(summary ?? null);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const tenantId = req.headers.get("x-tenant-id");
  const branchId = req.headers.get("x-branch-id") ?? undefined;
  const userId = req.headers.get("x-user-id");
  const userName = req.headers.get("x-user-name");
  const role = req.headers.get("x-user-role");
  if (!tenantId) return apiError("Unauthorized", 401);
  if (role === "VIEWER") return apiError("Insufficient permissions", 403);

  const { id } = await params;
  await connectDB();

  const body = await req.json();

  const summary = await IpdDischargeSummary.findOneAndUpdate(
    { ipdId: id, tenantId, branchId },
    {
      $set: {
        tenantId,
        branchId,
        ipdId: id,
        diagnosis: body.diagnosis ?? "",
        historyOfPresentIllness: body.historyOfPresentIllness ?? "",
        examinationFindings: body.examinationFindings ?? "",
        investigations: body.investigations ?? "",
        treatmentGiven: body.treatmentGiven ?? "",
        proceduresPerformed: body.proceduresPerformed ?? "",
        conditionAtDischarge: body.conditionAtDischarge ?? "",
        followUpInstructions: body.followUpInstructions ?? "",
        medicationsAtDischarge: body.medicationsAtDischarge ?? "",
        additionalNotes: body.additionalNotes ?? "",
        writtenById: userId ?? undefined,
        writtenByName: userName ?? undefined,
      },
    },
    { upsert: true, new: true },
  );

  return apiResponse(summary);
}
