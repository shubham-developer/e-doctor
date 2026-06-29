import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/db'
import Staff from '@/models/Staff'
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
    Staff.find(query).sort({ staffCode: 1 }).skip((page - 1) * limit).limit(limit),
    Staff.countDocuments(query),
  ])

  return apiResponse({ staff, total, page, totalPages: Math.ceil(total / limit) })
}

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id')
  const role     = req.headers.get('x-user-role')
  if (!tenantId) return apiError('Unauthorized', 401)
  if (role === 'VIEWER') return apiError('Insufficient permissions', 403)

  await connectDB()
  const body = await req.json()
  const { name, phone, alternatePhone, email, role: staffRole, designation, department, floor, address, dateOfBirth, dateOfJoining, salary } = body

  if (!name?.trim())     return apiError('Name is required', 400)
  if (!staffRole?.trim()) return apiError('Role is required', 400)

  const count = await Staff.countDocuments({ tenantId })
  const staffCode = 9001 + count

  const member = await Staff.create({
    tenantId,
    staffCode,
    name: name.trim(),
    ...(phone?.trim()          && { phone: phone.trim() }),
    ...(alternatePhone?.trim() && { alternatePhone: alternatePhone.trim() }),
    ...(email?.trim()          && { email: email.trim() }),
    role: staffRole.trim(),
    ...(designation?.trim()  && { designation: designation.trim() }),
    ...(department?.trim()   && { department: department.trim() }),
    ...(floor?.trim()        && { floor: floor.trim() }),
    ...(address?.trim()      && { address: address.trim() }),
    ...(dateOfBirth?.trim()  && { dateOfBirth: dateOfBirth.trim() }),
    ...(dateOfJoining?.trim()&& { dateOfJoining: dateOfJoining.trim() }),
    ...(salary !== undefined  && { salary: Number(salary) }),
  })

  return apiResponse(member, 201)
}

export async function PATCH(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id')
  const role     = req.headers.get('x-user-role')
  if (!tenantId) return apiError('Unauthorized', 401)
  if (role === 'VIEWER') return apiError('Insufficient permissions', 403)

  await connectDB()
  const body = await req.json()
  const { id, ...updates } = body
  if (!id) return apiError('Staff id required', 400)

  const member = await Staff.findOneAndUpdate(
    { _id: id, tenantId },
    { $set: updates },
    { new: true }
  )
  if (!member) return apiError('Staff member not found', 404)
  return apiResponse(member)
}
