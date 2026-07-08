import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import OpdVisit from "@/models/OpdVisit";
import PharmacyBill from "@/models/PharmacyBill";
import PathologyBill from "@/models/PathologyBill";
import IpdPayment from "@/models/IpdPayment";
import RadiologyBill from "@/models/RadiologyBill";
import Patient from "@/models/Patient";
import Staff from "@/models/Staff";
import { apiResponse, apiError } from "@/lib/api";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

type Granularity = "day" | "month";

interface BucketTotal {
  _id: { y: number; m: number; d?: number };
  total: number;
}

/** Day buckets for short ranges (a monthly chart of a single week is useless), month buckets for longer ones. */
function pickGranularity(from: Date, to: Date): Granularity {
  const spanDays = Math.ceil((to.getTime() - from.getTime()) / 86400000) + 1;
  return spanDays <= 31 ? "day" : "month";
}

function groupIdFor(granularity: Granularity) {
  return granularity === "day"
    ? {
        y: { $year: "$createdAt" },
        m: { $month: "$createdAt" },
        d: { $dayOfMonth: "$createdAt" },
      }
    : { y: { $year: "$createdAt" }, m: { $month: "$createdAt" } };
}

function bucketKey(id: { y: number; m: number; d?: number }): string {
  return id.d != null ? `${id.y}-${id.m}-${id.d}` : `${id.y}-${id.m}`;
}

/** One bucket per day/month between from/to (inclusive), matching the granularity so the chart always has real points. */
function buildBuckets(from: Date, to: Date, granularity: Granularity) {
  const buckets: { key: string; label: string }[] = [];
  if (granularity === "day") {
    const cursor = new Date(
      from.getFullYear(),
      from.getMonth(),
      from.getDate(),
    );
    const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
    while (cursor <= end) {
      const y = cursor.getFullYear();
      const m = cursor.getMonth() + 1;
      const d = cursor.getDate();
      buckets.push({ key: `${y}-${m}-${d}`, label: `${d} ${MONTHS[m - 1]}` });
      cursor.setDate(cursor.getDate() + 1);
    }
  } else {
    const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
    const end = new Date(to.getFullYear(), to.getMonth(), 1);
    while (cursor <= end) {
      const y = cursor.getFullYear();
      const m = cursor.getMonth() + 1;
      const label =
        from.getFullYear() === to.getFullYear()
          ? MONTHS[m - 1]
          : `${MONTHS[m - 1]} ${y}`;
      buckets.push({ key: `${y}-${m}`, label });
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }
  return buckets;
}

function totalsByBucket(rows: BucketTotal[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of rows) map.set(bucketKey(r._id), r.total);
  return map;
}

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return apiError("Unauthorized", 401);

  await connectDB();

  const tid = new mongoose.Types.ObjectId(tenantId);
  const sp = req.nextUrl.searchParams;
  const now = new Date();
  const fromParam = sp.get("from");
  const toParam = sp.get("to");
  const from = fromParam
    ? new Date(`${fromParam}T00:00:00`)
    : new Date(now.getFullYear(), 0, 1);
  const to = toParam ? new Date(`${toParam}T23:59:59.999`) : now;
  const dateMatch = { $gte: from, $lte: to };
  const granularity = pickGranularity(from, to);
  const groupId = groupIdFor(granularity);

  const [
    opdMonthly,
    pharMonthly,
    pathMonthly,
    ipdMonthly,
    radMonthly,
    totalPatients,
    totalStaff,
  ] = await Promise.all([
    OpdVisit.aggregate<BucketTotal>([
      { $match: { tenantId: tid, createdAt: dateMatch } },
      { $group: { _id: groupId, total: { $sum: "$paidAmount" } } },
    ]),
    PharmacyBill.aggregate<BucketTotal>([
      { $match: { tenantId: tid, createdAt: dateMatch } },
      { $group: { _id: groupId, total: { $sum: "$netAmount" } } },
    ]),
    PathologyBill.aggregate<BucketTotal>([
      { $match: { tenantId: tid, createdAt: dateMatch } },
      { $group: { _id: groupId, total: { $sum: "$paidAmount" } } },
    ]),
    IpdPayment.aggregate<BucketTotal>([
      { $match: { tenantId: tid, createdAt: dateMatch } },
      { $group: { _id: groupId, total: { $sum: "$amount" } } },
    ]),
    RadiologyBill.aggregate<BucketTotal>([
      { $match: { tenantId: tid, createdAt: dateMatch } },
      { $group: { _id: groupId, total: { $sum: "$paidAmount" } } },
    ]),
    Patient.countDocuments({ tenantId }),
    Staff.countDocuments({ tenantId, status: "active" }),
  ]);

  const opdByBucket = totalsByBucket(opdMonthly);
  const pharByBucket = totalsByBucket(pharMonthly);
  const pathByBucket = totalsByBucket(pathMonthly);
  const ipdByBucket = totalsByBucket(ipdMonthly);
  const radByBucket = totalsByBucket(radMonthly);

  const buckets = buildBuckets(from, to, granularity);
  const trend = buckets.map(({ key, label }) => {
    const income =
      (opdByBucket.get(key) ?? 0) +
      (pharByBucket.get(key) ?? 0) +
      (pathByBucket.get(key) ?? 0) +
      (ipdByBucket.get(key) ?? 0) +
      (radByBucket.get(key) ?? 0);
    return {
      period: label,
      income: Math.round(income * 100) / 100,
      expenses: 0,
    };
  });

  const sumOf = (m: Map<string, number>) =>
    Array.from(m.values()).reduce((a, b) => a + b, 0);

  return apiResponse({
    income: {
      opd: Math.round(sumOf(opdByBucket) * 100) / 100,
      ipd: Math.round(sumOf(ipdByBucket) * 100) / 100,
      pharmacy: Math.round(sumOf(pharByBucket) * 100) / 100,
      pathology: Math.round(sumOf(pathByBucket) * 100) / 100,
      radiology: Math.round(sumOf(radByBucket) * 100) / 100,
      bloodBank: 0,
      ambulance: 0,
      general: 0,
    },
    expenses: 0,
    trend,
    granularity,
    totalPatients,
    totalStaff,
  });
}
