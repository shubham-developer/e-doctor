import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/db'
import Doctor from '@/models/Doctor'
import { apiResponse, apiError } from '@/lib/api'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenantId = req.headers.get('x-tenant-id')
  const role = req.headers.get('x-user-role')
  if (!tenantId) return apiError('Unauthorized', 401)
  if (role === 'VIEWER') return apiError('Insufficient permissions', 403)

  const { id } = await params
  await connectDB()

  const body = await req.json()
  const doctor = await Doctor.findOneAndUpdate(
    { _id: id, tenantId },
    { $set: body },
    { new: true }
  )

  if (!doctor) return apiError('Doctor not found', 404)
  return apiResponse(doctor)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenantId = req.headers.get('x-tenant-id')
  const role = req.headers.get('x-user-role')
  if (!tenantId) return apiError('Unauthorized', 401)
  if (role !== 'OWNER') return apiError('Only owners can delete doctors', 403)

  const { id } = await params
  await connectDB()

  const doctor = await Doctor.findOneAndDelete({ _id: id, tenantId })
  if (!doctor) return apiError('Doctor not found', 404)
  return apiResponse({ deleted: true })
}
