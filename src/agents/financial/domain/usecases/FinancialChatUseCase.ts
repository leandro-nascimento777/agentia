import type { IFinancialChatPort } from '../ports/input/IFinancialChatPort'
import type { IFinancialDataPort } from '../ports/output/IFinancialDataPort'
import type { IAgentLLMPort, ToolExecutor } from '../ports/output/IAgentLLMPort'
import type { IConversationHistoryPort } from '../ports/output/IConversationHistoryPort'
import { createMessage } from '../entities/ConversationMessage'

export class FinancialChatUseCase implements IFinancialChatPort {
  private static readonly MAX_HISTORY_TURNS = 4
  private static readonly MAX_TOOL_RESULT_CHARS = 3000

  private static readonly SYSTEM_PROMPT = `Você é o DIMAS, assistente financeiro virtual da Sakura Consolidadora. Responde via WhatsApp de forma direta, objetiva e humana. Quando se apresentar, use "Sou o DIMAS, assistente financeiro da Sakura."

COMO RESPONDER:
- Responda exatamente o que foi perguntado. Nada a mais.
- Use no máximo 5 linhas por resposta, a não ser que o usuário peça detalhes.
- Apresente números em formato brasileiro: R$ 1.234,56
- Destaque o total primeiro. Ex: "Aéreo jan–mai/2026: R$ 45.230,00 (32 vendas)"
- Nunca liste registros individuais a não ser que o usuário peça explicitamente.
- Não use markdown (sem *, **, #, ---). O texto será lido no WhatsApp.
- Não explique como buscou os dados. Só entregue o resultado.
- NUNCA mencione SICA, SIGOT, filial, representante ou nomes técnicos de banco. O usuário só conhece "Aéreo" e "Não-aéreo".

MAPEAMENTO — o que chamar para cada pedido do usuário:
- Usuário pede "Aéreo" → chame report_air_sica_filial + report_air_sica_representante e some os valores
- Usuário pede "Não-aéreo" → chame report_non_air_sica_filial + report_non_air_sica_representante + report_non_air_sigot_filial + report_non_air_sigot_representante e some tudo
- Usuário pede "Total" ou "Aéreo + Não-aéreo" → chame todos os anteriores e some tudo junto
- Sempre dispare todas as chamadas necessárias ao mesmo tempo

REGRAS TÉCNICAS:
- NUNCA use report_air_sica_geral (com problema no servidor).
- empresaAtiva e bloqueioCredito aceitam apenas "SIM" ou "NAO" (string).
- Sempre use skipCount: true e limit: 200.
- Se qualquer chamada retornar erro HTTP 500 ou timeout, avise o usuário de forma honesta e humana antes de apresentar o resultado parcial. Use frases como:
  "Estamos com instabilidade na consulta de dados aéreos no momento. Vou trazer o que consegui, mas recomendo tentar novamente mais tarde para o resultado completo."
  ou
  "Não consegui acessar os dados de não-aéreo agora — o sistema está demorando para responder. Tente novamente em alguns minutos."
- Se TODAS as fontes falharem, diga: "Estou com dificuldade para acessar os dados agora. Nossa equipe técnica já foi notificada. Por favor, tente novamente em alguns minutos."
- Nunca finja que os dados estão completos quando houve erro.

Hoje é ${new Date().toLocaleDateString('pt-BR')}.`

  constructor(
    private readonly llm: IAgentLLMPort,
    private readonly dataService: IFinancialDataPort,
    private readonly history: IConversationHistoryPort
  ) {}

  async chat(userMessage: string): Promise<string> {
    const reply = await this.llm.chat(
      FinancialChatUseCase.SYSTEM_PROMPT,
      this.history.getHistory(),
      userMessage,
      this.buildToolExecutor()
    )

    this.history.append(createMessage('user', userMessage))
    this.history.append(createMessage('assistant', reply))
    this.history.truncate(FinancialChatUseCase.MAX_HISTORY_TURNS)

    return reply
  }

  private buildToolExecutor(): ToolExecutor {
    return async (name, input) => {
      try {
        const result = await this.dispatch(name, input)
        const summary = this.summarize(result)
        const json = JSON.stringify(summary)
        // Garante que o resultado nunca estoure o contexto do Claude
        return json.length > FinancialChatUseCase.MAX_TOOL_RESULT_CHARS
          ? json.slice(0, FinancialChatUseCase.MAX_TOOL_RESULT_CHARS) + '...[truncado]'
          : json
      } catch (err) {
        return JSON.stringify({ error: err instanceof Error ? err.message : String(err) })
      }
    }
  }

  private summarize(result: unknown): unknown {
    if (!Array.isArray(result)) return result

    const rows = result as Record<string, unknown>[]
    if (rows.length === 0) return { total_registros: 0 }

    // Soma apenas colunas numéricas — não envia registros individuais
    const numericKeys = Object.keys(rows[0]).filter(k =>
      rows.some(r => typeof r[k] === 'number' || (typeof r[k] === 'string' && !isNaN(Number(r[k])) && r[k] !== ''))
    )

    const totais: Record<string, number> = {}
    for (const key of numericKeys) {
      totais[key] = Math.round(rows.reduce((acc, r) => acc + (parseFloat(String(r[key])) || 0), 0) * 100) / 100
    }

    return { total_registros: rows.length, totais }
  }

  private async dispatch(name: string, raw: Record<string, unknown>): Promise<unknown> {
    const p = raw as Record<string, string | number | boolean | undefined>

    switch (name) {
      case 'check_health':                   return this.dataService.checkHealth()
      case 'get_sica_tables':                return this.dataService.getSicaTables()
      case 'get_sica_table_columns':         return this.dataService.getSicaTableColumns(p.table as string)
      case 'query_sica_table':               return this.dataService.querySicaTable(p.table as string, p as never)
      case 'get_sigot_tables':               return this.dataService.getSigotTables()
      case 'get_sigot_table_columns':        return this.dataService.getSigotTableColumns(p.table as string)
      case 'query_sigot_table':              return this.dataService.querySigotTable(p.table as string, p as never)
      case 'report_air_sica_filial':         return this.dataService.getAirReportFilial(p as never)
      case 'report_air_sica_representante':  return this.dataService.getAirReportRepresentante(p as never)
      case 'report_air_sica_geral':          return this.dataService.getAirReportGeral(p as never)
      case 'report_non_air_sica_filial':     return this.dataService.getNonAirSicaFilial(p as never)
      case 'report_non_air_sica_repres':     return this.dataService.getNonAirSicaRepresentante(p as never)
      case 'report_non_air_sigot_filial':    return this.dataService.getNonAirSigotFilial(p as never)
      case 'report_non_air_sigot_repres':    return this.dataService.getNonAirSigotRepresentante(p as never)
      case 'report_companhia_aerea':         return this.dataService.getCompanhiaAerea(p as never)
      case 'report_empresa_cadastro':        return this.dataService.getEmpresaCadastro(p as never)
      case 'report_executivo_gestor':        return this.dataService.getExecutivoGestor(p as never)
      case 'report_bilhete_email_agencia':   return this.dataService.getBilheteEmailAgencia(p as never)
      default: throw new Error(`Unknown tool: ${name}`)
    }
  }
}
