import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/db'
import Appointment from '@/models/Appointment'
import Patient from '@/models/Patient'
import Slot from '@/models/Slot'
import Tenant from '@/models/Tenant'
import { apiResponse, apiError } from '@/lib/api'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { format } from 'date-fns'

function todayString() {
  return format(new Date(), 'yyyy-MM-dd')
}

// GET: patient phone lookup OR today's reception queue
export async function GET(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id')
  if (!tenantId) return apiError('Unauthorized', 401)

  const { searchParams } = new URL(req.url)
  const phone = searchParams.get('phone')

  await connectDB()

  // Patient lookup by phone
  if (phone) {
    const patient = await Patient.findOne({ tenantId, whatsappNumber: phone })
    if (!patient) {
      return apiResponse({ found: false })
    }

    // Get last appointment for this patient
    const lastAppt = await Appointment.findOne({ tenantId, patientId: patient._id, status: 'COMPLETED' })
      .populate('doctorId', 'name')
      .populate('slotId', 'date')
      .sort({ createdAt: -1 })

    let lastVisit: string | undefined
    let lastDoctor: string | undefined

    if (lastAppt) {
      const slot = lastAppt.slotId as { date?: string } | null
      const doctor = lastAppt.doctorId as { name?: string } | null
      if (slot?.date) {
        const [y, m, d] = slot.date.split('-')
        const dateObj = new Date(Number(y), Number(m) - 1, Number(d))
        lastVisit = dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
      }
      lastDoctor = doctor?.name
    }

    return apiResponse({
      found: true,
      name: patient.name,
      age: patient.age,
      lastVisit,
      lastDoctor,
    })
  }

  // Today's reception queue
  const today = todayString()
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  const todaySlots = await Slot.find({ tenantId, date: today })
  const slotIds = todaySlots.map((s) => s._id)

  const appointments = await Appointment.find({
    tenantId,
    $or: [
      { slotId: { $in: slotIds } },
      { isWalkIn: true, arrivedAt: { $gte: todayStart, $lte: todayEnd } },
    ],
    status: { $nin: ['CANCELLED'] },
  })
    .populate('patientId', 'name age whatsappNumber')
    .populate('doctorId', 'name specialization')
    .populate('slotId', 'startTime endTime date')
    .sort({ tokenNumber: 1, createdAt: 1 })

  return apiResponse(appointments)
}

// POST: create walk-in appointment
export async function POST(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id')
  if (!tenantId) return apiError('Unauthorized', 401)

  const body = await req.json()
  const { name, phone, age, symptoms, doctorId, slotId } = body

  if (!name?.trim() || !age || !symptoms?.trim() || !doctorId) {
    return apiError('Missing required fields: name, age, symptoms, doctorId', 400)
  }

  await connectDB()

  // a) Find or create patient
  let patient
  if (phone) {
    patient = await Patient.findOne({ tenantId, whatsappNumber: phone })
    if (!patient) {
      patient = await Patient.create({
        tenantId,
        whatsappNumber: phone,
        name: name.trim(),
        age: Number(age),
      })
    }
  } else {
    // Walk-in with no phone — create anonymous patient record
    patient = await Patient.create({
      tenantId,
      name: name.trim(),
      age: Number(age),
    })
  }

  // b) Validate slot if provided
  let slot = null
  if (slotId) {
    slot = await Slot.findOne({ _id: slotId, tenantId })
    if (!slot) return apiError('Slot not found', 404)
    if (slot.isBooked) return apiError('Slot is already booked', 400)
  }

  // c) Generate token number (count today's appointments + 1)
  const today = todayString()
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  const todaySlots = await Slot.find({ tenantId, date: today })
  const slotIds = todaySlots.map((s) => s._id)

  const todayCount = await Appointment.countDocuments({
    tenantId,
    $or: [
      { slotId: { $in: slotIds } },
      { isWalkIn: true, arrivedAt: { $gte: todayStart, $lte: todayEnd } },
    ],
  })
  const tokenNumber = todayCount + 1

  // d) Generate booking reference
  const bookingRef = 'WALK' + Math.floor(100000 + Math.random() * 900000).toString()

  // e) Create appointment
  const appointment = await Appointment.create({
    tenantId,
    patientId: patient._id,
    doctorId,
    slotId: slotId || undefined,
    bookingRef,
    tokenNumber,
    symptoms: symptoms.trim(),
    status: 'ARRIVED',
    isWalkIn: true,
    arrivedAt: new Date(),
    feesCollected: 0,
  })

  // f) Mark slot as booked
  if (slot) {
    await Slot.findByIdAndUpdate(slotId, { isBooked: true })
  }

  // Populate for response
  const populated = await Appointment.findById(appointment._id)
    .populate('patientId', 'name age whatsappNumber')
    .populate('doctorId', 'name specialization')
    .populate('slotId', 'startTime endTime date')

  const doctor = populated?.doctorId as { name?: string; specialization?: string } | null
  const patientData = populated?.patientId as { name?: string; age?: number; whatsappNumber?: string } | null
  const slotData = populated?.slotId as { startTime?: string } | null

  // g) Send WhatsApp if phone provided
  if (phone) {
    try {
      const tenant = await Tenant.findById(tenantId)
      if (tenant?.whatsappPhoneId && tenant?.whatsappAccessToken) {
        const message = `Aapka token #${tokenNumber} assign ho gaya hai. ${tenant.name} mein wait karein 🙏`
        await sendWhatsAppMessage(tenant.whatsappPhoneId, tenant.whatsappAccessToken, `91${phone}`, message)
      }
    } catch {
      // WhatsApp send failure is non-fatal
    }
  }

  return apiResponse(
    {
      appointment: populated,
      patient: { name: patientData?.name, age: patientData?.age, phone: patientData?.whatsappNumber },
      doctor: { name: doctor?.name, specialization: doctor?.specialization },
      slot: slotData ? { startTime: slotData.startTime } : null,
      tokenNumber,
    },
    201
  )
}
