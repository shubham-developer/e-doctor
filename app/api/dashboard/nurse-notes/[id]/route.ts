import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import NurseNote from "@/models/NurseNote";
import { apiResponse, apiError } from "@/lib/api";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const tenantId = req.headers.get("x-tenant-id");
  const userRole = req.headers.get("x-user-role");
  const userId = req.headers.get("x-user-id");
  if (!tenantId) return apiError("Unauthorized", 401);

  const { id } = await params;
  await connectDB();

  const note = await NurseNote.findOne({ _id: id, tenantId });
  if (!note) return apiError("Note not found", 404);

  // Only allow the author or OWNER to delete
  if (note.addedById !== userId && userRole !== "OWNER") {
    return apiError("You can only delete your own notes", 403);
  }

  await note.deleteOne();
  return apiResponse({ deleted: true });
}
