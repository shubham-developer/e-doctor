import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/db'
import Prescription from '@/models/Prescription'
import OpdVisit from '@/models/OpdVisit'
import { apiResponse, apiError } from '@/lib/api'

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id')
  const role = req.headers.get('x-user-role')
  if (!tenantId) return apiError('Unauthorized', 401)
  if (role === 'VIEWER') return apiError('Insufficient permissions', 403)

  await connectDB()
  const body = await req.json()
  const { opdVisitId, patientId, headerNote, findings, medicines, footerNote, pathology, radiology } = body

  if (!opdVisitId) return apiError('OPD Visit ID is required', 400)
  if (!patientId)  return apiError('Patient ID is required', 400)

  const visit = await OpdVisit.findOne({ _id: opdVisitId, tenantId })
  if (!visit) return apiError('OPD Visit not found', 404)

  const prescription = await Prescription.create({
    tenantId,
    opdVisitId,
    patientId,
    doctorId: visit.doctorId ?? undefined,
    headerNote: headerNote?.trim() || undefined,
    findings: Array.isArray(findings) ? findings.filter((f: { name?: string; category?: string; description?: string }) => f.category || f.description) : [],
    medicines: Array.isArray(medicines) ? medicines.filter((m: { name?: string }) => m.name?.trim()) : [],
    footerNote: footerNote?.trim() || undefined,
    pathology: pathology?.trim() || undefined,
    radiology: radiology?.trim() || undefined,
  })

  return apiResponse(prescription, 201)
}

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id')
  if (!tenantId) return apiError('Unauthorized', 401)

  await connectDB()
  const opdVisitId = req.nextUrl.searchParams.get('opdVisitId')
  if (!opdVisitId) return apiError('opdVisitId required', 400)

  const prescription = await Prescription.findOne({ tenantId, opdVisitId })
  return apiResponse(prescription)
}
