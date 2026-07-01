import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/db'
import IpdMedication from '@/models/IpdMedication'
import IpdCharge from '@/models/IpdCharge'
import { apiResponse, apiError } from '@/lib/api'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; medId: string }> }
) {
  const tenantId = req.headers.get('x-tenant-id')
  const role     = req.headers.get('x-user-role')
  if (!tenantId) return apiError('Unauthorized', 401)
  if (role === 'VIEWER') return apiError('Insufficient permissions', 403)

  const { id, medId } = await params
  await connectDB()

  const med = await IpdMedication.findOneAndDelete({ _id: medId, ipdId: id, tenantId })
  if (!med) return apiError('Medication not found', 404)

  // Remove the linked charge
  if (med.chargeId) {
    await IpdCharge.findOneAndDelete({ _id: med.chargeId, tenantId })
  }

  return apiResponse({ deleted: true })
}
