import { FinancialAgentContainer } from './FinancialAgentContainer'
import { InMemoryUserPreferencesRepository } from '../adapters/secondary/InMemoryUserPreferencesRepository'

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Variável de ambiente obrigatória não definida: ${name}`)
  return value
}

function createContainer(): FinancialAgentContainer {
  const anthropicApiKey  = requireEnv('ANTHROPIC_API_KEY')
  const financialSecret  = requireEnv('FINANCIAL_SECRET')
  const financialBaseUrl = process.env.FINANCIAL_BASE_URL ?? 'https://financial-adapter.flysakura.com'

  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID
  const twilioAuthToken  = process.env.TWILIO_AUTH_TOKEN
  const twilioFrom       = process.env.TWILIO_WHATSAPP_FROM ?? '+14155238886'

  // Pré-configura usuários conhecidos a partir de env vars
  // OWNER_WHATSAPP=whatsapp:+5511999990000  OWNER_NAME=Wagner
  const preferences = new InMemoryUserPreferencesRepository()
  const ownerPhone = process.env.OWNER_WHATSAPP
  const ownerName  = process.env.OWNER_NAME ?? 'Wagner'
  if (ownerPhone) {
    preferences.set(ownerPhone, {
      ownerName,
      briefingTime: process.env.OWNER_BRIEFING_TIME ?? '08:00',
    })
  }

  const supabaseUrl     = process.env.SUPABASE_URL
  const supabaseKey     = process.env.SUPABASE_SERVICE_ROLE_KEY

  return new FinancialAgentContainer({
    anthropicApiKey,
    financialSecret,
    financialBaseUrl,
    supabase: supabaseUrl && supabaseKey
      ? { url: supabaseUrl, serviceKey: supabaseKey }
      : undefined,
    preferences,
    twilio: twilioAccountSid && twilioAuthToken
      ? { accountSid: twilioAccountSid, authToken: twilioAuthToken, fromNumber: twilioFrom }
      : undefined
  })
}

// Singleton: reutiliza entre hot-reloads do Next.js em dev
const globalForContainer = global as typeof global & { financialContainer?: FinancialAgentContainer }

export const container = globalForContainer.financialContainer ??= createContainer()
