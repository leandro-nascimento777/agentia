import twilio from 'twilio'
import type { IFinancialChatPort } from '../../domain/ports/input/IFinancialChatPort'
import type { IAgentLLMPort } from '../../domain/ports/output/IAgentLLMPort'
import type { IFinancialDataPort } from '../../domain/ports/output/IFinancialDataPort'
import type { IUserPreferencesPort } from '../../domain/ports/output/IUserPreferencesPort'
import { FinancialChatUseCase } from '../../domain/usecases/FinancialChatUseCase'
import { InMemoryConversationRepository } from '../secondary/InMemoryConversationRepository'

type TwilioClient = ReturnType<typeof twilio>

export class TwilioWhatsAppAdapter {
  private readonly sessions = new Map<string, IFinancialChatPort>()

  constructor(
    private readonly twilioClient: TwilioClient,
    private readonly fromNumber: string,
    private readonly llm: IAgentLLMPort,
    private readonly dataService: IFinancialDataPort,
    private readonly preferences: IUserPreferencesPort
  ) {}

  private static readonly TIMEOUT_MS = 55000

  async handleWebhook(messageBody: string, fromNumber: string): Promise<void> {
    const { useCase, isNew } = this.getOrCreateSession(fromNumber)

    if (isNew) {
      await this.send(fromNumber, this.greeting(fromNumber))
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
    let timer: ReturnType<typeof setTimeout>
    const timeout = new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(new Error('timeout')), ms)
    })
    return Promise.race([
      promise.finally(() => clearTimeout(timer!)),
      timeout,
    ])
  }

  private getOrCreateSession(phoneNumber: string): { useCase: IFinancialChatPort; isNew: boolean } {
    const isNew = !this.sessions.has(phoneNumber)
    if (isNew) {
      const useCase = new FinancialChatUseCase(
        this.llm,
        this.dataService,
        new InMemoryConversationRepository(),
        phoneNumber,
        this.preferences
      )
      this.sessions.set(phoneNumber, useCase)
    }
    return { useCase: this.sessions.get(phoneNumber)!, isNew }
  }

  private greeting(phoneNumber: string): string {
    const hour = new Date().getHours()
    const saudacao = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

    const prefs = this.preferences.get(phoneNumber)
    const name  = prefs?.ownerName ?? 'Wagner'
    const briefingTime = prefs?.briefingTime ?? '08:00'

    return `${saudacao} Sr. ${name}, tudo bem? Sou o DIMAS, seu assistente pessoal da Sakura.\n\nTodo dia envio automaticamente um panorama financeiro para o senhor. O horario atual e ${briefingTime}.\n\nSe quiser mudar o horario e so me dizer, por exemplo: "muda para 7h". Como posso ajudar agora?`
  }

  private async send(to: string, body: string): Promise<void> {
    const chunks = this.splitMessage(body)
    for (const chunk of chunks) {
      await this.twilioClient.messages.create({
        from: `whatsapp:${this.fromNumber}`,
        to,
        body: chunk
      })
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
