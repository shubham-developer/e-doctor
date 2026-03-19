import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Tenant from "@/models/Tenant";
import { getAgentReply } from "@/lib/gemini-agent";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

// Meta calls this once to verify the webhook
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

// Meta sends patient messages here
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];
    const phoneNumberId = value?.metadata?.phone_number_id;

    if (!message || message.type !== "text") {
      return NextResponse.json({ status: "ok" });
    }

    const from: string = message.from;
    const text: string = message.text?.body;

    await connectDB();

    const tenant = await Tenant.findOne({ whatsappPhoneId: phoneNumberId });
    if (!tenant) {
      return NextResponse.json({ status: "ok" });
    }

    const reply = await getAgentReply(tenant, from, text);

    await sendWhatsAppMessage(
      tenant.whatsappPhoneId,
      tenant.whatsappAccessToken,
      from,
      reply,
    );

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ status: "ok" });
  }
}
