/**
 * Seed script — run with: npm run seed
 * Clears admin data and creates a fresh super admin.
 */

import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const MONGODB_URI = process.env.DATABASE_URL!
if (!MONGODB_URI) {
  console.error('❌  DATABASE_URL is not set in .env.local')
  process.exit(1)
}

const AdminUserSchema = new mongoose.Schema({
  name: String, email: { type: String, unique: true }, passwordHash: String,
}, { timestamps: true })

const AdminUser = mongoose.models.AdminUser || mongoose.model('AdminUser', AdminUserSchema)

async function seed() {
  await mongoose.connect(MONGODB_URI)
  console.log('✅  Connected to MongoDB')

  await AdminUser.deleteMany({})
  console.log('🗑   Cleared admin users')

  await AdminUser.create({
    name: 'Super Admin',
    email: 'admin@edoctor.in',
    passwordHash: await bcrypt.hash('admin1234', 10),
  })
  console.log('👤  Super admin created')

  console.log('\n── Seed complete ──────────────────────────────')
  console.log('   Super admin : admin@edoctor.in / admin1234')
  console.log('────────────────────────────────────────────────\n')

  await mongoose.disconnect()
}

seed().catch((err) => {
  console.error('❌  Seed failed:', err)
  process.exit(1)
})
