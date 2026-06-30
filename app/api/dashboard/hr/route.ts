import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/db'
import Staff from '@/models/Staff'
import TenantUser from '@/models/TenantUser'
import '@/models/Role'
import { apiResponse, apiError } from '@/lib/api'

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id')
  if (!tenantId) return apiError('Unauthorized', 401)

  await connectDB()

  const search = req.nextUrl.searchParams.get('search') ?? ''
  const role   = req.nextUrl.searchParams.get('role')   ?? ''
  const page   = Math.max(1, Number(req.nextUrl.searchParams.get('page')  ?? '1'))
  const limit  = Math.min(200, Math.max(1, Number(req.nextUrl.searchParams.get('limit') ?? '100')))

  const query: Record<string, unknown> = { tenantId }
  if (role)   query.role = role
  if (search) {
    query.$or = [
      { name:        { $regex: search, $options: 'i' } },
      { phone:       { $regex: search, $options: 'i' } },
      { department:  { $regex: search, $options: 'i' } },
      { designation: { $regex: search, $options: 'i' } },
    ]
  }

  const [staff, total] = await Promise.all([
    Staff.find(query).populate('customRoleId', 'name').sort({ staffCode: 1 }).skip((page - 1) * limit).limit(limit),
    Staff.countDocuments(query),
  ])

  return apiResponse({ staff, total, page, totalPages: Math.ceil(total / limit) })
}

export async function POST(req: NextRequest) {
  const tenantId  = req.headers.get('x-tenant-id')
  const userRole  = req.headers.get('x-user-role')
  if (!tenantId) return apiError('Unauthorized', 401)
  if (userRole === 'VIEWER') return apiError('Insufficient permissions', 403)

  await connectDB()
  const body = await req.json()
  const {
    name, phone, alternatePhone, email,
    role: staffRole, customRoleId,
    designation, department, floor, address,
    dateOfBirth, dateOfJoining, salary,
  } = body

  if (!name?.trim())      return apiError('Name is required', 400)
  if (!staffRole?.trim()) return apiError('Role is required', 400)

  const count    = await Staff.countDocuments({ tenantId })
  const staffCode = 9001 + count

  const member = await Staff.create({
    tenantId,
    staffCode,
    name: name.trim(),
    ...(phone?.trim()          && { phone: phone.trim() }),
    ...(alternatePhone?.trim() && { alternatePhone: alternatePhone.trim() }),
    ...(email?.trim()          && { email: email.trim().toLowerCase() }),
    role: staffRole.trim(),
    ...(customRoleId           && { customRoleId }),
    ...(designation?.trim()   && { designation: designation.trim() }),
    ...(department?.trim()    && { department: department.trim() }),
    ...(floor?.trim()         && { floor: floor.trim() }),
    ...(address?.trim()       && { address: address.trim() }),
    ...(dateOfBirth?.trim()   && { dateOfBirth: dateOfBirth.trim() }),
    ...(dateOfJoining?.trim() && { dateOfJoining: dateOfJoining.trim() }),
    ...(salary !== undefined   && { salary: Number(salary) }),
  })

  // Auto-create login account if email is provided
  let tempPassword: string | undefined
  if (email?.trim()) {
    const normalEmail = email.trim().toLowerCase()
    const existing = await TenantUser.findOne({ tenantId, email: normalEmail })
    if (!existing) {
      tempPassword = Math.random().toString(36).slice(-8)
      const passwordHash = await bcrypt.hash(tempPassword, 10)
      await TenantUser.create({
        tenantId,
        name: name.trim(),
        email: normalEmail,
        passwordHash,
        role: 'RECEPTIONIST',
        ...(customRoleId && { customRoleId }),
      })
    } else if (customRoleId) {
      // Update existing user's custom role
      await TenantUser.findByIdAndUpdate(existing._id, { $set: { customRoleId } })
    }
  }

  return apiResponse({ ...member.toJSON(), tempPassword }, 201)
}

export async function PATCH(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id')
  const userRole = req.headers.get('x-user-role')
  if (!tenantId) return apiError('Unauthorized', 401)
  if (userRole === 'VIEWER') return apiError('Insufficient permissions', 403)

  await connectDB()
  const body = await req.json()
  const { id, customRoleId, ...updates } = body
  if (!id) return apiError('Staff id required', 400)

  const setFields: Record<string, unknown> = { ...updates }
  const unsetFields: Record<string, unknown> = {}

  if (customRoleId) setFields.customRoleId = customRoleId
  else unsetFields.customRoleId = 1

  const member = await Staff.findOneAndUpdate(
    { _id: id, tenantId },
    {
      $set: setFields,
      ...(Object.keys(unsetFields).length > 0 && { $unset: unsetFields }),
    },
    { new: true }
  )
  if (!member) return apiError('Staff member not found', 404)

  // Sync custom role to TenantUser if they have a login account
  if (member.email) {
    const update = customRoleId
      ? { $set: { customRoleId } }
      : { $unset: { customRoleId: 1 } }
    await TenantUser.findOneAndUpdate({ tenantId, email: member.email }, update)
  }

  return apiResponse(member)
}
