import { FinancialAgentContainer } from './FinancialAgentContainer'

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

  return new FinancialAgentContainer({
    anthropicApiKey,
    financialSecret,
    financialBaseUrl,
    twilio: twilioAccountSid && twilioAuthToken
      ? { accountSid: twilioAccountSid, authToken: twilioAuthToken, fromNumber: twilioFrom }
      : undefined
  })
}

// Singleton: reutiliza entre hot-reloads do Next.js em dev
const globalForContainer = global as typeof global & { financialContainer?: FinancialAgentContainer }

export const container = globalForContainer.financialContainer ??= createContainer()
