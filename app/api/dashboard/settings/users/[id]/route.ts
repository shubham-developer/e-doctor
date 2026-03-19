import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/db'
import TenantUser from '@/models/TenantUser'
import { apiResponse, apiError } from '@/lib/api'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenantId = req.headers.get('x-tenant-id')
  const role = req.headers.get('x-user-role')
  const userId = req.headers.get('x-user-id')
  if (!tenantId) return apiError('Unauthorized', 401)
  if (role !== 'OWNER') return apiError('Only owners can modify team members', 403)

  const { id } = await params
  await connectDB()

  const body = await req.json()
  const user = await TenantUser.findOneAndUpdate(
    { _id: id, tenantId },
    { $set: { role: body.role } },
    { new: true }
  ).select('-passwordHash')

  if (!user) return apiError('User not found', 404)
  return apiResponse(user)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenantId = req.headers.get('x-tenant-id')
  const role = req.headers.get('x-user-role')
  const userId = req.headers.get('x-user-id')
  if (!tenantId) return apiError('Unauthorized', 401)
  if (role !== 'OWNER') return apiError('Only owners can remove team members', 403)

  const { id } = await params
  if (id === userId) return apiError('Cannot delete your own account', 400)

  await connectDB()
  const user = await TenantUser.findOneAndDelete({ _id: id, tenantId })
  if (!user) return apiError('User not found', 404)
  return apiResponse({ deleted: true })
}
