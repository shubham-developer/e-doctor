import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/db'
import Appointment from '@/models/Appointment'
import Slot from '@/models/Slot'
import { apiResponse, apiError } from '@/lib/api'

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id')
  if (!tenantId) return apiError('Unauthorized', 401)

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const doctorId = searchParams.get('doctorId')
  const search = searchParams.get('search')
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '20')

  await connectDB()

  const query: Record<string, unknown> = { tenantId }
  if (status && status !== 'ALL') query.status = status
  if (doctorId && doctorId !== 'ALL') query.doctorId = doctorId

  let appointments = await Appointment.find(query)
    .populate('patientId', 'name age whatsappNumber')
    .populate('doctorId', 'name specialization')
    .populate('slotId', 'startTime endTime date')
    .sort({ createdAt: -1 })

  // Search filter (by patient name or phone)
  if (search) {
    const lower = search.toLowerCase()
    appointments = appointments.filter((a) => {
      const patient = a.patientId as { name?: string; whatsappNumber?: string }
      return (
        patient?.name?.toLowerCase().includes(lower) ||
        patient?.whatsappNumber?.includes(search)
      )
    })
  }

  const total = appointments.length
  const paginated = appointments.slice((page - 1) * limit, page * limit)

  return apiResponse({ appointments: paginated, total, page, limit })
}
