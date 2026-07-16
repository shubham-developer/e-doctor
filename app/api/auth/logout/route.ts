import { getSession } from "@/lib/auth";
import { logActivityRaw } from "@/lib/activityLog";

export async function POST() {
  const session = await getSession();
  if (session) {
    logActivityRaw({
      tenantId: session.tenantId,
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      action: "logout",
      module: "auth",
      description: "Signed out",
    });
  }

  const res = new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
  res.headers.set(
    "Set-Cookie",
    "doctorcloud_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
  );
  return res;
}
