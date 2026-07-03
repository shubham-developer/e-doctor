import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import OpdVisit from "@/models/OpdVisit";
import PharmacyBill from "@/models/PharmacyBill";
import PathologyBill from "@/models/PathologyBill";
import RadiologyBill from "@/models/RadiologyBill";
import IpdAdmission from "@/models/IpdAdmission";
import IpdPayment from "@/models/IpdPayment";
import "@/models/Patient";
import "@/models/Staff";
import { apiResponse, apiError } from "@/lib/api";
import { todayString } from "@/lib/format";

function dateRange(from: string, to: string) {
  return { $gte: from, $lte: to };
}

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return apiError("Unauthorized", 401);

  await connectDB();

  const sp = req.nextUrl.searchParams;
  const type = sp.get("type") ?? "summary";
  const from = sp.get("from") ?? todayString();
  const to = sp.get("to") ?? todayString();
  const tid = new mongoose.Types.ObjectId(tenantId);

  // ── OPD detail ────────────────────────────────────────────────────────────
  if (type === "opd") {
    const visits = await OpdVisit.find({
      tenantId: tid,
      visitDate: dateRange(from, to),
    })
      .populate("patientId", "name patientCode age gender phone")
      .populate("doctorId", "name specialization")
      .sort({ visitDate: 1, createdAt: 1 })
      .limit(1000);
    return apiResponse({ visits, total: visits.length });
  }

  // ── IPD detail ────────────────────────────────────────────────────────────
  if (type === "ipd") {
    const [admissions, payments] = await Promise.all([
      IpdAdmission.find({ tenantId: tid, admissionDate: dateRange(from, to) })
        .populate("patientId", "name patientCode age gender phone")
        .populate("doctorId", "name specialization")
        .sort({ admissionDate: 1 })
        .limit(500),
      IpdPayment.aggregate([
        { $match: { tenantId: tid, date: dateRange(from, to) } },
        { $group: { _id: "$ipdId", totalPaid: { $sum: "$amount" } } },
      ]),
    ]);
    const paidByIpd: Record<string, number> = {};
    for (const p of payments) paidByIpd[String(p._id)] = p.totalPaid;
    return apiResponse({ admissions, paidByIpd, total: admissions.length });
  }

  // ── Pharmacy detail ───────────────────────────────────────────────────────
  if (type === "pharmacy") {
    const bills = await PharmacyBill.find({
      tenantId: tid,
      billDate: dateRange(from, to),
    })
      .populate("patientId", "name patientCode")
      .sort({ billDate: 1, createdAt: 1 })
      .limit(1000);
    return apiResponse({ bills, total: bills.length });
  }

  // ── Pathology detail ──────────────────────────────────────────────────────
  if (type === "pathology") {
    const bills = await PathologyBill.find({
      tenantId: tid,
      billDate: dateRange(from, to),
    })
      .populate("patientId", "name patientCode")
      .sort({ billDate: 1, createdAt: 1 })
      .limit(1000);
    return apiResponse({ bills, total: bills.length });
  }

  // ── Radiology detail ──────────────────────────────────────────────────────
  if (type === "radiology") {
    const bills = await RadiologyBill.find({
      tenantId: tid,
      billDate: dateRange(from, to),
    })
      .populate("patientId", "name patientCode")
      .sort({ billDate: 1, createdAt: 1 })
      .limit(1000);
    return apiResponse({ bills, total: bills.length });
  }

  // ── Collections by user ───────────────────────────────────────────────────
  if (type === "collections") {
    // Group by {user, paymentMode} so we can pivot per-user payment modes
    const [opd, phar, path, rad, ipd] = await Promise.all([
      OpdVisit.aggregate([
        { $match: { tenantId: tid, visitDate: dateRange(from, to) } },
        {
          $group: {
            _id: { name: "$createdBy.name", mode: "$paymentMode" },
            count: { $sum: 1 },
            amount: { $sum: "$paidAmount" },
          },
        },
      ]),
      PharmacyBill.aggregate([
        { $match: { tenantId: tid, billDate: dateRange(from, to) } },
        {
          $group: {
            _id: { name: "$createdBy.name", mode: "$paymentMode" },
            count: { $sum: 1 },
            amount: { $sum: "$paidAmount" },
          },
        },
      ]),
      PathologyBill.aggregate([
        { $match: { tenantId: tid, billDate: dateRange(from, to) } },
        {
          $group: {
            _id: { name: "$createdBy.name", mode: "$paymentMode" },
            count: { $sum: 1 },
            amount: { $sum: "$paidAmount" },
          },
        },
      ]),
      RadiologyBill.aggregate([
        { $match: { tenantId: tid, billDate: dateRange(from, to) } },
        {
          $group: {
            _id: { name: "$createdBy.name", mode: "$paymentMode" },
            count: { $sum: 1 },
            amount: { $sum: "$paidAmount" },
          },
        },
      ]),
      IpdPayment.aggregate([
        { $match: { tenantId: tid, date: dateRange(from, to) } },
        {
          $group: {
            _id: { name: "$addedByName", mode: "$paymentMode" },
            count: { $sum: 1 },
            amount: { $sum: "$amount" },
          },
        },
      ]),
    ]);

    // Pivot: userMap[name][mode] = { amount, count }
    type ModeMap = Record<string, { amount: number; count: number }>;
    const userMap: Record<string, ModeMap> = {};

    const push = (
      rows: {
        _id: { name: string; mode: string };
        count: number;
        amount: number;
      }[],
    ) => {
      for (const r of rows) {
        const name = r._id?.name;
        const mode = (r._id?.mode || "CASH").toUpperCase();
        if (!name) continue;
        if (!userMap[name]) userMap[name] = {};
        if (!userMap[name][mode]) userMap[name][mode] = { amount: 0, count: 0 };
        userMap[name][mode].amount += r.amount;
        userMap[name][mode].count += r.count;
      }
    };
    push(opd);
    push(phar);
    push(path);
    push(rad);
    push(ipd);

    // Collect all unique modes (sorted: CASH first, then alphabetically)
    const modeSet = new Set<string>();
    for (const modes of Object.values(userMap))
      for (const m of Object.keys(modes)) modeSet.add(m);
    const allModes = [...modeSet].sort((a, b) => {
      if (a === "CASH") return -1;
      if (b === "CASH") return 1;
      return a.localeCompare(b);
    });

    // Build flat per-user rows
    const collections = Object.entries(userMap)
      .map(([name, modes]) => {
        const modeAmounts: Record<string, number> = {};
        const modeCounts: Record<string, number> = {};
        let total = 0,
          count = 0;
        for (const m of allModes) {
          modeAmounts[m] = Math.round((modes[m]?.amount ?? 0) * 100) / 100;
          modeCounts[m] = modes[m]?.count ?? 0;
          total += modeAmounts[m];
          count += modeCounts[m];
        }
        return {
          name,
          modeAmounts,
          modeCounts,
          total: Math.round(total * 100) / 100,
          count,
        };
      })
      .sort((a, b) => b.total - a.total);

    // Grand totals per mode
    const modeTotals: Record<string, number> = {};
    const modeCounts: Record<string, number> = {};
    for (const m of allModes) {
      modeTotals[m] =
        Math.round(
          collections.reduce((s, r) => s + (r.modeAmounts[m] ?? 0), 0) * 100,
        ) / 100;
      modeCounts[m] = collections.reduce(
        (s, r) => s + (r.modeCounts[m] ?? 0),
        0,
      );
    }
    const grandTotal =
      Math.round(collections.reduce((s, r) => s + r.total, 0) * 100) / 100;
    const grandCount = collections.reduce((s, r) => s + r.count, 0);

    return apiResponse({
      collections,
      allModes,
      modeTotals,
      modeCounts,
      grandTotal,
      grandCount,
    });
  }

  // ── Summary (default) ─────────────────────────────────────────────────────
  const [
    opdAgg,
    pharAgg,
    pathAgg,
    radAgg,
    ipdAdmAgg,
    ipdDisAgg,
    ipdPayAgg,
    opdModeAgg,
    pharModeAgg,
    pathModeAgg,
    radModeAgg,
    ipdModeAgg,
    opdDaily,
    pharDaily,
    pathDaily,
    radDaily,
    ipdDaily,
  ] = await Promise.all([
    // Totals
    OpdVisit.aggregate([
      { $match: { tenantId: tid, visitDate: dateRange(from, to) } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          amount: { $sum: "$paidAmount" },
        },
      },
    ]),
    PharmacyBill.aggregate([
      { $match: { tenantId: tid, billDate: dateRange(from, to) } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          amount: { $sum: "$amount" },
          net: { $sum: "$netAmount" },
          paid: { $sum: "$paidAmount" },
          balance: { $sum: "$balance" },
        },
      },
    ]),
    PathologyBill.aggregate([
      { $match: { tenantId: tid, billDate: dateRange(from, to) } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          amount: { $sum: "$amount" },
          net: { $sum: "$netAmount" },
          paid: { $sum: "$paidAmount" },
          balance: { $sum: "$balance" },
        },
      },
    ]),
    RadiologyBill.aggregate([
      { $match: { tenantId: tid, billDate: dateRange(from, to) } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          amount: { $sum: "$amount" },
          net: { $sum: "$netAmount" },
          paid: { $sum: "$paidAmount" },
          balance: { $sum: "$balance" },
        },
      },
    ]),
    IpdAdmission.countDocuments({
      tenantId: tid,
      admissionDate: dateRange(from, to),
    }),
    IpdAdmission.countDocuments({
      tenantId: tid,
      dischargeDate: dateRange(from, to),
    }),
    IpdPayment.aggregate([
      { $match: { tenantId: tid, date: dateRange(from, to) } },
      {
        $group: { _id: null, count: { $sum: 1 }, amount: { $sum: "$amount" } },
      },
    ]),
    // Payment mode breakdown
    OpdVisit.aggregate([
      { $match: { tenantId: tid, visitDate: dateRange(from, to) } },
      {
        $group: {
          _id: "$paymentMode",
          count: { $sum: 1 },
          amount: { $sum: "$paidAmount" },
        },
      },
    ]),
    PharmacyBill.aggregate([
      { $match: { tenantId: tid, billDate: dateRange(from, to) } },
      {
        $group: {
          _id: "$paymentMode",
          count: { $sum: 1 },
          amount: { $sum: "$paidAmount" },
        },
      },
    ]),
    PathologyBill.aggregate([
      { $match: { tenantId: tid, billDate: dateRange(from, to) } },
      {
        $group: {
          _id: "$paymentMode",
          count: { $sum: 1 },
          amount: { $sum: "$paidAmount" },
        },
      },
    ]),
    RadiologyBill.aggregate([
      { $match: { tenantId: tid, billDate: dateRange(from, to) } },
      {
        $group: {
          _id: "$paymentMode",
          count: { $sum: 1 },
          amount: { $sum: "$paidAmount" },
        },
      },
    ]),
    IpdPayment.aggregate([
      { $match: { tenantId: tid, date: dateRange(from, to) } },
      {
        $group: {
          _id: "$paymentMode",
          count: { $sum: 1 },
          amount: { $sum: "$amount" },
        },
      },
    ]),
    // Daily breakdown
    OpdVisit.aggregate([
      { $match: { tenantId: tid, visitDate: dateRange(from, to) } },
      { $group: { _id: "$visitDate", amount: { $sum: "$paidAmount" } } },
    ]),
    PharmacyBill.aggregate([
      { $match: { tenantId: tid, billDate: dateRange(from, to) } },
      { $group: { _id: "$billDate", amount: { $sum: "$paidAmount" } } },
    ]),
    PathologyBill.aggregate([
      { $match: { tenantId: tid, billDate: dateRange(from, to) } },
      { $group: { _id: "$billDate", amount: { $sum: "$paidAmount" } } },
    ]),
    RadiologyBill.aggregate([
      { $match: { tenantId: tid, billDate: dateRange(from, to) } },
      { $group: { _id: "$billDate", amount: { $sum: "$paidAmount" } } },
    ]),
    IpdPayment.aggregate([
      { $match: { tenantId: tid, date: dateRange(from, to) } },
      { $group: { _id: "$date", amount: { $sum: "$amount" } } },
    ]),
  ]);

  // Build daily map
  const dailyMap: Record<
    string,
    {
      opd: number;
      pharmacy: number;
      pathology: number;
      radiology: number;
      ipd: number;
    }
  > = {};
  const ensureDay = (d: string) => {
    if (!dailyMap[d])
      dailyMap[d] = { opd: 0, pharmacy: 0, pathology: 0, radiology: 0, ipd: 0 };
  };
  for (const r of opdDaily) {
    ensureDay(r._id);
    dailyMap[r._id].opd = Math.round(r.amount * 100) / 100;
  }
  for (const r of pharDaily) {
    ensureDay(r._id);
    dailyMap[r._id].pharmacy = Math.round(r.amount * 100) / 100;
  }
  for (const r of pathDaily) {
    ensureDay(r._id);
    dailyMap[r._id].pathology = Math.round(r.amount * 100) / 100;
  }
  for (const r of radDaily) {
    ensureDay(r._id);
    dailyMap[r._id].radiology = Math.round(r.amount * 100) / 100;
  }
  for (const r of ipdDaily) {
    ensureDay(r._id);
    dailyMap[r._id].ipd = Math.round(r.amount * 100) / 100;
  }
  const daily = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({
      date,
      ...v,
      total:
        Math.round(
          (v.opd + v.pharmacy + v.pathology + v.radiology + v.ipd) * 100,
        ) / 100,
    }));

  // Merge payment modes across all modules
  const modeMap: Record<string, { count: number; amount: number }> = {};
  const addMode = (arr: { _id: string; count: number; amount: number }[]) => {
    for (const r of arr) {
      const key = r._id || "Cash";
      if (!modeMap[key]) modeMap[key] = { count: 0, amount: 0 };
      modeMap[key].count += r.count;
      modeMap[key].amount += r.amount;
    }
  };
  addMode(opdModeAgg);
  addMode(pharModeAgg);
  addMode(pathModeAgg);
  addMode(radModeAgg);
  addMode(ipdModeAgg);
  const paymentModes = Object.entries(modeMap)
    .map(([mode, v]) => ({
      mode,
      count: v.count,
      amount: Math.round(v.amount * 100) / 100,
    }))
    .sort((a, b) => b.amount - a.amount);

  const opd = opdAgg[0] ?? { count: 0, amount: 0 };
  const phar = pharAgg[0] ?? {
    count: 0,
    amount: 0,
    net: 0,
    paid: 0,
    balance: 0,
  };
  const path = pathAgg[0] ?? {
    count: 0,
    amount: 0,
    net: 0,
    paid: 0,
    balance: 0,
  };
  const rad = radAgg[0] ?? { count: 0, amount: 0, net: 0, paid: 0, balance: 0 };
  const ipdP = ipdPayAgg[0] ?? { count: 0, amount: 0 };

  return apiResponse({
    period: { from, to },
    opd: { count: opd.count, amount: Math.round(opd.amount * 100) / 100 },
    pharmacy: {
      count: phar.count,
      amount: Math.round(phar.amount * 100) / 100,
      net: Math.round(phar.net * 100) / 100,
      paid: Math.round(phar.paid * 100) / 100,
      balance: Math.round(phar.balance * 100) / 100,
    },
    pathology: {
      count: path.count,
      amount: Math.round(path.amount * 100) / 100,
      net: Math.round(path.net * 100) / 100,
      paid: Math.round(path.paid * 100) / 100,
      balance: Math.round(path.balance * 100) / 100,
    },
    radiology: {
      count: rad.count,
      amount: Math.round(rad.amount * 100) / 100,
      net: Math.round(rad.net * 100) / 100,
      paid: Math.round(rad.paid * 100) / 100,
      balance: Math.round(rad.balance * 100) / 100,
    },
    ipd: {
      admissions: ipdAdmAgg,
      discharges: ipdDisAgg,
      payments: Math.round(ipdP.amount * 100) / 100,
      paymentCount: ipdP.count,
    },
    total:
      Math.round(
        (opd.amount + phar.paid + path.paid + rad.paid + ipdP.amount) * 100,
      ) / 100,
    daily,
    paymentModes,
  });
}
