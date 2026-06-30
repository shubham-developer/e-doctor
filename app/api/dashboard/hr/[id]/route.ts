import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/db'
import Staff from '@/models/Staff'
import TenantUser from '@/models/TenantUser'
import { apiResponse, apiError } from '@/lib/api'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenantId = req.headers.get('x-tenant-id')
  const userRole = req.headers.get('x-user-role')
  if (!tenantId) return apiError('Unauthorized', 401)
  if (userRole === 'VIEWER') return apiError('Insufficient permissions', 403)

  await connectDB()
  const { id } = await params

  const member = await Staff.findOneAndDelete({ _id: id, tenantId })
  if (!member) return apiError('Staff member not found', 404)

  // Remove their login account if they had one
  if (member.email) {
    await TenantUser.deleteOne({ tenantId, email: member.email })
  }

  return apiResponse({ deleted: true })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // POST /{id}/reset-password — called with action: 'resetPassword' in body
  const tenantId = req.headers.get('x-tenant-id')
  const userRole = req.headers.get('x-user-role')
  if (!tenantId) return apiError('Unauthorized', 401)
  if (userRole === 'VIEWER') return apiError('Insufficient permissions', 403)

  await connectDB()
  const { id } = await params
  const { action } = await req.json()

  if (action !== 'resetPassword') return apiError('Unknown action', 400)

  const member = await Staff.findOne({ _id: id, tenantId })
  if (!member) return apiError('Staff member not found', 404)
  if (!member.email) return apiError('Staff member has no login account', 400)

  const tempPassword = Math.random().toString(36).slice(-8)
  const passwordHash = await bcrypt.hash(tempPassword, 10)

  const updated = await TenantUser.findOneAndUpdate(
    { tenantId, email: member.email },
    { $set: { passwordHash } },
    { new: true }
  )

  if (!updated) return apiError('No login account found for this staff member', 404)

  return apiResponse({ tempPassword })
}
