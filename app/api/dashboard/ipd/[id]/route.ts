import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/db'
import IpdAdmission from '@/models/IpdAdmission'
import Bed from '@/models/Bed'
import { apiResponse, apiError } from '@/lib/api'
import { todayString } from '@/lib/format'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenantId = req.headers.get('x-tenant-id')
  const role     = req.headers.get('x-user-role')
  if (!tenantId) return apiError('Unauthorized', 401)
  if (role === 'VIEWER') return apiError('Insufficient permissions', 403)

  const { id } = await params
  await connectDB()

  const body = await req.json()

  // Auto-set dischargeDate when discharging
  if (body.status === 'DISCHARGED' && !body.dischargeDate) {
    body.dischargeDate = todayString()
  }

  // Fetch existing admission before update so we know the current bed
  const existing = await IpdAdmission.findOne({ _id: id, tenantId })
  if (!existing) return apiError('IPD admission not found', 404)

  // Free the old bed if discharging
  if (body.status === 'DISCHARGED' && existing.bedNumber) {
    await Bed.findOneAndUpdate(
      { tenantId, name: existing.bedNumber },
      { $set: { status: 'available' } }
    )
  }

  // If bed is being reassigned, free old and allot new
  if (body.bedNumber && body.bedNumber !== existing.bedNumber) {
    if (existing.bedNumber) {
      await Bed.findOneAndUpdate(
        { tenantId, name: existing.bedNumber },
        { $set: { status: 'available' } }
      )
    }
    await Bed.findOneAndUpdate(
      { tenantId, name: body.bedNumber },
      { $set: { status: 'allotted' } }
    )
  }

  const admission = await IpdAdmission.findOneAndUpdate(
    { _id: id, tenantId },
    { $set: body },
    { new: true }
  )
    .populate('patientId', 'name age patientCode gender phone')
    .populate('doctorId', 'name specialization staffCode designation')

  return apiResponse(admission)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenantId = req.headers.get('x-tenant-id')
  const role     = req.headers.get('x-user-role')
  if (!tenantId) return apiError('Unauthorized', 401)
  if (role === 'VIEWER') return apiError('Insufficient permissions', 403)

  const { id } = await params
  await connectDB()

  const admission = await IpdAdmission.findOneAndDelete({ _id: id, tenantId })
  if (!admission) return apiError('IPD admission not found', 404)

  // Free the bed when the IPD record is deleted
  if (admission.bedNumber) {
    await Bed.findOneAndUpdate(
      { tenantId, name: admission.bedNumber },
      { $set: { status: 'available' } }
    )
  }

  return apiResponse({ deleted: true })
}
