import { SignJWT, jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)

export const ADMIN_COOKIE = 'edoctor_admin_token'

export interface AdminJWTPayload {
  adminId: string
  email: string
  name: string
  isSuperAdmin: true
}

export async function signAdminToken(payload: Omit<AdminJWTPayload, 'isSuperAdmin'>): Promise<string> {
  return new SignJWT({ ...payload, isSuperAdmin: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET)
}

export async function verifyAdminToken(token: string): Promise<AdminJWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    if (!payload.isSuperAdmin) return null
    return payload as unknown as AdminJWTPayload
  } catch {
    return null
  }
}
