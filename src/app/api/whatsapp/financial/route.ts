import twilio from 'twilio'
import { container } from '@/agents/financial/infrastructure/container.singleton'

// ─── Rate limiter (sliding window, in-memory) ──────────────────────────────

const RATE_LIMIT_MAX = 30 // 30 requisições por minuto por IP
const RATE_LIMIT_WINDOW_MS = 60_000

const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(key: string): boolean {
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }

  if (entry.count >= RATE_LIMIT_MAX) return true
  entry.count++
  return false
}

// ─── Twilio signature validation ───────────────────────────────────────────

async function validateTwilioSignature(req: Request): Promise<boolean> {
  const authToken = process.env.TWILIO_AUTH_TOKEN
  if (!authToken) return false

  const signature = req.headers.get('x-twilio-signature') ?? ''
  const url       = req.url
  const formData  = await req.clone().formData()

  const params: Record<string, string> = {}
  formData.forEach((value, key) => { params[key] = value.toString() })

  return twilio.validateRequest(authToken, signature, url, params)
}

// ─── Route handler ─────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
    if (isRateLimited(ip)) {
      console.warn(`[financial-webhook] rate limit exceeded for ${ip}`)
      return new Response('Too Many Requests', { status: 429 })
    }

    if (process.env.NODE_ENV === 'production') {
      const isValid = await validateTwilioSignature(req)
      if (!isValid) {
        console.warn('[financial-webhook] rejected: invalid Twilio signature')
        return new Response('Forbidden', { status: 403 })
      }
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
