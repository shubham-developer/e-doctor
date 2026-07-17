import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import InventoryItem from "@/models/InventoryItem";
import OpdVisit from "@/models/OpdVisit";
import { apiResponse, apiError } from "@/lib/api";
import { todayString } from "@/lib/format";

// Lightweight topbar-notification counts — countDocuments only, no full scans,
// so this is cheap enough to poll frequently.
export async function GET(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  const branchId = req.headers.get("x-branch-id") ?? undefined;
  if (!tenantId) return apiError("Unauthorized", 401);

  await connectDB();

  const [lowStock, outOfStock, opdWaiting] = await Promise.all([
    InventoryItem.countDocuments({
      tenantId,
      isActive: true,
      $expr: {
        $and: [
          { $lte: ["$currentStock", "$reorderLevel"] },
          { $gt: ["$currentStock", 0] },
        ],
      },
    }),
    InventoryItem.countDocuments({ tenantId, isActive: true, currentStock: 0 }),
    OpdVisit.countDocuments({
      tenantId,
      branchId,
      visitDate: todayString(),
      status: "WAITING",
    }),
  ]);

  return apiResponse({ lowStock, outOfStock, opdWaiting });
}
