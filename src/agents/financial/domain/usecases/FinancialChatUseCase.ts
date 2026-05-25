import type { IFinancialChatPort } from '../ports/input/IFinancialChatPort'
import type { IFinancialDataPort, TableQueryFilter, AirReportFilter, NonAirReportFilter, CompanhiaAereaFilter, EmpresaFilter, ExecutivoFilter, BilheteFilter } from '../ports/output/IFinancialDataPort'
import type { IAgentLLMPort, ToolExecutor } from '../ports/output/IAgentLLMPort'
import type { IConversationHistoryPort } from '../ports/output/IConversationHistoryPort'
import type { IUserPreferencesPort } from '../ports/output/IUserPreferencesPort'
import { createMessage } from '../entities/ConversationMessage'
import { FINANCIAL_WHATSAPP_PROMPT } from '../prompts'

const SET_BRIEFING_MARKER = /\[SET_BRIEFING_TIME:(\d{2}:\d{2})\]/

export class FinancialChatUseCase implements IFinancialChatPort {
  private static readonly MAX_HISTORY_TURNS = 8
  private static readonly MAX_TOOL_RESULT_CHARS = 3000

  constructor(
    private readonly llm: IAgentLLMPort,
    private readonly dataService: IFinancialDataPort,
    private readonly history: IConversationHistoryPort,
    private readonly phoneNumber?: string,
    private readonly preferences?: IUserPreferencesPort
  ) {}

  async chat(userMessage: string): Promise<string> {
    const prefs       = this.phoneNumber ? this.preferences?.get(this.phoneNumber) : undefined
    const ownerName   = prefs?.ownerName
    const briefingTime = prefs?.briefingTime

    const reply = await this.llm.chat(
      FINANCIAL_WHATSAPP_PROMPT(ownerName, briefingTime),
      this.history.getHistory(),
      userMessage,
      this.buildToolExecutor()
    )

    const cleaned = this.processMarkers(reply)

    this.history.append(createMessage('user', userMessage))
    this.history.append(createMessage('assistant', cleaned))
    this.history.truncate(FinancialChatUseCase.MAX_HISTORY_TURNS)

    return cleaned
  }

  private processMarkers(reply: string): string {
    const match = reply.match(SET_BRIEFING_MARKER)
    if (match && this.phoneNumber && this.preferences) {
      this.preferences.set(this.phoneNumber, { briefingTime: match[1] })
    }
    return reply.replace(SET_BRIEFING_MARKER, '').trim()
  }

  private buildToolExecutor(): ToolExecutor {
    return async (name, input) => {
      try {
        const result = await this.dispatch(name, input)
        const summary = this.summarize(result)
        const json = JSON.stringify(summary)
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
      case 'check_health':                      return this.dataService.checkHealth()
      case 'get_sica_tables':                   return this.dataService.getSicaTables()
      case 'get_sica_table_columns':            return this.dataService.getSicaTableColumns(p.table as string)
      case 'query_sica_table':                  return this.dataService.querySicaTable(p.table as string, p as TableQueryFilter)
      case 'get_sigot_tables':                  return this.dataService.getSigotTables()
      case 'get_sigot_table_columns':           return this.dataService.getSigotTableColumns(p.table as string)
      case 'query_sigot_table':                 return this.dataService.querySigotTable(p.table as string, p as TableQueryFilter)
      case 'report_air_sica_filial':            return this.dataService.getAirReportFilial(p as AirReportFilter)
      case 'report_air_sica_representante':     return this.dataService.getAirReportRepresentante(p as AirReportFilter)
      case 'report_non_air_sica_filial':        return this.dataService.getNonAirSicaFilial(p as NonAirReportFilter)
      case 'report_non_air_sica_representante': return this.dataService.getNonAirSicaRepresentante(p as NonAirReportFilter)
      case 'report_non_air_sigot_filial':       return this.dataService.getNonAirSigotFilial(p as NonAirReportFilter)
      case 'report_non_air_sigot_representante':return this.dataService.getNonAirSigotRepresentante(p as NonAirReportFilter)
      case 'report_companhia_aerea':            return this.dataService.getCompanhiaAerea(p as CompanhiaAereaFilter)
      case 'report_empresa_cadastro':           return this.dataService.getEmpresaCadastro(p as EmpresaFilter)
      case 'report_executivo_gestor':           return this.dataService.getExecutivoGestor(p as ExecutivoFilter)
      case 'report_bilhete_email_agencia':      return this.dataService.getBilheteEmailAgencia(p as BilheteFilter)

      // ─── Dashboard reports (v1.1-C) ──────────────────────────────────────
      case 'report_saude_bases':                return this.dataService.getSaudeBase()
      case 'report_inadimplencia':              return this.dataService.getInadimplencia()
      case 'report_ranking_gestores':           return this.dataService.getRankingGestores()
      case 'report_pipeline':                   return this.dataService.getPipeline()
      case 'report_novas_agencias':             return this.dataService.getNovasAgencias()
      case 'report_credito_por_base':           return this.dataService.getCreditoPorBase()
      case 'report_risco_agencias':             return this.dataService.getRiscoAgencias()
      case 'report_ranking_cias':               return this.dataService.getRankingCias(p as { limit?: number })
      case 'report_top_agencias':               return this.dataService.getTopAgencias(p as { limit?: number })
      case 'report_embarques_futuros':          return this.dataService.getEmbarquesFuturos(p as { days?: number })
      case 'report_nacional_vs_internacional':  return this.dataService.getNacionalVsInternacional()

      default: throw new Error(`Unknown tool: ${name}`)
    }
  }
}
