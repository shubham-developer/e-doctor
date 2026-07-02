import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/db'
import TaxCategory from '@/models/TaxCategory'
import { apiResponse, apiError } from '@/lib/api'

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id')
  if (!tenantId) return apiError('Unauthorized', 401)

  await connectDB()
  const items = await TaxCategory.find({ tenantId }).sort({ sortOrder: 1, createdAt: 1 })
  return apiResponse(items)
}

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id')
  const role = req.headers.get('x-user-role')
  if (!tenantId) return apiError('Unauthorized', 401)
  if (role === 'VIEWER') return apiError('Insufficient permissions', 403)

  await connectDB()
  const { name, percent, description } = await req.json()
  if (!name?.trim()) return apiError('Name is required', 400)

  const count = await TaxCategory.countDocuments({ tenantId })
  const item = await TaxCategory.create({
    tenantId,
    name: name.trim(),
    percent: Number(percent) || 0,
    description: description?.trim() || undefined,
    sortOrder: count,
  })

  return apiResponse(item, 201)
}
