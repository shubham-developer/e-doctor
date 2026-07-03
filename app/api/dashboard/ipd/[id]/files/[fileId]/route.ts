import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import IpdFile from "@/models/IpdFile";
import { apiResponse, apiError } from "@/lib/api";

type Ctx = { params: Promise<{ id: string; fileId: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return apiError("Unauthorized", 401);

  const { fileId } = await params;
  await connectDB();

  const file = await IpdFile.findOne({ _id: fileId, tenantId });
  if (!file) return apiError("File not found", 404);

  const isDownload = req.nextUrl.searchParams.get("download") === "1";

  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Length": String(file.size),
      "Content-Disposition": isDownload
        ? `attachment; filename="${encodeURIComponent(file.filename)}"`
        : `inline; filename="${encodeURIComponent(file.filename)}"`,
    },
  });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const tenantId = req.headers.get("x-tenant-id");
  const role = req.headers.get("x-user-role");
  if (!tenantId) return apiError("Unauthorized", 401);
  if (role === "VIEWER") return apiError("Insufficient permissions", 403);

  const { fileId } = await params;
  const body = await req.json();
  const { filename } = body as { filename?: string };
  if (!filename?.trim()) return apiError("Filename is required", 400);

  await connectDB();
  const file = await IpdFile.findOneAndUpdate(
    { _id: fileId, tenantId },
    { filename: filename.trim() },
    { new: true, select: "-data" },
  );
  if (!file) return apiError("File not found", 404);

  return apiResponse(file);
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const tenantId = req.headers.get("x-tenant-id");
  const role = req.headers.get("x-user-role");
  if (!tenantId) return apiError("Unauthorized", 401);
  if (role === "VIEWER") return apiError("Insufficient permissions", 403);

  const { fileId } = await params;
  await connectDB();

  const file = await IpdFile.findOneAndDelete({ _id: fileId, tenantId });
  if (!file) return apiError("File not found", 404);

  return apiResponse({ deleted: true });
}
