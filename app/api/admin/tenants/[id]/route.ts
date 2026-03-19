import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/db'
import Tenant from '@/models/Tenant'
import TenantUser from '@/models/TenantUser'
import Doctor from '@/models/Doctor'
import Appointment from '@/models/Appointment'
import { apiResponse, apiError } from '@/lib/api'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminId = req.headers.get('x-admin-id')
  if (!adminId) return apiError('Unauthorized', 401)

  const { id } = await params
  await connectDB()

  const tenant = await Tenant.findById(id).lean()
  if (!tenant) return apiError('Tenant not found', 404)

  const [users, doctorCount, appointmentCount] = await Promise.all([
    TenantUser.find({ tenantId: id }).select('name email role isActive createdAt').lean(),
    Doctor.countDocuments({ tenantId: id }),
    Appointment.countDocuments({ tenantId: id }),
  ])

  return apiResponse({ tenant, users, doctorCount, appointmentCount })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminId = req.headers.get('x-admin-id')
  if (!adminId) return apiError('Unauthorized', 401)

  const { id } = await params
  await connectDB()

  const body = await req.json()
  const allowed = ['name', 'address', 'plan', 'planExpiresAt', 'isActive', 'whatsappNumber', 'whatsappPhoneId', 'whatsappAccessToken', 'brandColor']
  const update: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) update[key] = body[key]
  }

  const tenant = await Tenant.findByIdAndUpdate(id, update, { new: true })
  if (!tenant) return apiError('Tenant not found', 404)

  return apiResponse({ tenant })
}
