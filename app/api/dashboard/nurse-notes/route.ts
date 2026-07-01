import { NextRequest } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/db'
import NurseNote from '@/models/NurseNote'
import '@/models/Patient'
import { apiResponse, apiError } from '@/lib/api'

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id')
  if (!tenantId) return apiError('Unauthorized', 401)

  await connectDB()
  const tid = new mongoose.Types.ObjectId(tenantId)

  const url    = new URL(req.url)
  const pid    = url.searchParams.get('patientId')
  const limit  = Math.min(Number(url.searchParams.get('limit') ?? '50'), 200)

  const filter: Record<string, unknown> = { tenantId: tid }
  if (pid) filter.patientId = new mongoose.Types.ObjectId(pid)

  const notes = await NurseNote.find(filter)
    .populate('patientId', 'name patientCode')
    .sort({ createdAt: -1 })
    .limit(limit)

  return apiResponse(notes)
}

export async function POST(req: NextRequest) {
  const tenantId   = req.headers.get('x-tenant-id')
  const userId     = req.headers.get('x-user-id')
  const userName   = req.headers.get('x-user-name')
  const userRole   = req.headers.get('x-user-role')
  if (!tenantId || !userId) return apiError('Unauthorized', 401)
  if (userRole === 'VIEWER') return apiError('Insufficient permissions', 403)

  await connectDB()

  const body = await req.json()
  const { patientId, note, vitalSigns } = body

  if (!patientId) return apiError('Patient is required', 400)
  if (!note?.trim()) return apiError('Note is required', 400)

  const doc = await NurseNote.create({
    tenantId:    new mongoose.Types.ObjectId(tenantId),
    patientId:   new mongoose.Types.ObjectId(patientId),
    note:        note.trim(),
    vitalSigns:  vitalSigns ?? undefined,
    addedById:   userId,
    addedByName: userName ?? 'Unknown',
    addedByRole: userRole ?? 'STAFF',
  })

  const populated = await doc.populate('patientId', 'name patientCode')
  return apiResponse(populated)
}
