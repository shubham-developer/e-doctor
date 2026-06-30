import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/db'
import MedicineDosage from '@/models/MedicineDosage'
import { apiResponse, apiError } from '@/lib/api'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenantId = req.headers.get('x-tenant-id')
  const role     = req.headers.get('x-user-role')
  if (!tenantId) return apiError('Unauthorized', 401)
  if (role === 'VIEWER') return apiError('Insufficient permissions', 403)

  const { id } = await params
  await connectDB()
  const { category, dosage, unit } = await req.json()
  if (!category?.trim()) return apiError('Category is required', 400)
  if (!dosage?.trim())   return apiError('Dosage is required', 400)

  const item = await MedicineDosage.findOneAndUpdate(
    { _id: id, tenantId },
    { $set: { category: category.trim(), dosage: dosage.trim(), unit: unit?.trim() ?? '' } },
    { new: true }
  )
  if (!item) return apiError('Not found', 404)
  return apiResponse(item)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenantId = req.headers.get('x-tenant-id')
  const role     = req.headers.get('x-user-role')
  if (!tenantId) return apiError('Unauthorized', 401)
  if (role === 'VIEWER') return apiError('Insufficient permissions', 403)

  const { id } = await params
  await connectDB()
  const item = await MedicineDosage.findOneAndDelete({ _id: id, tenantId })
  if (!item) return apiError('Not found', 404)
  return apiResponse({ deleted: true })
}
