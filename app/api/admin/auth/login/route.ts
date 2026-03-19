import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/db'
import AdminUser from '@/models/AdminUser'
import { signAdminToken, ADMIN_COOKIE } from '@/lib/admin-auth'
import { apiResponse, apiError } from '@/lib/api'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) return apiError('Email and password required', 400)

    await connectDB()

    const admin = await AdminUser.findOne({ email: email.toLowerCase() })
    if (!admin) return apiError('Invalid credentials', 401)

    const isValid = await bcrypt.compare(password, admin.passwordHash)
    if (!isValid) return apiError('Invalid credentials', 401)

    const token = await signAdminToken({
      adminId: admin._id.toString(),
      email: admin.email,
      name: admin.name,
    })

    const response = apiResponse({ admin: { id: admin._id, name: admin.name, email: admin.email } })
    const res = new Response(response.body, { status: 200, headers: response.headers })
    res.headers.set(
      'Set-Cookie',
      `${ADMIN_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`
    )
    return res
  } catch {
    return apiError('Internal server error', 500)
  }
}
