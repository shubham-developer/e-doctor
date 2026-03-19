import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/db'
import Slot from '@/models/Slot'
import { apiResponse, apiError } from '@/lib/api'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenantId = req.headers.get('x-tenant-id')
  const role = req.headers.get('x-user-role')
  if (!tenantId) return apiError('Unauthorized', 401)
  if (role === 'VIEWER') return apiError('Insufficient permissions', 403)

  const { id } = await params
  await connectDB()

  const body = await req.json()
  const slot = await Slot.findOneAndUpdate({ _id: id, tenantId }, { $set: body }, { new: true })
  if (!slot) return apiError('Slot not found', 404)
  return apiResponse(slot)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenantId = req.headers.get('x-tenant-id')
  const role = req.headers.get('x-user-role')
  if (!tenantId) return apiError('Unauthorized', 401)
  if (role === 'VIEWER') return apiError('Insufficient permissions', 403)

  const { id } = await params
  await connectDB()

  const slot = await Slot.findOne({ _id: id, tenantId })
  if (!slot) return apiError('Slot not found', 404)
  if (slot.isBooked) return apiError('Cannot delete a booked slot', 400)

  await slot.deleteOne()
  return apiResponse({ deleted: true })
}
