/**
 * One-off backfill for multi-branch support — run with: npm run migrate:branches
 *
 * For every existing tenant: creates a single default "Main Branch" (unless
 * the tenant already has a branch), then stamps that branch's id onto every
 * document in the Phase-1 branch-scoped collections that doesn't have one
 * yet, so existing data isn't orphaned once branchId becomes required.
 */

import mongoose from "mongoose";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const MONGODB_URI = process.env.DATABASE_URL!;
if (!MONGODB_URI) {
  console.error("❌  DATABASE_URL is not set in .env.local");
  process.exit(1);
}

// Collections that gained a required branchId in this migration.
const BRANCH_SCOPED_COLLECTIONS = [
  "opdvisits",
  "opdvitals",
  "prescriptions",
  "ipdadmissions",
  "ipdcharges",
  "ipdvitals",
  "ipdmedications",
  "ipdlabtests",
  "ipdfiles",
  "ipddischargesummaries",
  "ipdpayments",
  "nursenotes",
  "beds",
  "bedgroups",
  "floors",
  "pathologybills",
  "pathologyresults",
  "radiologybills",
  "radiologyresults",
  "staffattendances",
  "payrolls",
  "staffleaves",
  "tpaclaims",
];

async function migrate() {
  await mongoose.connect(MONGODB_URI);
  console.log("✅  Connected to MongoDB");

  const db = mongoose.connection.db!;
  const tenants = await db.collection("tenants").find({}).toArray();
  console.log(`Found ${tenants.length} tenant(s)`);

  for (const tenant of tenants) {
    const tenantId = tenant._id;

    let branch = await db
      .collection("branches")
      .findOne({ tenantId, isDefault: true });

    if (!branch) {
      const existing = await db
        .collection("branches")
        .findOne({ tenantId }, { sort: { createdAt: 1 } });

      if (existing) {
        await db
          .collection("branches")
          .updateOne({ _id: existing._id }, { $set: { isDefault: true } });
        branch = { ...existing, isDefault: true };
      } else {
        const result = await db.collection("branches").insertOne({
          tenantId,
          name: "Main Branch",
          code: "MAIN",
          address: tenant.address ?? "",
          phone: tenant.phone ?? "",
          email: tenant.email ?? "",
          isActive: true,
          isDefault: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        branch = { _id: result.insertedId };
        console.log(`  + Created "Main Branch" for tenant ${tenant.name}`);
      }
    }

    for (const collectionName of BRANCH_SCOPED_COLLECTIONS) {
      const res = await db
        .collection(collectionName)
        .updateMany(
          { tenantId, branchId: { $exists: false } },
          { $set: { branchId: branch._id } },
        );
      if (res.modifiedCount > 0) {
        console.log(
          `  ↳ ${collectionName}: backfilled ${res.modifiedCount} document(s) for ${tenant.name}`,
        );
      }
    }
  }

  console.log("\n── Branch migration complete ──────────────────────────\n");
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error("❌  Migration failed:", err);
  process.exit(1);
});
