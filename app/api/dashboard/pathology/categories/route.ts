import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/db'
import PathologyCategory from '@/models/PathologyCategory'
import { apiResponse, apiError } from '@/lib/api'

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id')
  if (!tenantId) return apiError('Unauthorized', 401)
  await connectDB()
  const categories = await PathologyCategory.find({ tenantId }).sort({ name: 1 })
  return apiResponse(categories)
}

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id')
  const role     = req.headers.get('x-user-role')
  if (!tenantId) return apiError('Unauthorized', 401)
  if (role === 'VIEWER') return apiError('Insufficient permissions', 403)
  await connectDB()
  const { name } = await req.json()
  if (!name?.trim()) return apiError('Name is required', 400)
  try {
    const cat = await PathologyCategory.create({ tenantId, name: name.trim() })
    return apiResponse(cat, 201)
  } catch (e: unknown) {
    if ((e as { code?: number }).code === 11000) return apiError('Category already exists', 409)
    throw e
  }
}
