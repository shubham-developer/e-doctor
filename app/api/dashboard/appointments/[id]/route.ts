import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/db'
import Appointment from '@/models/Appointment'
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
  const { status } = body

  const appointment = await Appointment.findOne({ _id: id, tenantId })
  if (!appointment) return apiError('Appointment not found', 404)

  appointment.status = status
  await appointment.save()

  // If cancelled, free the slot
  if (status === 'CANCELLED') {
    await Slot.findByIdAndUpdate(appointment.slotId, { isBooked: false })
  }

  return apiResponse(appointment)
}
