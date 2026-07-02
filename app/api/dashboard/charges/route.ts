import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/db'
import Charge, { ICharge } from '@/models/Charge'
import ChargeCategory from '@/models/ChargeCategory'
import ChargeType from '@/models/ChargeType'
import '@/models/UnitType'
import '@/models/TaxCategory'
import { apiResponse, apiError } from '@/lib/api'

function serialize(charge: ICharge) {
  const obj = charge.toObject() as Record<string, unknown>
  const category = obj.chargeCategoryId as { _id: string; name: string; chargeTypeId?: { name: string } | null } | null
  const unit = obj.unitTypeId as { _id: string; name: string } | null
  const tax = obj.taxCategoryId as { _id: string; name: string; percent: number } | null

  return {
    ...obj,
    chargeCategoryId: category?._id ?? null,
    chargeCategoryName: category?.name ?? null,
    chargeTypeName: category?.chargeTypeId?.name ?? null,
    unitTypeId: unit?._id ?? null,
    unitTypeName: unit?.name ?? null,
    taxCategoryId: tax?._id ?? null,
    taxCategoryName: tax?.name ?? null,
    taxPercent: tax?.percent ?? null,
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
    const chargeCategoryIds = await ChargeCategory.find({ tenantId, chargeTypeId: { $in: chargeTypeIds } }).distinct('_id')
    filter.chargeCategoryId = { $in: chargeCategoryIds }
  }

  const charges = await Charge.find(filter)
    .sort({ sortOrder: 1, createdAt: 1 })
    .populate({ path: 'chargeCategoryId', select: 'name chargeTypeId', populate: { path: 'chargeTypeId', select: 'name' } })
    .populate('unitTypeId', 'name')
    .populate('taxCategoryId', 'name percent')

  return apiResponse(charges.map(serialize))
}

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id')
  const role = req.headers.get('x-user-role')
  if (!tenantId) return apiError('Unauthorized', 401)
  if (role === 'VIEWER') return apiError('Insufficient permissions', 403)

  await connectDB()
  const { name, chargeCategoryId, unitTypeId, taxCategoryId, standardCharge } = await req.json()
  if (!name?.trim()) return apiError('Name is required', 400)

  const count = await Charge.countDocuments({ tenantId })
  const charge = await Charge.create({
    tenantId,
    name: name.trim(),
    chargeCategoryId: chargeCategoryId || undefined,
    unitTypeId: unitTypeId || undefined,
    taxCategoryId: taxCategoryId || undefined,
    standardCharge: Number(standardCharge) || 0,
    sortOrder: count,
  })

  return apiResponse(charge, 201)
}
