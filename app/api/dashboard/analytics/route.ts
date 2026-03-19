import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/db'
import Appointment from '@/models/Appointment'
import Slot from '@/models/Slot'
import Doctor from '@/models/Doctor'
import { apiResponse, apiError } from '@/lib/api'
import { format, subDays, parseISO } from 'date-fns'

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id')
  if (!tenantId) return apiError('Unauthorized', 401)

  await connectDB()

  const last30 = format(subDays(new Date(), 30), 'yyyy-MM-dd')
  const today = format(new Date(), 'yyyy-MM-dd')

  // Get all appointments in last 30 days (via slots)
  const slots = await Slot.find({ tenantId, date: { $gte: last30, $lte: today } }).select('_id date')
  const slotMap = new Map(slots.map((s) => [s._id.toString(), s.date]))
  const slotIds = slots.map((s) => s._id)

  const appointments = await Appointment.find({
    tenantId,
    slotId: { $in: slotIds },
  })
    .populate('doctorId', 'name consultationFee')
    .populate('slotId', 'startTime endTime date')

  // 1. Appointments per day (last 30 days)
  const dayMap = new Map<string, number>()
  for (let i = 29; i >= 0; i--) {
    dayMap.set(format(subDays(new Date(), i), 'yyyy-MM-dd'), 0)
  }
  appointments.forEach((a) => {
    const slot = a.slotId as { date?: string } | null
    const date = slot?.date
    if (date && dayMap.has(date)) {
      dayMap.set(date, (dayMap.get(date) ?? 0) + 1)
    }
  })
  const appointmentsPerDay = Array.from(dayMap.entries()).map(([date, count]) => ({
    date: format(parseISO(date), 'dd MMM'),
    count,
  }))

  // 2. Appointments by doctor
  const doctorMap = new Map<string, { name: string; count: number; fee: number }>()
  appointments.forEach((a) => {
    const doc = a.doctorId as { _id: { toString(): string }; name?: string; consultationFee?: number } | null
    if (!doc) return
    const id = doc._id.toString()
    if (!doctorMap.has(id)) {
      doctorMap.set(id, { name: doc.name ?? 'Unknown', count: 0, fee: doc.consultationFee ?? 0 })
    }
    doctorMap.get(id)!.count++
  })
  const appointmentsByDoctor = Array.from(doctorMap.values())

  // 3. Status breakdown
  const statusCount = { PENDING: 0, CONFIRMED: 0, CANCELLED: 0, COMPLETED: 0 }
  appointments.forEach((a) => { statusCount[a.status as keyof typeof statusCount]++ })
  const statusBreakdown = Object.entries(statusCount).map(([name, value]) => ({ name, value }))

  // 4. Peak booking hours
  const hourMap = new Map<number, number>()
  for (let h = 6; h <= 20; h++) hourMap.set(h, 0)
  appointments.forEach((a) => {
    const slot = a.slotId as { startTime?: string } | null
    if (slot?.startTime) {
      const h = parseInt(slot.startTime.split(':')[0])
      hourMap.set(h, (hourMap.get(h) ?? 0) + 1)
    }
  })
  const peakHours = Array.from(hourMap.entries()).map(([hour, count]) => ({
    hour: `${hour}:00`,
    count,
  }))

  // 5. Top symptoms
  const symptomMap = new Map<string, number>()
  appointments.forEach((a) => {
    if (a.symptoms) {
      const key = a.symptoms.toLowerCase().trim().slice(0, 40)
      symptomMap.set(key, (symptomMap.get(key) ?? 0) + 1)
    }
  })
  const topSymptoms = Array.from(symptomMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }))

  // 6. Revenue estimate
  const totalRevenue = appointments
    .filter((a) => a.status === 'COMPLETED' || a.status === 'CONFIRMED')
    .reduce((sum, a) => {
      const doc = a.doctorId as { consultationFee?: number } | null
      return sum + (doc?.consultationFee ?? 0)
    }, 0)

  // 7. No-show trend (last 4 weeks)
  const noShowTrend = []
  for (let w = 3; w >= 0; w--) {
    const weekStart = format(subDays(new Date(), (w + 1) * 7), 'yyyy-MM-dd')
    const weekEnd = format(subDays(new Date(), w * 7), 'yyyy-MM-dd')
    const weekSlots = await Slot.find({ tenantId, date: { $gte: weekStart, $lt: weekEnd } }).select('_id')
    const weekAppts = await Appointment.countDocuments({ tenantId, slotId: { $in: weekSlots.map((s) => s._id) } })
    const weekCancelled = await Appointment.countDocuments({ tenantId, slotId: { $in: weekSlots.map((s) => s._id) }, status: 'CANCELLED' })
    noShowTrend.push({
      week: `W-${w + 1}`,
      rate: weekAppts > 0 ? Math.round((weekCancelled / weekAppts) * 100) : 0,
    })
  }

  return apiResponse({
    appointmentsPerDay,
    appointmentsByDoctor,
    statusBreakdown,
    peakHours,
    topSymptoms,
    totalRevenue,
    noShowTrend,
    totalAppointments: appointments.length,
  })
}
