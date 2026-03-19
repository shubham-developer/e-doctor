import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/db'
import Doctor from '@/models/Doctor'
import { apiResponse, apiError } from '@/lib/api'

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id')
  if (!tenantId) return apiError('Unauthorized', 401)

  await connectDB()
  const doctors = await Doctor.find({ tenantId }).sort({ createdAt: -1 })
  return apiResponse(doctors)
}

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id')
  const role = req.headers.get('x-user-role')
  if (!tenantId) return apiError('Unauthorized', 401)
  if (role === 'VIEWER') return apiError('Insufficient permissions', 403)

  await connectDB()
  const body = await req.json()
  const { name, specialization, consultationFee, languages, photoUrl } = body

  if (!name || !specialization) return apiError('Name and specialization are required', 400)

  const doctor = await Doctor.create({
    tenantId,
    name,
    specialization,
    consultationFee: Number(consultationFee) || 0,
    languages: languages || ['Hindi', 'English'],
    photoUrl: photoUrl || '',
  })

  return apiResponse(doctor, 201)
}
