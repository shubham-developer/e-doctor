export async function POST() {
  const res = new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
  res.headers.set('Set-Cookie', 'clinicbot_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0')
  return res
}
