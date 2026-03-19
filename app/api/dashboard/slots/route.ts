import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/db'
import Slot from '@/models/Slot'
import { apiResponse, apiError } from '@/lib/api'
import { format, addDays, parseISO } from 'date-fns'

function generateSlots(
  tenantId: string,
  doctorId: string,
  date: string,
  startTime: string,
  endTime: string,
  durationMin: number
) {
  const slots = []
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  let current = sh * 60 + sm
  const end = eh * 60 + em

  while (current + durationMin <= end) {
    const startH = Math.floor(current / 60).toString().padStart(2, '0')
    const startM = (current % 60).toString().padStart(2, '0')
    const endH = Math.floor((current + durationMin) / 60).toString().padStart(2, '0')
    const endM = ((current + durationMin) % 60).toString().padStart(2, '0')
    slots.push({
      tenantId,
      doctorId,
      date,
      startTime: `${startH}:${startM}`,
      endTime: `${endH}:${endM}`,
      isBooked: false,
      isBlocked: false,
    })
    current += durationMin
  }
  return slots
}

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id')
  if (!tenantId) return apiError('Unauthorized', 401)

  const { searchParams } = new URL(req.url)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const doctorId = searchParams.get('doctorId')

  await connectDB()

  const query: Record<string, unknown> = { tenantId }
  if (startDate && endDate) {
    query.date = { $gte: startDate, $lte: endDate }
  }
  if (doctorId) query.doctorId = doctorId

  const slots = await Slot.find(query)
    .populate('doctorId', 'name specialization')
    .sort({ date: 1, startTime: 1 })

  return apiResponse(slots)
}

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id')
  const role = req.headers.get('x-user-role')
  if (!tenantId) return apiError('Unauthorized', 401)
  if (role === 'VIEWER') return apiError('Insufficient permissions', 403)

  await connectDB()
  const body = await req.json()
  const { doctorId, startDate, endDate, startTime, endTime, durationMin, repeatWeekly, weekCount } = body

  if (!doctorId || !startDate || !startTime || !endTime || !durationMin) {
    return apiError('Missing required fields', 400)
  }

  const allSlots: object[] = []
  const start = parseISO(startDate)
  const end = endDate ? parseISO(endDate) : start

  let current = start
  while (current <= end) {
    const dateStr = format(current, 'yyyy-MM-dd')
    allSlots.push(...generateSlots(tenantId, doctorId, dateStr, startTime, endTime, Number(durationMin)))
    current = addDays(current, 1)
  }

  // Repeat weekly
  if (repeatWeekly && weekCount > 0) {
    const baseSlots = [...allSlots]
    for (let w = 1; w <= weekCount; w++) {
      baseSlots.forEach((s: unknown) => {
        const slot = s as { date: string; startTime: string; endTime: string }
        const newDate = format(addDays(parseISO(slot.date), w * 7), 'yyyy-MM-dd')
        allSlots.push({ ...slot, date: newDate, isBooked: false, isBlocked: false })
      })
    }
  }

  // Avoid duplicate slots
  const created = []
  for (const slot of allSlots) {
    const s = slot as { tenantId: string; doctorId: string; date: string; startTime: string; endTime: string; isBooked: boolean; isBlocked: boolean }
    const exists = await Slot.findOne({ tenantId, doctorId: s.doctorId, date: s.date, startTime: s.startTime })
    if (!exists) {
      created.push(slot)
    }
  }

  if (created.length === 0) {
    return apiError('All slots already exist for the selected period', 400)
  }

  await Slot.insertMany(created)
  return apiResponse({ created: created.length }, 201)
}
