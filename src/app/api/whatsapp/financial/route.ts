import { container } from '@/agents/financial/infrastructure/container.singleton'

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const body     = (formData.get('Body') as string | null)?.trim()
    const from     = formData.get('From') as string | null

    if (!body || !from) {
      return new Response('Missing Body or From', { status: 400 })
    }

    if (!container.whatsapp) {
      return new Response('WhatsApp adapter not configured', { status: 503 })
    }

    // Processa em background — Twilio não precisa esperar a resposta do Claude
    container.whatsapp.handleWebhook(body, from).catch(err =>
      console.error('[financial-webhook] error:', err)
    )

    // Retorna TwiML vazio imediatamente
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { headers: { 'Content-Type': 'text/xml' } }
    )
  } catch (err) {
    console.error('[financial-webhook] unexpected error:', err)
    return new Response('Internal error', { status: 500 })
  }
}
