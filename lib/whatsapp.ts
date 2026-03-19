export async function sendWhatsAppMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  message: string,
) {
  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: message },
    }),
  })

  const data = await res.json()

  if (!res.ok) {
    console.error('WhatsApp send error:', data)
    throw new Error('Failed to send WhatsApp message')
  }

  return data
}
