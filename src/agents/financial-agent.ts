import Anthropic from '@anthropic-ai/sdk'
import * as readline from 'readline'

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

// ─── Tool definitions ───────────────────────────────────────────────────────

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'check_health',
    description: 'Verifica o status dos bancos SICA e SIGOT.',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'get_sica_tables',
    description: 'Lista todas as tabelas disponíveis no banco SICA.',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'get_sica_table_columns',
    description: 'Retorna as colunas de uma tabela específica do banco SICA.',
    input_schema: {
      type: 'object',
      properties: {
        table: { type: 'string', description: 'Nome da tabela' }
      },
      required: ['table']
    }
  },
  {
    name: 'query_sica_table',
    description: 'Retorna dados paginados de uma tabela do banco SICA.',
    input_schema: {
      type: 'object',
      properties: {
        table:          { type: 'string',  description: 'Nome da tabela' },
        page:           { type: 'integer', description: 'Página (default 1)' },
        limit:          { type: 'integer', description: 'Registros por página (default 50)' },
        orderBy:        { type: 'string',  description: 'Coluna para ordenação' },
        orderDirection: { type: 'string',  enum: ['asc', 'desc'] }
      },
      required: ['table']
    }
  },
  {
    name: 'get_sigot_tables',
    description: 'Lista todas as tabelas disponíveis no banco SIGOT.',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'get_sigot_table_columns',
    description: 'Retorna as colunas de uma tabela específica do banco SIGOT.',
    input_schema: {
      type: 'object',
      properties: {
        table: { type: 'string', description: 'Nome da tabela' }
      },
      required: ['table']
    }
  },
  {
    name: 'query_sigot_table',
    description: 'Retorna dados paginados de uma tabela do banco SIGOT (dados a partir de 2026).',
    input_schema: {
      type: 'object',
      properties: {
        table:          { type: 'string',  description: 'Nome da tabela' },
        page:           { type: 'integer' },
        limit:          { type: 'integer' },
        orderBy:        { type: 'string' },
        orderDirection: { type: 'string', enum: ['asc', 'desc'] }
      },
      required: ['table']
    }
  },
  {
    name: 'report_air_sica_filial',
    description: 'Relatório BASE AIR SICA — Filial. Passagens aéreas emitidas pela filial (somente TICKET, excl. MPD).',
    input_schema: {
      type: 'object',
      properties: {
        startDate:        { type: 'string',  description: 'Data início (YYYY-MM-DD)' },
        endDate:          { type: 'string',  description: 'Data fim (YYYY-MM-DD)' },
        codigoEmpresa:    { type: 'string',  description: 'Código da empresa cliente' },
        codigoExecutivo:  { type: 'string',  description: 'Código do executivo/gestor' },
        tipoRota:         { type: 'string',  description: 'Tipo de rota (ex: DOM, INT)' },
        page:             { type: 'integer' },
        limit:            { type: 'integer' },
        skipCount:        { type: 'boolean' }
      },
      required: []
    }
  },
  {
    name: 'report_air_sica_representante',
    description: 'Relatório BASE AIR SICA — Representante. Inclui TICKET + MPD.',
    input_schema: {
      type: 'object',
      properties: {
        startDate:       { type: 'string' },
        endDate:         { type: 'string' },
        codigoEmpresa:   { type: 'string' },
        codigoExecutivo: { type: 'string' },
        tipoRota:        { type: 'string' },
        page:            { type: 'integer' },
        limit:           { type: 'integer' },
        skipCount:       { type: 'boolean' }
      },
      required: []
    }
  },
  {
    name: 'report_air_sica_geral',
    description: 'Relatório BASE AIR SICA — Geral (Filial + Representante combinados).',
    input_schema: {
      type: 'object',
      properties: {
        startDate:       { type: 'string' },
        endDate:         { type: 'string' },
        codigoEmpresa:   { type: 'string' },
        codigoExecutivo: { type: 'string' },
        tipoRota:        { type: 'string' },
        page:            { type: 'integer' },
        limit:           { type: 'integer' },
        skipCount:       { type: 'boolean' }
      },
      required: []
    }
  },
  {
    name: 'report_non_air_sica_filial',
    description: 'Relatório BASE NON-AIR SICA — Filial. Serviços não aéreos (hotel, carro, etc.) pela filial.',
    input_schema: {
      type: 'object',
      properties: {
        startDate:       { type: 'string' },
        endDate:         { type: 'string' },
        codigoEmpresa:   { type: 'string' },
        codigoExecutivo: { type: 'string' },
        tipoProduto:     { type: 'string',  description: 'Tipo de produto (hotel, carro, etc.)' },
        tipoRota:        { type: 'string' },
        page:            { type: 'integer' },
        limit:           { type: 'integer' },
        skipCount:       { type: 'boolean' }
      },
      required: []
    }
  },
  {
    name: 'report_non_air_sica_representante',
    description: 'Relatório BASE NON-AIR SICA — Representante.',
    input_schema: {
      type: 'object',
      properties: {
        startDate:       { type: 'string' },
        endDate:         { type: 'string' },
        codigoEmpresa:   { type: 'string' },
        codigoExecutivo: { type: 'string' },
        tipoProduto:     { type: 'string' },
        tipoRota:        { type: 'string' },
        page:            { type: 'integer' },
        limit:           { type: 'integer' },
        skipCount:       { type: 'boolean' }
      },
      required: []
    }
  },
  {
    name: 'report_non_air_sigot_filial',
    description: 'Relatório BASE NON-AIR SIGOT — Filial. Dados a partir de 2026.',
    input_schema: {
      type: 'object',
      properties: {
        startDate:     { type: 'string' },
        endDate:       { type: 'string' },
        codigoEmpresa: { type: 'string' },
        tipoProduto:   { type: 'string' },
        tipoRota:      { type: 'string' },
        page:          { type: 'integer' },
        limit:         { type: 'integer' },
        skipCount:     { type: 'boolean' }
      },
      required: []
    }
  },
  {
    name: 'report_non_air_sigot_representante',
    description: 'Relatório BASE NON-AIR SIGOT — Representante. Dados a partir de 2026.',
    input_schema: {
      type: 'object',
      properties: {
        startDate:     { type: 'string' },
        endDate:       { type: 'string' },
        codigoEmpresa: { type: 'string' },
        tipoProduto:   { type: 'string' },
        tipoRota:      { type: 'string' },
        page:          { type: 'integer' },
        limit:         { type: 'integer' },
        skipCount:     { type: 'boolean' }
      },
      required: []
    }
  },
  {
    name: 'report_companhia_aerea',
    description: 'Cadastro de companhias aéreas. Busca por número ou nome da cia.',
    input_schema: {
      type: 'object',
      properties: {
        numeroCia:     { type: 'string', description: 'Código numérico da cia aérea' },
        nomeCompanhia: { type: 'string', description: 'Nome (parcial) da cia aérea' },
        page:          { type: 'integer' },
        limit:         { type: 'integer' },
        skipCount:     { type: 'boolean' }
      },
      required: []
    }
  },
  {
    name: 'report_empresa_cadastro',
    description: 'Cadastro de empresas clientes. Filtra por código, executivo, status ativo e bloqueio de crédito.',
    input_schema: {
      type: 'object',
      properties: {
        codigoEmpresa:   { type: 'string' },
        codigoExecutivo: { type: 'string' },
        empresaAtiva:    { type: 'boolean', description: 'true = somente ativas' },
        bloqueioCredito: { type: 'boolean', description: 'true = somente bloqueadas' },
        page:            { type: 'integer' },
        limit:           { type: 'integer' },
        skipCount:       { type: 'boolean' }
      },
      required: []
    }
  },
  {
    name: 'report_executivo_gestor',
    description: 'Mapeamento de executivos e gestores. O mapeamento gestor↔executivo completo está no Power BI.',
    input_schema: {
      type: 'object',
      properties: {
        codigoExecutivo: { type: 'string' },
        page:            { type: 'integer' },
        limit:           { type: 'integer' },
        skipCount:       { type: 'boolean' }
      },
      required: []
    }
  },
  {
    name: 'report_bilhete_email_agencia',
    description: 'Bilhetes emitidos com e-mail da agência. Busca por data, vendedor, localizador, destino, empresa, nome ou CNPJ.',
    input_schema: {
      type: 'object',
      properties: {
        startDate:     { type: 'string' },
        endDate:       { type: 'string' },
        numvend:       { type: 'string', description: 'Número do vendedor' },
        localizador:   { type: 'string' },
        destino:       { type: 'string' },
        codigoEmpresa: { type: 'string' },
        nchave:        { type: 'string',  description: 'Número do bilhete' },
        nome:          { type: 'string',  description: 'Nome do passageiro' },
        cnpj:          { type: 'string' },
        groupBy:       { type: 'string',  description: 'Campo para agrupamento' },
        page:          { type: 'integer' },
        limit:         { type: 'integer' },
        skipCount:     { type: 'boolean' }
      },
      required: []
    }
  }
]

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
      case 'report_air_sica_geral':
        result = await apiGet('/api/reports/base-air-sica-geral', input as Record<string, string | number>)
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

const SYSTEM = `Você é um assistente financeiro especializado nos dados da Sakura Consolidadora.
Você tem acesso aos bancos SICA (dados históricos) e SIGOT (dados a partir de 2026) via ferramentas.

Ao receber uma pergunta:
1. Identifique qual ferramenta é mais adequada.
2. Se precisar descobrir tabelas ou colunas disponíveis, use get_sica_tables/get_sigot_tables primeiro.
3. Para relatórios de viagens aéreas use os relatórios AIR; para hotel/carro use NON-AIR.
4. Apresente os dados de forma clara, resumida e em português.
5. Se os dados retornarem muitos registros, apresente os primeiros e informe o total.

Hoje é ${new Date().toLocaleDateString('pt-BR')}.`

export async function runAgent(userMessage: string, history: Anthropic.MessageParam[] = []): Promise<string> {
  const messages: Anthropic.MessageParam[] = [
    ...history,
    { role: 'user', content: userMessage }
  ]

  while (true) {
    const response = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 16000,
      system: SYSTEM,
      tools: TOOLS,
      messages
    })

    messages.push({ role: 'assistant', content: response.content })

    if (response.stop_reason === 'end_turn') {
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map(b => b.text)
        .join('')
      return text
    }

    if (response.stop_reason !== 'tool_use') break

    // Execute all tool calls
    const toolResults: Anthropic.ToolResultBlockParam[] = []

    for (const block of response.content) {
      if (block.type !== 'tool_use') continue

      console.log(`  🔧 ${block.name}(${JSON.stringify(block.input)})`)
      const result = await executeTool(block.name, block.input as ToolInput)
      console.log(`     ↳ ${result.slice(0, 120)}...`)

      toolResults.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: result
      })
    }

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

        // Keep last 10 turns in history for context
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
