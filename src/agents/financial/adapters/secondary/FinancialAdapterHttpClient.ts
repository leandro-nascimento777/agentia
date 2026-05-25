import type {
  IFinancialDataPort,
  TableQueryFilter,
  AirReportFilter,
  NonAirReportFilter,
  CompanhiaAereaFilter,
  EmpresaFilter,
  ExecutivoFilter,
  BilheteFilter,
  SaudeBaseRow,
  InadimplenciaRow,
  GestorRankingRow,
  PipelineRow,
  NovasAgenciasRow,
  CreditoBaseRow,
  RiscoAgenciaRow,
  CiaRankingRow,
  AgenciaRankingRow,
  EmbarqueRow,
  RotaRow
} from '../../domain/ports/output/IFinancialDataPort'

type Params = Record<string, string | number | boolean | undefined>

const CALL_TIMEOUT_MS = 10000

export class FinancialAdapterHttpClient implements IFinancialDataPort {
  constructor(
    private readonly baseUrl: string,
    private readonly secret: string
  ) {}

  private async get(path: string, params: Params = {}): Promise<unknown> {
    const url = new URL(this.baseUrl + path)
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== '') url.searchParams.set(k, String(v))
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), CALL_TIMEOUT_MS)

    try {
      const res = await fetch(url.toString(), {
        headers: { 'X-Internal-Secret': this.secret },
        signal: controller.signal
      })
      const json = await res.json()
      if (!res.ok) throw new Error(`HTTP ${res.status} on ${path}`)
      return json
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error(`Timeout na consulta ${path} (>${CALL_TIMEOUT_MS / 1000}s)`)
      }
      throw err
    } finally {
      clearTimeout(timer)
    }
  }

  checkHealth()                                    { return this.get('/health') }

  getSicaTables()                                  { return this.get('/api/sica/schema') }
  getSicaTableColumns(table: string)               { return this.get(`/api/sica/schema/${table}`) }
  querySicaTable(t: string, f?: TableQueryFilter)  { return this.get(`/api/sica/tables/${t}`, f as Params) }

  getSigotTables()                                 { return this.get('/api/sigot/schema') }
  getSigotTableColumns(table: string)              { return this.get(`/api/sigot/schema/${table}`) }
  querySigotTable(t: string, f?: TableQueryFilter) { return this.get(`/api/sigot/tables/${t}`, f as Params) }

  getAirReportFilial(f?: AirReportFilter)          { return this.get('/api/reports/base-air-sica-filial', f as Params) }
  getAirReportRepresentante(f?: AirReportFilter)   { return this.get('/api/reports/base-air-sica-representante', f as Params) }
  getAirReportGeral(f?: AirReportFilter)           { return this.get('/api/reports/base-air-sica-geral', f as Params) }

  getNonAirSicaFilial(f?: NonAirReportFilter)      { return this.get('/api/reports/base-non-air-sica-filial', f as Params) }
  getNonAirSicaRepresentante(f?: NonAirReportFilter) { return this.get('/api/reports/base-non-air-sica-representante', f as Params) }
  getNonAirSigotFilial(f?: NonAirReportFilter)     { return this.get('/api/reports/base-non-air-sigot-filial', f as Params) }
  getNonAirSigotRepresentante(f?: NonAirReportFilter) { return this.get('/api/reports/base-non-air-sigot-representante', f as Params) }

  getCompanhiaAerea(f?: CompanhiaAereaFilter)      { return this.get('/api/reports/base-companhia-aerea', f as Params) }
  getEmpresaCadastro(f?: EmpresaFilter)            { return this.get('/api/reports/base-empresa-cadastro', f as Params) }
  getExecutivoGestor(f?: ExecutivoFilter)          { return this.get('/api/reports/base-executivo-gestor', f as Params) }
  getBilheteEmailAgencia(f?: BilheteFilter)        { return this.get('/api/reports/base-bilhete-email-agencia', f as Params) }

  // ─── Novos relatórios v1.1-C ─────────────────────────────────────────────

  getSaudeBase()                                   { return this.get('/api/reports/saude-bases') as Promise<SaudeBaseRow[]> }
  getInadimplencia()                               { return this.get('/api/reports/inadimplencia') as Promise<{ total: InadimplenciaRow; top20: InadimplenciaRow[] }> }
  getRankingGestores()                             { return this.get('/api/reports/ranking-gestores') as Promise<GestorRankingRow[]> }
  getPipeline()                                    { return this.get('/api/reports/pipeline') as Promise<PipelineRow[]> }
  getNovasAgencias()                               { return this.get('/api/reports/novas-agencias') as Promise<NovasAgenciasRow[]> }
  getCreditoPorBase()                              { return this.get('/api/reports/credito-por-base') as Promise<CreditoBaseRow[]> }
  getRiscoAgencias()                               { return this.get('/api/reports/risco-agencias') as Promise<RiscoAgenciaRow[]> }
  getRankingCias(p?: { limit?: number })           { return this.get('/api/reports/ranking-cias', p as Params) as Promise<CiaRankingRow[]> }
  getTopAgencias(p?: { limit?: number })           { return this.get('/api/reports/top-agencias', p as Params) as Promise<AgenciaRankingRow[]> }
  getEmbarquesFuturos(p?: { days?: number })       { return this.get('/api/reports/embarques-futuros', p as Params) as Promise<EmbarqueRow[]> }
  getNacionalVsInternacional()                     { return this.get('/api/reports/nacional-vs-internacional') as Promise<RotaRow[]> }
}
