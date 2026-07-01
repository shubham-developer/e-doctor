import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/db'
import RadiologyTest from '@/models/RadiologyTest'
import { apiResponse, apiError } from '@/lib/api'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenantId = req.headers.get('x-tenant-id')
  const role     = req.headers.get('x-user-role')
  if (!tenantId) return apiError('Unauthorized', 401)
  if (role === 'VIEWER') return apiError('Insufficient permissions', 403)

  const { id } = await params
  await connectDB()

  const body = await req.json()
  const { name, shortName, testType, method, reportDays, tax, standardCharge, amount } = body

  if (name !== undefined && !name.trim())      return apiError('Test name is required', 400)
  if (shortName !== undefined && !shortName.trim()) return apiError('Short name is required', 400)

  const test = await RadiologyTest.findOneAndUpdate(
    { _id: id, tenantId },
    {
      $set: {
        ...(name           !== undefined && { name:           name.trim() }),
        ...(shortName      !== undefined && { shortName:      shortName.trim() }),
        ...(testType       !== undefined && { testType:       testType?.trim() || undefined }),
        ...(method         !== undefined && { method:         method?.trim()   || undefined }),
        ...(reportDays     !== undefined && { reportDays:     Number(reportDays) }),
        ...(tax            !== undefined && { tax:            Number(tax) }),
        ...(standardCharge !== undefined && { standardCharge: Number(standardCharge) }),
        ...(amount         !== undefined && { amount:         Number(amount) }),
      },
    },
    { new: true }
  )

  if (!test) return apiError('Test not found', 404)
  return apiResponse(test)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenantId = req.headers.get('x-tenant-id')
  const role     = req.headers.get('x-user-role')
  if (!tenantId) return apiError('Unauthorized', 401)
  if (role === 'VIEWER') return apiError('Insufficient permissions', 403)

  const { id } = await params
  await connectDB()

  const test = await RadiologyTest.findOneAndDelete({ _id: id, tenantId })
  if (!test) return apiError('Test not found', 404)
  return apiResponse({ deleted: true })
}
