import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/db'
import Supplier from '@/models/Supplier'
import { apiResponse, apiError } from '@/lib/api'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenantId = req.headers.get('x-tenant-id')
  const role     = req.headers.get('x-user-role')
  if (!tenantId) return apiError('Unauthorized', 401)
  if (role === 'VIEWER') return apiError('Insufficient permissions', 403)

  const { id } = await params
  await connectDB()
  const { name, contact, contactPersonName, contactPersonPhone, drugLicenseNumber, address } = await req.json()
  if (!name?.trim()) return apiError('Supplier name is required', 400)

  const supplier = await Supplier.findOneAndUpdate(
    { _id: id, tenantId },
    { $set: { name: name.trim(), contact: contact?.trim() ?? '', contactPersonName: contactPersonName?.trim() ?? '', contactPersonPhone: contactPersonPhone?.trim() ?? '', drugLicenseNumber: drugLicenseNumber?.trim() ?? '', address: address?.trim() ?? '' } },
    { new: true }
  )
  if (!supplier) return apiError('Not found', 404)
  return apiResponse(supplier)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenantId = req.headers.get('x-tenant-id')
  const role     = req.headers.get('x-user-role')
  if (!tenantId) return apiError('Unauthorized', 401)
  if (role === 'VIEWER') return apiError('Insufficient permissions', 403)

  const { id } = await params
  await connectDB()
  const supplier = await Supplier.findOneAndDelete({ _id: id, tenantId })
  if (!supplier) return apiError('Not found', 404)
  return apiResponse({ deleted: true })
}
