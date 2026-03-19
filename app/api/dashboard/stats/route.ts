import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/db'
import Appointment from '@/models/Appointment'
import Slot from '@/models/Slot'
import Patient from '@/models/Patient'
import Doctor from '@/models/Doctor'
import { apiResponse, apiError } from '@/lib/api'
import { format, subDays } from 'date-fns'

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id')
  if (!tenantId) return apiError('Unauthorized', 401)

  await connectDB()

  const today = format(new Date(), 'yyyy-MM-dd')
  const weekAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd')

  // Get today's slots
  const todaySlots = await Slot.find({ tenantId, date: today }).select('_id isBooked')
  const todaySlotIds = todaySlots.map((s) => s._id)

  // Today's appointments
  const todayAppointments = await Appointment.find({
    tenantId,
    slotId: { $in: todaySlotIds },
  })
    .populate('patientId', 'name whatsappNumber age')
    .populate('doctorId', 'name specialization')
    .populate('slotId', 'startTime endTime date')
    .sort({ createdAt: -1 })

  const confirmed = todayAppointments.filter((a) => a.status === 'CONFIRMED').length
  const pending = todayAppointments.filter((a) => a.status === 'PENDING').length
  const cancelled = todayAppointments.filter((a) => a.status === 'CANCELLED').length
  const completed = todayAppointments.filter((a) => a.status === 'COMPLETED').length

  // Upcoming (next 5 confirmed/pending)
  const upcoming = todayAppointments
    .filter((a) => a.status === 'CONFIRMED' || a.status === 'PENDING')
    .slice(0, 5)

  // This week's no-show rate (cancelled / total)
  const weekSlots = await Slot.find({ tenantId, date: { $gte: weekAgo, $lte: today } }).select('_id')
  const weekSlotIds = weekSlots.map((s) => s._id)
  const weekAppointments = await Appointment.find({
    tenantId,
    slotId: { $in: weekSlotIds },
  })
  const weekTotal = weekAppointments.length
  const weekCancelled = weekAppointments.filter((a) => a.status === 'CANCELLED').length
  const noShowRate = weekTotal > 0 ? Math.round((weekCancelled / weekTotal) * 100) : 0

  // Totals
  const [totalDoctors, totalPatients] = await Promise.all([
    Doctor.countDocuments({ tenantId, isActive: true }),
    Patient.countDocuments({ tenantId }),
  ])

  return apiResponse({
    today: {
      total: todayAppointments.length,
      confirmed,
      pending,
      cancelled,
      completed,
    },
    upcoming: upcoming.map((a) => ({
      id: a._id,
      bookingRef: a.bookingRef,
      status: a.status,
      symptoms: a.symptoms,
      patient: a.patientId,
      doctor: a.doctorId,
      slot: a.slotId,
    })),
    noShowRate,
    totalDoctors,
    totalPatients,
  })
}
