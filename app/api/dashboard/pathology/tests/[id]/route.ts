import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/db'
import PathologyTest from '@/models/PathologyTest'
import { apiResponse, apiError } from '@/lib/api'

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
  )
  if (!test) return apiError('Test not found', 404)
  return apiResponse(test)
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
