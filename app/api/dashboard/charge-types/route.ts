import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/db'
import ChargeType from '@/models/ChargeType'
import { apiResponse, apiError } from '@/lib/api'

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id')
  if (!tenantId) return apiError('Unauthorized', 401)

  await connectDB()
  const items = await ChargeType.find({ tenantId }).sort({ sortOrder: 1, createdAt: 1 })
  return apiResponse(items)
}

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id')
  const role = req.headers.get('x-user-role')
  if (!tenantId) return apiError('Unauthorized', 401)
  if (role === 'VIEWER') return apiError('Insufficient permissions', 403)

  await connectDB()
  const { name, applicableModules } = await req.json()
  if (!name?.trim()) return apiError('Name is required', 400)

  const count = await ChargeType.countDocuments({ tenantId })
  const item = await ChargeType.create({
    tenantId,
    name: name.trim(),
    applicableModules: Array.isArray(applicableModules) ? applicableModules : [],
    sortOrder: count,
  })

  return apiResponse(item, 201)
}
