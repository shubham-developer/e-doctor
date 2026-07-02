import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/db'
import ChargeCategory, { IChargeCategory } from '@/models/ChargeCategory'
import ChargeType from '@/models/ChargeType'
import { apiResponse, apiError } from '@/lib/api'

function serialize(item: IChargeCategory) {
  const obj = item.toObject() as Record<string, unknown>
  const type = obj.chargeTypeId as { _id: string; name: string } | null
  return {
    ...obj,
    chargeTypeId: type?._id ?? null,
    chargeTypeName: type?.name ?? null,
  }
}

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id')
  if (!tenantId) return apiError('Unauthorized', 401)

  const moduleFilter = req.nextUrl.searchParams.get('module')

  await connectDB()

  const filter: Record<string, unknown> = { tenantId }
  if (moduleFilter) {
    const chargeTypeIds = await ChargeType.find({ tenantId, applicableModules: moduleFilter }).distinct('_id')
    filter.chargeTypeId = { $in: chargeTypeIds }
  }

  const items = await ChargeCategory.find(filter)
    .sort({ sortOrder: 1, createdAt: 1 })
    .populate('chargeTypeId', 'name')
  return apiResponse(items.map(serialize))
}

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id')
  const role = req.headers.get('x-user-role')
  if (!tenantId) return apiError('Unauthorized', 401)
  if (role === 'VIEWER') return apiError('Insufficient permissions', 403)

  await connectDB()
  const { name, description, chargeTypeId } = await req.json()
  if (!name?.trim()) return apiError('Name is required', 400)

  const count = await ChargeCategory.countDocuments({ tenantId })
  const item = await ChargeCategory.create({
    tenantId,
    name: name.trim(),
    description: description?.trim() || undefined,
    chargeTypeId: chargeTypeId || undefined,
    sortOrder: count,
  })

  return apiResponse(item, 201)
}
