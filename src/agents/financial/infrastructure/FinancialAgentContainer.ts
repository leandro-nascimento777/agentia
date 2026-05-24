import Anthropic from '@anthropic-ai/sdk'
import twilio from 'twilio'
import { FinancialChatUseCase } from '../domain/usecases/FinancialChatUseCase'
import { FinancialAdapterHttpClient } from '../adapters/secondary/FinancialAdapterHttpClient'
import { ClaudeAgentAdapter } from '../adapters/secondary/ClaudeAgentAdapter'
import { InMemoryConversationRepository } from '../adapters/secondary/InMemoryConversationRepository'
import { FinancialAgentCliAdapter } from '../adapters/primary/FinancialAgentCliAdapter'
import { TwilioWhatsAppAdapter } from '../adapters/primary/TwilioWhatsAppAdapter'
import type { IAgentLLMPort } from '../domain/ports/output/IAgentLLMPort'
import type { IFinancialDataPort } from '../domain/ports/output/IFinancialDataPort'

export interface TwilioConfig {
  accountSid: string
  authToken: string
  fromNumber: string
}

export interface FinancialAgentConfig {
  anthropicApiKey: string
  financialSecret: string
  financialBaseUrl: string
  twilio?: TwilioConfig
}

export class FinancialAgentContainer {
  readonly cli: FinancialAgentCliAdapter
  readonly whatsapp?: TwilioWhatsAppAdapter

  private readonly llm: IAgentLLMPort
  private readonly dataService: IFinancialDataPort

  constructor(config: FinancialAgentConfig) {
    this.llm         = new ClaudeAgentAdapter(new Anthropic({ apiKey: config.anthropicApiKey }))
    this.dataService = new FinancialAdapterHttpClient(config.financialBaseUrl, config.financialSecret)

    this.cli = new FinancialAgentCliAdapter(
      new FinancialChatUseCase(this.llm, this.dataService, new InMemoryConversationRepository())
    )

    if (config.twilio) {
      const twilioClient = twilio(config.twilio.accountSid, config.twilio.authToken)
      this.whatsapp = new TwilioWhatsAppAdapter(
        twilioClient,
        config.twilio.fromNumber,
        this.llm,
        this.dataService
      )
    }
  }
}
