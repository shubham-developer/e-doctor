import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/db'
import IpdLabTest from '@/models/IpdLabTest'
import IpdCharge from '@/models/IpdCharge'
import { apiResponse, apiError } from '@/lib/api'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; labTestId: string }> }
) {
  const tenantId = req.headers.get('x-tenant-id')
  const role     = req.headers.get('x-user-role')
  if (!tenantId) return apiError('Unauthorized', 401)
  if (role === 'VIEWER') return apiError('Insufficient permissions', 403)

  const { id, labTestId } = await params
  await connectDB()

  const labTest = await IpdLabTest.findOneAndDelete({ _id: labTestId, ipdId: id, tenantId })
  if (!labTest) return apiError('Lab test not found', 404)

  if (labTest.chargeId) {
    await IpdCharge.findOneAndDelete({ _id: labTest.chargeId, tenantId })
  }

  return apiResponse({ deleted: true })
}
