import twilio from 'twilio'
import type { IFinancialChatPort } from '../../domain/ports/input/IFinancialChatPort'
import type { IUserPreferencesPort } from '../../domain/ports/output/IUserPreferencesPort'
import type { IRateLimitPort } from '../../domain/ports/output/IRateLimitPort'
import { getGreeting } from '../../domain/utils/greeting'

type TwilioClient = ReturnType<typeof twilio>

export type SessionFactory = (phoneNumber: string) => IFinancialChatPort

type Session = { useCase: IFinancialChatPort; lastSeen: number }

export class TwilioWhatsAppAdapter {
  private readonly sessions = new Map<string, Session>()
  private static readonly TIMEOUT_MS = 55000
  private static readonly SESSION_TTL_MS = 2 * 60 * 60 * 1000 // 2 hours

  constructor(
    private readonly twilioClient: TwilioClient,
    private readonly fromNumber: string,
    private readonly sessionFactory: SessionFactory,
    private readonly preferences: IUserPreferencesPort,
    private readonly rateLimiter: IRateLimitPort,
  ) {}

  async handleWebhook(messageBody: string, fromNumber: string): Promise<void> {
    if (!this.rateLimiter.check(fromNumber)) {
      await this.send(fromNumber, 'Limite diário de consultas atingido. Retorne amanhã.')
      return
    }

    const { useCase, isNew } = this.getOrCreateSession(fromNumber)

    if (isNew) {
      await this.send(fromNumber, this.buildGreeting(fromNumber))
    } else {
      await this.send(fromNumber, '⏳ Consultando...')
    }

    try {
      const reply = await this.withTimeout(
        useCase.chat(messageBody),
        TwilioWhatsAppAdapter.TIMEOUT_MS
      )
      await this.send(fromNumber, reply)
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      console.error('[DIMAS] webhook error:', errMsg)

      const msg = errMsg === 'timeout'
        ? 'Desculpe, a consulta demorou mais que o esperado. Tente novamente em instantes.'
        : `Ocorreu um erro ao processar sua pergunta. Detalhe: ${errMsg.slice(0, 100)}`

      await this.send(fromNumber, msg).catch(e =>
        console.error('[DIMAS] failed to send error message:', e)
      )
    }
  }

  async sendDirect(to: string, body: string): Promise<void> {
    await this.send(to, body)
  }

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined
    const timeout = new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(new Error('timeout')), ms)
    })
    return Promise.race([
      promise.finally(() => clearTimeout(timer)),
      timeout,
    ])
  }

  private getOrCreateSession(phoneNumber: string): { useCase: IFinancialChatPort; isNew: boolean } {
    this.evictExpiredSessions()
    const existing = this.sessions.get(phoneNumber)
    if (existing) {
      existing.lastSeen = Date.now()
      return { useCase: existing.useCase, isNew: false }
    }
    const useCase = this.sessionFactory(phoneNumber)
    this.sessions.set(phoneNumber, { useCase, lastSeen: Date.now() })
    return { useCase, isNew: true }
  }

  private evictExpiredSessions(): void {
    const cutoff = Date.now() - TwilioWhatsAppAdapter.SESSION_TTL_MS
    for (const [phone, session] of this.sessions) {
      if (session.lastSeen < cutoff) this.sessions.delete(phone)
    }
  }

  private buildGreeting(phoneNumber: string): string {
    const prefs = this.preferences.get(phoneNumber)
    const name  = prefs?.ownerName ?? 'Wagner'
    const briefingTime = prefs?.briefingTime ?? '08:00'
    const saudacao = getGreeting(new Date().getHours())
    return `${saudacao} Sr. ${name}, tudo bem? Sou o DIMAS, seu assistente pessoal da Sakura.\n\nTodo dia envio automaticamente um panorama financeiro para o senhor. O horario atual e ${briefingTime}.\n\nSe quiser mudar o horario e so me dizer, por exemplo: "muda para 7h". Como posso ajudar agora?`
  }

  private async send(to: string, body: string): Promise<void> {
    const chunks = this.splitMessage(body)
    for (const chunk of chunks) {
      const msg = await this.twilioClient.messages.create({
        from: `whatsapp:${this.fromNumber}`,
        to,
        body: chunk
      })
      console.log(`[Twilio] sid=${msg.sid} status=${msg.status} to=${to} from=whatsapp:${this.fromNumber}`)
      if (msg.errorCode) {
        console.error(`[Twilio] errorCode=${msg.errorCode} errorMessage=${msg.errorMessage}`)
      }
    }
  }

  private splitMessage(text: string, maxLength = 4000): string[] {
    if (text.length <= maxLength) return [text]
    const chunks: string[] = []
    let remaining = text
    while (remaining.length > maxLength) {
      const cut = remaining.lastIndexOf('\n', maxLength)
      const pos = cut > 0 ? cut : maxLength
      chunks.push(remaining.slice(0, pos))
      remaining = remaining.slice(pos).trimStart()
    }
    if (remaining) chunks.push(remaining)
    return chunks
  }
}
