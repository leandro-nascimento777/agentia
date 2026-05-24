import { FinancialAgentContainer } from './FinancialAgentContainer'

function createContainer(): FinancialAgentContainer {
  const anthropicApiKey  = process.env.ANTHROPIC_API_KEY  ?? ''
  const financialSecret  = process.env.FINANCIAL_SECRET   ?? ''
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
