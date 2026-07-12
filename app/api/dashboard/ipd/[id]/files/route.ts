import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { connectDB } from "@/lib/db";
import IpdFile from "@/models/IpdFile";
import { apiResponse, apiError } from "@/lib/api";
import { uploadObject, deleteObject } from "@/lib/storage";

const MAX_SIZE = 100 * 1024 * 1024; // 100 MB

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return apiError("Unauthorized", 401);

  const { id } = await params;
  await connectDB();

  const files = await IpdFile.find({ tenantId, ipdId: id })
    .select("-storageKey")
    .sort({ createdAt: -1 })
    .lean();

  return apiResponse(files);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const tenantId = req.headers.get("x-tenant-id");
  const userName = req.headers.get("x-user-name");
  const role = req.headers.get("x-user-role");
  if (!tenantId) return apiError("Unauthorized", 401);
  if (role === "VIEWER") return apiError("Insufficient permissions", 403);

  const { id } = await params;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return apiError("Invalid form data", 400);
  }

  const file = formData.get("file") as File | null;
  if (!file) return apiError("No file provided", 400);
  if (file.size > MAX_SIZE) return apiError("File too large (max 100 MB)", 400);

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const mimeType = file.type || "application/octet-stream";
  const storageKey = `ipd-files/${tenantId}/${id}/${randomUUID()}-${file.name}`;

  await uploadObject(storageKey, buffer, mimeType);

  await connectDB();

  let saved;
  try {
    saved = await IpdFile.create({
      tenantId,
      ipdId: id,
      filename: file.name,
      mimeType,
      size: file.size,
      storageKey,
      uploadedByName: userName ?? undefined,
    });
  } catch (err) {
    await deleteObject(storageKey).catch(() => {});
    throw err;
  }

  return apiResponse(
    {
      _id: saved._id,
      filename: saved.filename,
      mimeType: saved.mimeType,
      size: saved.size,
      uploadedByName: saved.uploadedByName,
      createdAt: saved.createdAt,
    },
    201,
  );
}
