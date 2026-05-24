import Anthropic from '@anthropic-ai/sdk'
import * as readline from 'readline'
import { FINANCIAL_TOOLS } from './financial/adapters/secondary/tools/financialTools'
import { FINANCIAL_CLI_PROMPT } from './financial/domain/prompts'

// ─── Config ────────────────────────────────────────────────────────────────

const BASE_URL = 'https://financial-adapter.flysakura.com'
const SECRET   = process.env.FINANCIAL_SECRET ?? ''

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── HTTP helper ────────────────────────────────────────────────────────────

async function apiGet(path: string, params: Record<string, string | number | boolean | undefined> = {}) {
  const url = new URL(BASE_URL + path)
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') url.searchParams.set(k, String(v))
  }
  const res = await fetch(url.toString(), {
    headers: { 'X-Internal-Secret': SECRET }
  })
  const json = await res.json()
  return { status: res.status, data: json }
}

// ─── Tool executor ──────────────────────────────────────────────────────────

type ToolInput = Record<string, string | number | boolean | undefined>

async function executeTool(name: string, input: ToolInput): Promise<string> {
  try {
    let result: { status: number; data: unknown }

    switch (name) {
      case 'check_health':
        result = await apiGet('/health')
        break
      case 'get_sica_tables':
        result = await apiGet('/api/sica/schema')
        break
      case 'get_sica_table_columns':
        result = await apiGet(`/api/sica/schema/${input.table}`)
        break
      case 'query_sica_table':
        result = await apiGet(`/api/sica/tables/${input.table}`, {
          page: input.page, limit: input.limit,
          orderBy: input.orderBy as string, orderDirection: input.orderDirection as string
        })
        break
      case 'get_sigot_tables':
        result = await apiGet('/api/sigot/schema')
        break
      case 'get_sigot_table_columns':
        result = await apiGet(`/api/sigot/schema/${input.table}`)
        break
      case 'query_sigot_table':
        result = await apiGet(`/api/sigot/tables/${input.table}`, {
          page: input.page, limit: input.limit,
          orderBy: input.orderBy as string, orderDirection: input.orderDirection as string
        })
        break
      case 'report_air_sica_filial':
        result = await apiGet('/api/reports/base-air-sica-filial', input as Record<string, string | number>)
        break
      case 'report_air_sica_representante':
        result = await apiGet('/api/reports/base-air-sica-representante', input as Record<string, string | number>)
        break
      case 'report_non_air_sica_filial':
        result = await apiGet('/api/reports/base-non-air-sica-filial', input as Record<string, string | number>)
        break
      case 'report_non_air_sica_representante':
        result = await apiGet('/api/reports/base-non-air-sica-representante', input as Record<string, string | number>)
        break
      case 'report_non_air_sigot_filial':
        result = await apiGet('/api/reports/base-non-air-sigot-filial', input as Record<string, string | number>)
        break
      case 'report_non_air_sigot_representante':
        result = await apiGet('/api/reports/base-non-air-sigot-representante', input as Record<string, string | number>)
        break
      case 'report_companhia_aerea':
        result = await apiGet('/api/reports/base-companhia-aerea', input as Record<string, string | number>)
        break
      case 'report_empresa_cadastro':
        result = await apiGet('/api/reports/base-empresa-cadastro', input as Record<string, string | number>)
        break
      case 'report_executivo_gestor':
        result = await apiGet('/api/reports/base-executivo-gestor', input as Record<string, string | number>)
        break
      case 'report_bilhete_email_agencia':
        result = await apiGet('/api/reports/base-bilhete-email-agencia', input as Record<string, string | number>)
        break
      default:
        return JSON.stringify({ error: `Ferramenta desconhecida: ${name}` })
    }

    const preview = Array.isArray(result.data)
      ? { total: result.data.length, sample: result.data.slice(0, 5) }
      : result.data

    return JSON.stringify({ httpStatus: result.status, result: preview }, null, 2)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return JSON.stringify({ error: msg })
  }
}

// ─── Agent loop ─────────────────────────────────────────────────────────────

export async function runAgent(userMessage: string, history: Anthropic.MessageParam[] = []): Promise<string> {
  const messages: Anthropic.MessageParam[] = [
    ...history,
    { role: 'user', content: userMessage }
  ]

  while (true) {
    const response = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 16000,
      system: FINANCIAL_CLI_PROMPT(),
      tools: FINANCIAL_TOOLS,
      messages
    })

    messages.push({ role: 'assistant', content: response.content })

    if (response.stop_reason === 'end_turn') {
      return response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map(b => b.text)
        .join('')
    }

    if (response.stop_reason !== 'tool_use') break

    const toolBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
    )

    const toolResults = await Promise.all(
      toolBlocks.map(async block => {
        console.log(`  🔧 ${block.name}(${JSON.stringify(block.input)})`)
        const result = await executeTool(block.name, block.input as ToolInput)
        console.log(`     ↳ ${result.slice(0, 120)}...`)
        return { type: 'tool_result' as const, tool_use_id: block.id, content: result }
      })
    )

    messages.push({ role: 'user', content: toolResults })
  }

  return '(sem resposta)'
}

// ─── Interactive CLI ────────────────────────────────────────────────────────

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌  Defina ANTHROPIC_API_KEY antes de executar.')
    process.exit(1)
  }

  if (!SECRET) {
    console.warn('⚠️  FINANCIAL_SECRET não definido — chamadas autenticadas falharão.\n')
  }

  console.log('╔══════════════════════════════════════════════╗')
  console.log('║   Agente Financeiro — Sakura Consolidadora   ║')
  console.log('╚══════════════════════════════════════════════╝')
  console.log('Exemplos de perguntas:')
  console.log('  • Qual o status dos bancos?')
  console.log('  • Quais tabelas existem no SICA?')
  console.log('  • Liste as passagens aéreas da empresa 1234 em janeiro de 2025')
  console.log('  • Quais empresas estão com bloqueio de crédito?')
  console.log('  • Mostre os executivos cadastrados')
  console.log('\nDigite "sair" para encerrar.\n')

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const history: Anthropic.MessageParam[] = []

  const ask = () => {
    rl.question('Você: ', async (input) => {
      const text = input.trim()
      if (!text || text.toLowerCase() === 'sair') {
        rl.close()
        return
      }

      console.log('\n⏳ Pensando...\n')
      try {
        const reply = await runAgent(text, history)

        history.push(
          { role: 'user',      content: text  },
          { role: 'assistant', content: reply }
        )
        if (history.length > 20) history.splice(0, 2)

        console.log(`\nAgente: ${reply}\n`)
      } catch (err) {
        console.error('Erro:', err)
      }

      ask()
    })
  }

  ask()
}

main()
