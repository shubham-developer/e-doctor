import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/db'
import ChargeCategory from '@/models/ChargeCategory'
import { apiResponse, apiError } from '@/lib/api'

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id')
  if (!tenantId) return apiError('Unauthorized', 401)

  await connectDB()
  const charges = await ChargeCategory.find({ tenantId }).sort({ sortOrder: 1, createdAt: 1 })
  return apiResponse(charges)
}

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id')
  const role = req.headers.get('x-user-role')
  if (!tenantId) return apiError('Unauthorized', 401)
  if (role === 'VIEWER') return apiError('Insufficient permissions', 403)

  await connectDB()
  const { name, defaultFee } = await req.json()
  if (!name?.trim()) return apiError('Name is required', 400)

  const count = await ChargeCategory.countDocuments({ tenantId })
  const charge = await ChargeCategory.create({
    tenantId,
    name: name.trim(),
    defaultFee: Number(defaultFee) || 0,
    sortOrder: count,
  })

  return apiResponse(charge, 201)
}
