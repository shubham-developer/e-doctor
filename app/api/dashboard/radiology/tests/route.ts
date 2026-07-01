import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/db'
import RadiologyTest from '@/models/RadiologyTest'
import { apiResponse, apiError } from '@/lib/api'

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id')
  if (!tenantId) return apiError('Unauthorized', 401)
  await connectDB()

  const search = req.nextUrl.searchParams.get('search') ?? ''
  const query: Record<string, unknown> = { tenantId }
  if (search) query.name = { $regex: search, $options: 'i' }

  const tests = await RadiologyTest.find(query).sort({ createdAt: -1 })
  return apiResponse({ tests, total: tests.length })
}

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id')
  const role     = req.headers.get('x-user-role')
  if (!tenantId) return apiError('Unauthorized', 401)
  if (role === 'VIEWER') return apiError('Insufficient permissions', 403)
  await connectDB()

  const body = await req.json()
  const { name, shortName, testType, method, reportDays, tax, standardCharge, amount } = body

  if (!name?.trim())      return apiError('Test name is required', 400)
  if (!shortName?.trim()) return apiError('Short name is required', 400)

  const test = await RadiologyTest.create({
    tenantId,
    name:           name.trim(),
    shortName:      shortName.trim(),
    testType:       testType?.trim()  || undefined,
    method:         method?.trim()    || undefined,
    reportDays:     Number(reportDays)   || 0,
    tax:            Number(tax)          || 0,
    standardCharge: Number(standardCharge) || 0,
    amount:         Number(amount)       || 0,
  })

  return apiResponse(test, 201)
}
