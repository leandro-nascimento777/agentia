import twilio from 'twilio'
import { container } from '@/agents/financial/infrastructure/container.singleton'

async function validateTwilioSignature(req: Request): Promise<boolean> {
  const authToken = process.env.TWILIO_AUTH_TOKEN
  if (!authToken) return false

  const signature  = req.headers.get('x-twilio-signature') ?? ''
  const url        = req.url
  const formData   = await req.clone().formData()

  const params: Record<string, string> = {}
  formData.forEach((value, key) => { params[key] = value.toString() })

  return twilio.validateRequest(authToken, signature, url, params)
}

export async function POST(req: Request) {
  try {
    const isValid = await validateTwilioSignature(req)
    if (!isValid) {
      console.warn('[financial-webhook] rejected: invalid Twilio signature')
      return new Response('Forbidden', { status: 403 })
    }

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

    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { headers: { 'Content-Type': 'text/xml' } }
    )
  } catch (err) {
    console.error('[financial-webhook] unexpected error:', err)
    return new Response('Internal error', { status: 500 })
  }
}
