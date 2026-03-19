import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/db'
import Tenant from '@/models/Tenant'
import TenantUser from '@/models/TenantUser'
import { apiResponse, apiError } from '@/lib/api'

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id')
  if (!tenantId) return apiError('Unauthorized', 401)

  await connectDB()
  const [tenant, users] = await Promise.all([
    Tenant.findById(tenantId).select('-whatsappAccessToken'),
    TenantUser.find({ tenantId }).select('-passwordHash'),
  ])

  if (!tenant) return apiError('Tenant not found', 404)
  return apiResponse({ tenant, users })
}

export async function PATCH(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id')
  const role = req.headers.get('x-user-role')
  if (!tenantId) return apiError('Unauthorized', 401)
  if (role === 'VIEWER') return apiError('Insufficient permissions', 403)

  await connectDB()
  const body = await req.json()
  const allowed = ['name', 'address', 'brandColor', 'logoUrl', 'notifications']

  // Only allow owners to change whatsapp settings
  if (role === 'OWNER') {
    allowed.push('whatsappPhoneId', 'whatsappAccessToken')
  }

  const update: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) update[key] = body[key]
  }

  const tenant = await Tenant.findByIdAndUpdate(tenantId, { $set: update }, { new: true }).select('-whatsappAccessToken')
  if (!tenant) return apiError('Tenant not found', 404)
  return apiResponse(tenant)
}
