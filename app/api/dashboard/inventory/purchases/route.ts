import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import InventoryPurchase from "@/models/InventoryPurchase";
import InventoryItem from "@/models/InventoryItem";
import InventoryVendor from "@/models/InventoryVendor";
import { apiResponse, apiError } from "@/lib/api";

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return apiError("Unauthorized", 401);

  await connectDB();
  void InventoryVendor;

  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get("limit") ?? "20")));
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");

  const query: Record<string, unknown> = { tenantId };
  if (from || to) {
    const dateFilter: Record<string, Date> = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) { const d = new Date(to); d.setHours(23, 59, 59, 999); dateFilter.$lte = d; }
    query.purchaseDate = dateFilter;
  }

  const [purchases, total] = await Promise.all([
    InventoryPurchase.find(query)
      .populate("vendorId", "name")
      .sort({ purchaseDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    InventoryPurchase.countDocuments(query),
  ]);

  return apiResponse({ purchases, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  const createdBy = req.headers.get("x-user-name") ?? "";
  if (!tenantId) return apiError("Unauthorized", 401);

  await connectDB();
  const body = await req.json();

  if (!body.purchaseDate) return apiError("Purchase date is required", 400);
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return apiError("At least one item is required", 400);
  }

  const totalAmount = body.items.reduce(
    (sum: number, i: { totalCost: number }) => sum + (Number(i.totalCost) || 0),
    0
  );

  const purchase = await InventoryPurchase.create({
    tenantId,
    vendorId: body.vendorId || undefined,
    vendorName: body.vendorName?.trim() ?? "",
    invoiceNumber: body.invoiceNumber?.trim() ?? "",
    purchaseDate: new Date(body.purchaseDate),
    items: body.items.map((i: { itemId: string; itemName: string; quantity: number; unitCost: number; totalCost: number }) => ({
      itemId: i.itemId,
      itemName: i.itemName,
      quantity: Number(i.quantity),
      unitCost: Number(i.unitCost),
      totalCost: Number(i.totalCost),
    })),
    totalAmount,
    notes: body.notes?.trim() ?? "",
    createdBy,
  });

  // Update stock for each item (compensating write pattern — no transactions on standalone MongoDB)
  const stockUpdates = body.items.map((i: { itemId: string; quantity: number; unitCost: number }) =>
    InventoryItem.findOneAndUpdate(
      { _id: i.itemId, tenantId },
      {
        $inc: { currentStock: Number(i.quantity) },
        $set: { unitCost: Number(i.unitCost) },
      }
    )
  );

  try {
    await Promise.all(stockUpdates);
  } catch {
    // Best-effort: purchase record exists, stock update failed — log for manual reconciliation
    console.error("Stock update failed for purchase", purchase._id);
  }

  return apiResponse({ purchase }, 201);
}
