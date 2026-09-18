import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Prescription from "@/models/Prescription";
import { apiResponse, apiError } from "@/lib/api";

/**
 * Partial update — only fields explicitly present in the body are touched.
 * Add Prescription no longer collects `findings`/`pathology`/`radiology`, so
 * omitting them here (rather than always resetting to "") preserves whatever
 * was saved on the record before those fields were removed from the form.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const tenantId = req.headers.get("x-tenant-id");
  const role = req.headers.get("x-user-role");
  if (!tenantId) return apiError("Unauthorized", 401);
  if (role === "VIEWER") return apiError("Insufficient permissions", 403);

  const { id } = await params;
  await connectDB();
  const body = await req.json();
  const {
    headerNote,
    chiefComplaint,
    pastHistory,
    findings,
    medicines,
    advice,
    footerNote,
    pathology,
    radiology,
  } = body;

  const update: Record<string, unknown> = {};
  if (headerNote !== undefined) update.headerNote = headerNote?.trim() || undefined;
  if (chiefComplaint !== undefined)
    update.chiefComplaint = chiefComplaint?.trim() || undefined;
  if (pastHistory !== undefined)
    update.pastHistory = pastHistory?.trim() || undefined;
  if (findings !== undefined)
    update.findings = Array.isArray(findings)
      ? findings.filter(
          (f: { category?: string; description?: string }) =>
            f.category || f.description,
        )
      : [];
  if (medicines !== undefined)
    update.medicines = Array.isArray(medicines)
      ? medicines.filter((m: { name?: string }) => m.name?.trim())
      : [];
  if (advice !== undefined) update.advice = advice?.trim() || undefined;
  if (footerNote !== undefined) update.footerNote = footerNote?.trim() || undefined;
  if (pathology !== undefined) update.pathology = pathology?.trim() || undefined;
  if (radiology !== undefined) update.radiology = radiology?.trim() || undefined;

  const prescription = await Prescription.findOneAndUpdate(
    { _id: id, tenantId },
    { $set: update },
    { new: true },
  );
  if (!prescription) return apiError("Not found", 404);
  return apiResponse(prescription);
}
