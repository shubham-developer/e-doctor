import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/db'
import PathologyTest, { IPathologyTest } from '@/models/PathologyTest'
import '@/models/Charge'
import { apiResponse, apiError } from '@/lib/api'

function serialize(test: IPathologyTest) {
  const obj = test.toObject() as Record<string, unknown>
  const charge = obj.chargeId as { _id: string; name: string } | null
  return {
    ...obj,
    chargeId: charge?._id ?? null,
    chargeName: charge?.name ?? null,
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenantId = req.headers.get('x-tenant-id')
  const role     = req.headers.get('x-user-role')
  if (!tenantId) return apiError('Unauthorized', 401)
  if (role === 'VIEWER') return apiError('Insufficient permissions', 403)

  const { id } = await params
  await connectDB()

  const body = await req.json()
  const test = await PathologyTest.findOneAndUpdate(
    { _id: id, tenantId },
    { $set: body },
    { new: true }
  ).populate('chargeId', 'name')
  if (!test) return apiError('Test not found', 404)
  return apiResponse(serialize(test))
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenantId = req.headers.get('x-tenant-id')
  const role     = req.headers.get('x-user-role')
  if (!tenantId) return apiError('Unauthorized', 401)
  if (role === 'VIEWER') return apiError('Insufficient permissions', 403)

  const { id } = await params
  await connectDB()

  const test = await PathologyTest.findOneAndDelete({ _id: id, tenantId })
  if (!test) return apiError('Test not found', 404)
  return apiResponse({ deleted: true })
}
