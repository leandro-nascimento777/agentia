import Anthropic from '@anthropic-ai/sdk'
import twilio from 'twilio'
import { FinancialChatUseCase } from '../domain/usecases/FinancialChatUseCase'
import { FinancialAdapterHttpClient } from '../adapters/secondary/FinancialAdapterHttpClient'
import { SupabaseReportAdapter } from '../adapters/secondary/SupabaseReportAdapter'
import { CombinedFinancialAdapter } from '../adapters/secondary/CombinedFinancialAdapter'
import { ClaudeAgentAdapter } from '../adapters/secondary/ClaudeAgentAdapter'
import { InMemoryConversationRepository } from '../adapters/secondary/InMemoryConversationRepository'
import { InMemoryUserPreferencesRepository } from '../adapters/secondary/InMemoryUserPreferencesRepository'
import { InMemoryRateLimitRepository } from '../adapters/secondary/InMemoryRateLimitRepository'
import { FinancialAgentCliAdapter } from '../adapters/primary/FinancialAgentCliAdapter'
import { TwilioWhatsAppAdapter } from '../adapters/primary/TwilioWhatsAppAdapter'
import { BriefingScheduler } from './BriefingScheduler'
import type { IAgentLLMPort } from '../domain/ports/output/IAgentLLMPort'
import type { IFinancialDataPort } from '../domain/ports/output/IFinancialDataPort'

export interface TwilioConfig {
  accountSid: string
  authToken: string
  fromNumber: string
}

export interface SupabaseConfig {
  url: string
  serviceKey: string
}

export interface FinancialAgentConfig {
  anthropicApiKey: string
  model?: string
  financialSecret: string
  financialBaseUrl: string
  supabase?: SupabaseConfig
  preferences?: InMemoryUserPreferencesRepository
  twilio?: TwilioConfig
}

export class FinancialAgentContainer {
  readonly cli: FinancialAgentCliAdapter
  readonly whatsapp?: TwilioWhatsAppAdapter
  readonly scheduler?: BriefingScheduler

  private readonly llm: IAgentLLMPort
  private readonly dataService: IFinancialDataPort

  constructor(config: FinancialAgentConfig) {
    this.llm = new ClaudeAgentAdapter(new Anthropic({ apiKey: config.anthropicApiKey }), config.model)

    const http = new FinancialAdapterHttpClient(config.financialBaseUrl, config.financialSecret)

    if (config.supabase) {
      const supabase = new SupabaseReportAdapter(config.supabase.url, config.supabase.serviceKey)
      supabase.testConnection().catch(err => console.error('[Supabase] Falha no teste de conexão:', err))
      this.dataService = new CombinedFinancialAdapter(http, supabase)
    } else {
      console.warn('[Supabase] SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY não configurados — atalhos avançados indisponíveis.')
      this.dataService = http
    }

    const preferences = config.preferences ?? new InMemoryUserPreferencesRepository()

    this.cli = new FinancialAgentCliAdapter(
      new FinancialChatUseCase(this.llm, this.dataService, new InMemoryConversationRepository())
    )

    if (config.twilio) {
      const twilioClient = twilio(config.twilio.accountSid, config.twilio.authToken)
      const llm = this.llm
      const dataService = this.dataService
      const rateLimiter = new InMemoryRateLimitRepository()

      this.whatsapp = new TwilioWhatsAppAdapter(
        twilioClient,
        config.twilio.fromNumber,
        (phone) => new FinancialChatUseCase(llm, dataService, new InMemoryConversationRepository(), phone, preferences),
        preferences,
        rateLimiter,
      )

      this.scheduler = new BriefingScheduler(
        preferences,
        this.dataService,
        (to, body) => this.whatsapp!.sendDirect(to, body)
      )
    }
  }
}
