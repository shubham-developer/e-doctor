import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import InventoryIssue from "@/models/InventoryIssue";
import InventoryItem from "@/models/InventoryItem";
import { apiResponse, apiError } from "@/lib/api";

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return apiError("Unauthorized", 401);

  await connectDB();

  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get("limit") ?? "20")));
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");

  const query: Record<string, unknown> = { tenantId };
  if (from || to) {
    const dateFilter: Record<string, Date> = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) { const d = new Date(to); d.setHours(23, 59, 59, 999); dateFilter.$lte = d; }
    query.issueDate = dateFilter;
  }

  const [issues, total] = await Promise.all([
    InventoryIssue.find(query)
      .sort({ issueDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    InventoryIssue.countDocuments(query),
  ]);

  return apiResponse({ issues, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  const createdBy = req.headers.get("x-user-name") ?? "";
  if (!tenantId) return apiError("Unauthorized", 401);

  await connectDB();
  const body = await req.json();

  if (!body.issueDate) return apiError("Issue date is required", 400);
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return apiError("At least one item is required", 400);
  }

  // Validate stock availability before issuing
  for (const i of body.items as { itemId: string; quantity: number }[]) {
    const item = await InventoryItem.findOne({ _id: i.itemId, tenantId });
    if (!item) return apiError(`Item not found`, 400);
    if (item.currentStock < Number(i.quantity)) {
      return apiError(
        `Insufficient stock for "${item.name}". Available: ${item.currentStock}`,
        400
      );
    }
  }

  const totalAmount = body.items.reduce(
    (sum: number, i: { totalCost: number }) => sum + (Number(i.totalCost) || 0),
    0
  );

  const issue = await InventoryIssue.create({
    tenantId,
    department: body.department?.trim() ?? "",
    issuedTo: body.issuedTo?.trim() ?? "",
    issueDate: new Date(body.issueDate),
    items: body.items.map((i: { itemId: string; itemName: string; quantity: number; unitCost: number; totalCost: number }) => ({
      itemId: i.itemId,
      itemName: i.itemName,
      quantity: Number(i.quantity),
      unitCost: Number(i.unitCost),
      totalCost: Number(i.totalCost),
    })),
    totalAmount,
    purpose: body.purpose?.trim() ?? "",
    notes: body.notes?.trim() ?? "",
    createdBy,
  });

  // Deduct stock (compensating write — standalone MongoDB, no transactions)
  const stockUpdates = body.items.map((i: { itemId: string; quantity: number }) =>
    InventoryItem.findOneAndUpdate(
      { _id: i.itemId, tenantId },
      { $inc: { currentStock: -Number(i.quantity) } }
    )
  );

  try {
    await Promise.all(stockUpdates);
  } catch {
    // Reverse the issue record if stock deduction failed
    await InventoryIssue.findByIdAndDelete(issue._id);
    return apiError("Failed to update stock. Issue cancelled.", 500);
  }

  return apiResponse({ issue }, 201);
}
