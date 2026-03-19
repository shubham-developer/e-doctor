import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/db'
import Tenant from '@/models/Tenant'
import TenantUser from '@/models/TenantUser'
import Doctor from '@/models/Doctor'
import Appointment from '@/models/Appointment'
import { apiResponse, apiError } from '@/lib/api'

export async function GET(req: NextRequest) {
  const adminId = req.headers.get('x-admin-id')
  if (!adminId) return apiError('Unauthorized', 401)

  await connectDB()

  const tenants = await Tenant.find({}).sort({ createdAt: -1 }).lean()

  const tenantIds = tenants.map((t) => t._id.toString())

  // Fetch user and appointment counts per tenant in parallel
  const [userCounts, appointmentCounts] = await Promise.all([
    TenantUser.aggregate([
      { $match: { tenantId: { $in: tenants.map((t) => t._id) } } },
      { $group: { _id: '$tenantId', count: { $sum: 1 } } },
    ]),
    Appointment.aggregate([
      { $match: { tenantId: { $in: tenants.map((t) => t._id) } } },
      { $group: { _id: '$tenantId', count: { $sum: 1 } } },
    ]),
  ])

  const userCountMap = Object.fromEntries(userCounts.map((u) => [u._id.toString(), u.count]))
  const apptCountMap = Object.fromEntries(appointmentCounts.map((a) => [a._id.toString(), a.count]))

  const data = tenants.map((t) => ({
    ...t,
    userCount: userCountMap[t._id.toString()] ?? 0,
    appointmentCount: apptCountMap[t._id.toString()] ?? 0,
  }))

  // Summary stats
  const total = tenants.length
  const active = tenants.filter((t) => t.isActive).length
  const byPlan = {
    STARTER: tenants.filter((t) => t.plan === 'STARTER').length,
    GROWTH: tenants.filter((t) => t.plan === 'GROWTH').length,
    PRO: tenants.filter((t) => t.plan === 'PRO').length,
  }

  return apiResponse({ tenants: data, stats: { total, active, inactive: total - active, byPlan } })
}

export async function POST(req: NextRequest) {
  const adminId = req.headers.get('x-admin-id')
  if (!adminId) return apiError('Unauthorized', 401)

  await connectDB()

  const { name, slug, whatsappNumber, plan, ownerName, ownerEmail, ownerPassword } = await req.json()

  if (!name || !slug || !whatsappNumber || !ownerName || !ownerEmail || !ownerPassword) {
    return apiError('All fields are required', 400)
  }

  const existing = await Tenant.findOne({ slug: slug.toLowerCase() })
  if (existing) return apiError('Slug already taken', 400)

  const tenant = await Tenant.create({
    name,
    slug: slug.toLowerCase(),
    whatsappNumber,
    plan: plan ?? 'STARTER',
    planExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    isActive: true,
  })

  const passwordHash = await bcrypt.hash(ownerPassword, 10)
  await TenantUser.create({
    tenantId: tenant._id,
    name: ownerName,
    email: ownerEmail.toLowerCase(),
    passwordHash,
    role: 'OWNER',
  })

  return apiResponse({ tenant }, 201)
}
