import { FinancialAgentContainer } from './infrastructure/FinancialAgentContainer'
import { readFileSync } from 'fs'
import { resolve } from 'path'

function loadEnvFile(filePath: string): void {
  try {
    const content = readFileSync(resolve(process.cwd(), filePath), 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const idx = trimmed.indexOf('=')
      if (idx === -1) continue
      const key = trimmed.slice(0, idx).trim()
      const value = trimmed.slice(idx + 1).trim()
      if (key && !process.env[key]) process.env[key] = value
    }
  } catch { /* arquivo ausente é ok */ }
}

loadEnvFile('.env.local')

function loadConfig() {
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicApiKey) {
    console.error('❌  Defina ANTHROPIC_API_KEY antes de executar.')
    process.exit(1)
  }

  const financialSecret = process.env.FINANCIAL_SECRET ?? ''
  if (!financialSecret) {
    console.warn('⚠️  FINANCIAL_SECRET não definido — chamadas autenticadas falharão.\n')
  }

  return {
    anthropicApiKey,
    financialSecret,
    financialBaseUrl: process.env.FINANCIAL_BASE_URL ?? 'https://financial-adapter.flysakura.com'
  }
}

async function main(): Promise<void> {
  const container = new FinancialAgentContainer(loadConfig())
  await container.cli.run()
}

main().catch(err => {
  console.error('Fatal:', err instanceof Error ? err.message : err)
  process.exit(1)
})
