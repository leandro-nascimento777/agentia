import twilio from 'twilio'
import type { IFinancialChatPort } from '../../domain/ports/input/IFinancialChatPort'
import type { IAgentLLMPort } from '../../domain/ports/output/IAgentLLMPort'
import type { IFinancialDataPort } from '../../domain/ports/output/IFinancialDataPort'
import { FinancialChatUseCase } from '../../domain/usecases/FinancialChatUseCase'
import { InMemoryConversationRepository } from '../secondary/InMemoryConversationRepository'

type TwilioClient = ReturnType<typeof twilio>

export class TwilioWhatsAppAdapter {
  private readonly sessions = new Map<string, IFinancialChatPort>()

  constructor(
    private readonly twilioClient: TwilioClient,
    private readonly fromNumber: string,
    private readonly llm: IAgentLLMPort,
    private readonly dataService: IFinancialDataPort
  ) {}

  private static readonly TIMEOUT_MS = 55000

  async handleWebhook(messageBody: string, fromNumber: string): Promise<void> {
    const { useCase, isNew } = this.getOrCreateSession(fromNumber)

    if (isNew) {
      await this.send(fromNumber, this.greeting())
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
        new InMemoryConversationRepository()
      )
      this.sessions.set(phoneNumber, useCase)
    }
    return { useCase: this.sessions.get(phoneNumber)!, isNew }
  }

  private greeting(): string {
    const hour = new Date().getHours()
    const saudacao = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
    return `${saudacao}! 👋 Olá, sou o DIMAS, a IA da Sakura Consolidadora.\n\nPosso te ajudar com consultas financeiras, relatórios de vendas, cadastro de empresas e muito mais.\n\nComo posso te ajudar?`
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

  // WhatsApp has a 4096 char limit per message
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
