import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import InventoryItem from "@/models/InventoryItem";
import InventoryPurchase from "@/models/InventoryPurchase";
import InventoryIssue from "@/models/InventoryIssue";
import InventoryCategory from "@/models/InventoryCategory";
import InventoryVendor from "@/models/InventoryVendor";
import { apiResponse, apiError } from "@/lib/api";

export async function GET(req: NextRequest) {
  const tenantIdStr = req.headers.get("x-tenant-id");
  if (!tenantIdStr) return apiError("Unauthorized", 401);

  await connectDB();
  void InventoryCategory;
  void InventoryVendor;

  // Aggregate pipelines require ObjectId — Mongoose does NOT auto-cast strings in $match
  const tenantOid = new mongoose.Types.ObjectId(tenantIdStr);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalItems,
    lowStockItems,
    outOfStockItems,
    totalCategories,
    totalVendors,
    monthPurchases,
    monthIssues,
    stockValueAgg,
    lowStockList,
    recentPurchases,
    recentIssues,
    categoryBreakdown,
  ] = await Promise.all([
    InventoryItem.countDocuments({ tenantId: tenantIdStr, isActive: true }),
    InventoryItem.countDocuments({
      tenantId: tenantIdStr,
      isActive: true,
      $expr: { $and: [{ $lte: ["$currentStock", "$reorderLevel"] }, { $gt: ["$currentStock", 0] }] },
    }),
    InventoryItem.countDocuments({ tenantId: tenantIdStr, isActive: true, currentStock: 0 }),
    InventoryCategory.countDocuments({ tenantId: tenantIdStr }),
    InventoryVendor.countDocuments({ tenantId: tenantIdStr }),
    InventoryPurchase.aggregate([
      { $match: { tenantId: tenantOid, purchaseDate: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" }, count: { $sum: 1 } } },
    ]),
    InventoryIssue.aggregate([
      { $match: { tenantId: tenantOid, issueDate: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" }, count: { $sum: 1 } } },
    ]),
    InventoryItem.aggregate([
      { $match: { tenantId: tenantOid, isActive: true } },
      { $group: { _id: null, totalValue: { $sum: { $multiply: ["$currentStock", "$unitCost"] } } } },
    ]),
    InventoryItem.find({
      tenantId: tenantIdStr,
      isActive: true,
      $expr: { $lte: ["$currentStock", "$reorderLevel"] },
    })
      .populate("categoryId", "name")
      .sort({ currentStock: 1 })
      .limit(10)
      .lean(),
    InventoryPurchase.find({ tenantId: tenantIdStr })
      .sort({ purchaseDate: -1 })
      .limit(5)
      .lean(),
    InventoryIssue.find({ tenantId: tenantIdStr })
      .sort({ issueDate: -1 })
      .limit(5)
      .lean(),
    InventoryItem.aggregate([
      { $match: { tenantId: tenantOid, isActive: true } },
      {
        $lookup: {
          from: "inventorycategories",
          localField: "categoryId",
          foreignField: "_id",
          as: "cat",
        },
      },
      { $unwind: { path: "$cat", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$cat._id",
          name: { $first: "$cat.name" },
          count: { $sum: 1 },
          value: { $sum: { $multiply: ["$currentStock", "$unitCost"] } },
        },
      },
      { $sort: { value: -1 } },
      { $limit: 6 },
    ]),
  ]);

  return apiResponse({
    totalItems,
    lowStockItems,
    outOfStockItems,
    totalCategories,
    totalVendors,
    monthPurchaseTotal: monthPurchases[0]?.total ?? 0,
    monthPurchaseCount: monthPurchases[0]?.count ?? 0,
    monthIssueTotal: monthIssues[0]?.total ?? 0,
    monthIssueCount: monthIssues[0]?.count ?? 0,
    totalStockValue: stockValueAgg[0]?.totalValue ?? 0,
    lowStockList,
    recentPurchases,
    recentIssues,
    categoryBreakdown,
  });
}
