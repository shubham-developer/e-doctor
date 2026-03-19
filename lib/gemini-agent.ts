import { GoogleGenerativeAI } from "@google/generative-ai"; // Updated import
import { connectDB } from "@/lib/db";
import Patient from "@/models/Patient";
import Slot from "@/models/Slot";
import Appointment from "@/models/Appointment";
import { ITenant } from "@/models/Tenant";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

interface PopulatedSlot {
  _id: string;
  startTime: string;
  endTime: string;
  doctorId: {
    _id: string;
    name: string;
    specialization: string;
    consultationFee: number;
  };
}

export async function getAgentReply(
  tenant: ITenant,
  patientPhone: string,
  userMessage: string,
): Promise<string> {
  await connectDB();

  // Load or create patient
  let patient = await Patient.findOne({
    tenantId: tenant._id,
    whatsappNumber: patientPhone,
  });
  if (!patient) {
    patient = await Patient.create({
      tenantId: tenant._id,
      whatsappNumber: patientPhone,
      name: "Patient",
      languagePref: "hi",
    });
  }

  // Get today's available slots
  const today = new Date().toISOString().split("T")[0];
  const slots = (await Slot.find({
    tenantId: tenant._id,
    date: today,
    isBooked: false,
    isBlocked: false,
  })
    .populate("doctorId", "name specialization consultationFee")
    .sort({ startTime: 1 })
    .lean()) as unknown as PopulatedSlot[];

  const slotList =
    slots
      .map(
        (s) =>
          `SlotID:${s._id} | ${s.doctorId.name} | ${s.startTime}-${s.endTime} | ₹${s.doctorId.consultationFee}`,
      )
      .join("\n") || "No slots available today";

  // Gemini uses "System Instruction" and "Content" parts
  const chat = model.startChat({
    history: [],
    generationConfig: {
      maxOutputTokens: 300,
      temperature: 0.7,
    },
    systemInstruction: {
      role: "system",
      parts: [
        {
          text: `You are a WhatsApp appointment booking assistant for ${tenant.name}.
You help patients book doctor appointments in Hindi or English.

Available Slots Today (${today}):
${slotList}

Rules:
- Detect if patient writes Hindi, English or Hinglish — reply in SAME language
- Keep ALL replies under 60 words — patient is on mobile
- Always give numbered options (1, 2, 3) — never open ended questions
- In Hindi use "ji" suffix e.g. "Ramesh ji"
- Only book from available slots above — never make up times
- When booking confirmed: give booking ref like APT + random 6 digits
- Be warm, simple, and helpful
- If patient says "cancel" or "reschedule" help them do that`,
        },
      ],
    },
  });

  const result = await chat.sendMessage(userMessage);
  const reply = result.response.text();

  // Save booking if Gemini confirmed one
  await checkAndSaveBooking(
    reply,
    tenant._id.toString(),
    patient._id.toString(),
    slots,
  );

  return reply;
}

async function checkAndSaveBooking(
  reply: string,
  tenantId: string,
  patientId: string,
  slots: PopulatedSlot[],
) {
  const bookingRefMatch = reply.match(/APT\d{6}/);
  if (!bookingRefMatch) return;

  const slot = slots[0];
  if (!slot) return;

  const existing = await Appointment.findOne({
    bookingRef: bookingRefMatch[0],
  });
  if (existing) return;

  await Appointment.create({
    tenantId,
    patientId,
    doctorId: slot.doctorId._id,
    slotId: slot._id,
    bookingRef: bookingRefMatch[0],
    status: "CONFIRMED",
  });

  await Slot.findByIdAndUpdate(slot._id, { isBooked: true });
}
