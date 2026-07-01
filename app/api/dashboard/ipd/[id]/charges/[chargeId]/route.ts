import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/db'
import IpdCharge from '@/models/IpdCharge'
import { apiResponse, apiError } from '@/lib/api'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; chargeId: string }> }
) {
  const tenantId = req.headers.get('x-tenant-id')
  const role     = req.headers.get('x-user-role')
  if (!tenantId) return apiError('Unauthorized', 401)
  if (role === 'VIEWER') return apiError('Insufficient permissions', 403)

  const { id, chargeId } = await params
  await connectDB()

  const body  = await req.json()
  const qty   = Math.max(1, Number(body.quantity) || 1)
  const price = Number(body.unitPrice) || 0
  const total = qty * price

  const charge = await IpdCharge.findOneAndUpdate(
    { _id: chargeId, ipdId: id, tenantId },
    { $set: { ...body, quantity: qty, unitPrice: price, total } },
    { new: true }
  )

  if (!charge) return apiError('Charge not found', 404)
  return apiResponse(charge)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; chargeId: string }> }
) {
  const tenantId = req.headers.get('x-tenant-id')
  const role     = req.headers.get('x-user-role')
  if (!tenantId) return apiError('Unauthorized', 401)
  if (role === 'VIEWER') return apiError('Insufficient permissions', 403)

  const { id, chargeId } = await params
  await connectDB()

  const charge = await IpdCharge.findOneAndDelete({ _id: chargeId, ipdId: id, tenantId })
  if (!charge) return apiError('Charge not found', 404)
  return apiResponse({ deleted: true })
}
