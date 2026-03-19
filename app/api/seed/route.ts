import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/db'
import Tenant from '@/models/Tenant'
import TenantUser from '@/models/TenantUser'
import Doctor from '@/models/Doctor'
import Slot from '@/models/Slot'
import Patient from '@/models/Patient'
import Appointment from '@/models/Appointment'
import { apiResponse, apiError } from '@/lib/api'
import { format, addDays } from 'date-fns'

function generateBookingRef(): string {
  return 'BK' + Math.random().toString(36).substring(2, 8).toUpperCase()
}

function generateSlots(tenantId: string, doctorId: string, date: string, startHour: number, endHour: number, durationMin: number) {
  const slots = []
  let current = startHour * 60
  const end = endHour * 60
  while (current + durationMin <= end) {
    const sh = Math.floor(current / 60).toString().padStart(2, '0')
    const sm = (current % 60).toString().padStart(2, '0')
    const eh = Math.floor((current + durationMin) / 60).toString().padStart(2, '0')
    const em = ((current + durationMin) % 60).toString().padStart(2, '0')
    slots.push({ tenantId, doctorId, date, startTime: `${sh}:${sm}`, endTime: `${eh}:${em}`, isBooked: false, isBlocked: false })
    current += durationMin
  }
  return slots
}

export async function POST(req: NextRequest) {
  // Only allow in dev
  if (process.env.NODE_ENV === 'production') {
    return apiError('Seed not allowed in production', 403)
  }

  try {
    await connectDB()

    // Clear existing data
    await Promise.all([
      Tenant.deleteMany({}),
      TenantUser.deleteMany({}),
      Doctor.deleteMany({}),
      Slot.deleteMany({}),
      Patient.deleteMany({}),
      Appointment.deleteMany({}),
    ])

    // Create tenant
    const tenant = await Tenant.create({
      name: 'Sharma Clinic Jhansi',
      slug: 'sharma-clinic-jhansi',
      whatsappNumber: '+917891234567',
      whatsappPhoneId: 'PHONE_ID_PLACEHOLDER',
      whatsappAccessToken: 'ACCESS_TOKEN_PLACEHOLDER',
      logoUrl: '',
      brandColor: '#0ea5a0',
      plan: 'GROWTH',
      planExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      isActive: true,
      address: 'Sipri Bazaar, Jhansi, Uttar Pradesh 284001',
    })

    // Create owner user
    const passwordHash = await bcrypt.hash('test1234', 10)
    await TenantUser.create({
      tenantId: tenant._id,
      name: 'Dr. Rajesh Sharma',
      email: 'admin@sharmaclinic.com',
      passwordHash,
      role: 'OWNER',
    })

    // Create receptionist
    await TenantUser.create({
      tenantId: tenant._id,
      name: 'Priya Agarwal',
      email: 'receptionist@sharmaclinic.com',
      passwordHash: await bcrypt.hash('test1234', 10),
      role: 'RECEPTIONIST',
    })

    // Create doctors
    const doctors = await Doctor.insertMany([
      {
        tenantId: tenant._id,
        name: 'Dr. Rajesh Sharma',
        specialization: 'General Physician',
        languages: ['Hindi', 'English'],
        consultationFee: 300,
        isActive: true,
      },
      {
        tenantId: tenant._id,
        name: 'Dr. Sunita Gupta',
        specialization: 'Gynaecologist',
        languages: ['Hindi', 'English', 'Bundeli'],
        consultationFee: 500,
        isActive: true,
      },
      {
        tenantId: tenant._id,
        name: 'Dr. Anil Verma',
        specialization: 'Orthopaedic Surgeon',
        languages: ['Hindi'],
        consultationFee: 400,
        isActive: true,
      },
    ])

    // Create slots for next 7 days
    const allSlots: object[] = []
    for (let d = 0; d < 7; d++) {
      const date = format(addDays(new Date(), d), 'yyyy-MM-dd')
      // Doctor 1: 9am-1pm, 30min slots
      allSlots.push(...generateSlots(tenant._id.toString(), doctors[0]._id.toString(), date, 9, 13, 30))
      // Doctor 2: 10am-2pm, 30min slots
      allSlots.push(...generateSlots(tenant._id.toString(), doctors[1]._id.toString(), date, 10, 14, 30))
      // Doctor 3: 11am-3pm, 45min slots
      allSlots.push(...generateSlots(tenant._id.toString(), doctors[2]._id.toString(), date, 11, 15, 45))
    }

    const createdSlots = await Slot.insertMany(allSlots)

    // Create patients
    const patients = await Patient.insertMany([
      { tenantId: tenant._id, whatsappNumber: '+919876543210', name: 'Ramesh Kumar', age: 45, languagePref: 'hi' },
      { tenantId: tenant._id, whatsappNumber: '+919812345678', name: 'Geeta Devi', age: 32, languagePref: 'hi' },
      { tenantId: tenant._id, whatsappNumber: '+918765432109', name: 'Suresh Yadav', age: 28, languagePref: 'en' },
    ])

    // Create appointments using slots
    const statuses: Array<'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'> = [
      'CONFIRMED', 'CONFIRMED', 'PENDING', 'CONFIRMED', 'CANCELLED',
      'COMPLETED', 'CONFIRMED', 'PENDING', 'COMPLETED', 'CANCELLED',
    ]
    const symptomsList = [
      'Fever and headache', 'Stomach pain', 'Back pain since 3 days',
      'Routine checkup', 'Knee pain', 'Cough and cold',
      'High blood pressure follow-up', 'Pregnancy checkup', 'Shoulder injury', 'Skin rash',
    ]

    const appointments = []
    for (let i = 0; i < 10; i++) {
      const slot = createdSlots[i * 4]
      const patient = patients[i % patients.length]
      const doctor = doctors[i % doctors.length]
      await Slot.findByIdAndUpdate(slot._id, { isBooked: true })
      appointments.push({
        tenantId: tenant._id,
        patientId: patient._id,
        doctorId: doctor._id,
        slotId: slot._id,
        symptoms: symptomsList[i],
        status: statuses[i],
        bookingRef: generateBookingRef(),
        reminder24hSent: i < 5,
        reminder1hSent: i < 3,
      })
    }
    await Appointment.insertMany(appointments)

    return apiResponse({
      message: 'Database seeded successfully',
      tenant: tenant.name,
      loginEmail: 'admin@sharmaclinic.com',
      loginPassword: 'test1234',
    })
  } catch (err) {
    console.error(err)
    return apiError('Seed failed: ' + (err as Error).message, 500)
  }
}
