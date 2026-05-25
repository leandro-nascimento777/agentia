import { TwilioWhatsAppAdapter } from '../TwilioWhatsAppAdapter'
import type { IFinancialChatPort } from '../../../domain/ports/input/IFinancialChatPort'
import type { IRateLimitPort } from '../../../domain/ports/output/IRateLimitPort'
import { InMemoryUserPreferencesRepository } from '../../secondary/InMemoryUserPreferencesRepository'

function makeSession(reply = 'resposta'): jest.Mocked<IFinancialChatPort> {
  return { chat: jest.fn().mockResolvedValue(reply) }
}

function makeRateLimiter(allow = true): jest.Mocked<IRateLimitPort> {
  return { check: jest.fn().mockReturnValue(allow) }
}

function makeTwilioClient() {
  const create = jest.fn().mockResolvedValue({ sid: 'SM123' })
  return { messages: { create } } as unknown as ReturnType<typeof import('twilio')>
}

describe('TwilioWhatsAppAdapter', () => {
  let twilioClient: ReturnType<typeof makeTwilioClient>
  let mockSession: jest.Mocked<IFinancialChatPort>
  let adapter: TwilioWhatsAppAdapter

  beforeEach(() => {
    twilioClient = makeTwilioClient()
    mockSession = makeSession()
    adapter = new TwilioWhatsAppAdapter(
      twilioClient,
      '+14155238886',
      () => mockSession,
      new InMemoryUserPreferencesRepository(),
      makeRateLimiter(),
    )
  })

  it('sends a greeting on first message from a number', async () => {
    await adapter.handleWebhook('oi', 'whatsapp:+5511999990000')

    const calls = (twilioClient.messages.create as jest.Mock).mock.calls
    const firstBody: string = calls[0][0].body
    expect(firstBody).toMatch(/bom dia|boa tarde|boa noite/i)
    expect(firstBody).toContain('DIMAS')
  })

  it('sends thinking indicator on subsequent messages', async () => {
    await adapter.handleWebhook('primeira', 'whatsapp:+5511999990001')
    ;(twilioClient.messages.create as jest.Mock).mockClear()

    await adapter.handleWebhook('segunda', 'whatsapp:+5511999990001')

    const calls = (twilioClient.messages.create as jest.Mock).mock.calls
    expect(calls[0][0].body).toContain('⏳')
  })

  it('sends the llm reply after processing', async () => {
    mockSession.chat.mockResolvedValue('Aéreo: R$ 500.000')

    await adapter.handleWebhook('quanto foi o aéreo?', 'whatsapp:+5511999990002')

    const allBodies = (twilioClient.messages.create as jest.Mock).mock.calls.map(
      (c: [{ body: string }]) => c[0].body
    )
    expect(allBodies).toContain('Aéreo: R$ 500.000')
  })

  it('creates a new session for each unique phone number', async () => {
    await adapter.handleWebhook('oi', 'whatsapp:+5511111110001')
    await adapter.handleWebhook('oi', 'whatsapp:+5511111110002')

    const allBodies = (twilioClient.messages.create as jest.Mock).mock.calls.map(
      (c: [{ body: string }]) => c[0].body
    )
    const greetings = allBodies.filter((b: string) => /DIMAS/.test(b))
    expect(greetings.length).toBeGreaterThanOrEqual(2)
  })

  it('sends error message when session throws', async () => {
    mockSession.chat.mockRejectedValue(new Error('falha no LLM'))

    await adapter.handleWebhook('oi', 'whatsapp:+5511999990003')

    const allBodies = (twilioClient.messages.create as jest.Mock).mock.calls.map(
      (c: [{ body: string }]) => c[0].body
    )
    const hasError = allBodies.some((b: string) => /erro|problema|tente/i.test(b))
    expect(hasError).toBe(true)
  })

  it('splits messages longer than 4000 chars into multiple sends', async () => {
    const longReply = 'x'.repeat(8500)
    mockSession.chat.mockResolvedValue(longReply)

    await adapter.handleWebhook('oi', 'whatsapp:+5511999990004')

    const creates = twilioClient.messages.create as jest.Mock
    const longCalls = creates.mock.calls.filter(
      (c: [{ body: string }]) => c[0].body.length > 10
    )
    expect(longCalls.length).toBeGreaterThanOrEqual(3)
  })

  it('blocks request and sends limit message when rate limiter denies', async () => {
    const blocked = new TwilioWhatsAppAdapter(
      twilioClient,
      '+14155238886',
      () => mockSession,
      new InMemoryUserPreferencesRepository(),
      makeRateLimiter(false),
    )

    await blocked.handleWebhook('oi', 'whatsapp:+5511999990005')

    expect(mockSession.chat).not.toHaveBeenCalled()
    const allBodies = (twilioClient.messages.create as jest.Mock).mock.calls.map(
      (c: [{ body: string }]) => c[0].body
    )
    expect(allBodies.some((b: string) => /limite/i.test(b))).toBe(true)
  })
})
