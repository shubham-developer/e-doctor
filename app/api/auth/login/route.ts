import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/db'
import TenantUser from '@/models/TenantUser'
import Tenant from '@/models/Tenant'
import { signToken } from '@/lib/auth'
import { apiResponse, apiError } from '@/lib/api'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return apiError('Email and password are required', 400)
    }

    await connectDB()

    const user = await TenantUser.findOne({ email: email.toLowerCase() })
    if (!user) {
      return apiError('Invalid credentials', 401)
    }

    const isValid = await bcrypt.compare(password, user.passwordHash)
    if (!isValid) {
      return apiError('Invalid credentials', 401)
    }

    const tenant = await Tenant.findById(user.tenantId)
    if (!tenant || !tenant.isActive) {
      return apiError('Clinic account is inactive', 403)
    }

    const token = await signToken({
      userId: user._id.toString(),
      tenantId: user.tenantId.toString(),
      role: user.role,
      email: user.email,
      name: user.name,
    })

    const response = apiResponse({
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      tenant: { id: tenant._id, name: tenant.name, plan: tenant.plan, logoUrl: tenant.logoUrl },
    })

    const res = new Response(response.body, {
      status: 200,
      headers: response.headers,
    })

    res.headers.set(
      'Set-Cookie',
      `edoctor_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`
    )

    return res
  } catch (err) {
    console.error(err)
    return apiError('Internal server error', 500)
  }
}
