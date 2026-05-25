export interface ReportFilter {
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
  skipCount?: boolean
}

export interface TableQueryFilter extends ReportFilter {
  orderBy?: string
  orderDirection?: 'asc' | 'desc'
}

export interface AirReportFilter extends ReportFilter {
  codigoEmpresa?: string
  codigoExecutivo?: string
  tipoRota?: string
}

export interface NonAirReportFilter extends AirReportFilter {
  tipoProduto?: string
}

export interface CompanhiaAereaFilter extends ReportFilter {
  numeroCia?: string
  nomeCompanhia?: string
}

export interface EmpresaFilter extends ReportFilter {
  codigoEmpresa?: string
  codigoExecutivo?: string
  empresaAtiva?: 'SIM' | 'NAO'
  bloqueioCredito?: 'SIM' | 'NAO'
}

export interface ExecutivoFilter extends ReportFilter {
  codigoExecutivo?: string
}

export interface BilheteFilter extends ReportFilter {
  numvend?: string
  localizador?: string
  destino?: string
  codigoEmpresa?: string
  nchave?: string
  nome?: string
  cnpj?: string
  groupBy?: string
}

// ─── Sub-interfaces focadas (ISP) ──────────────────────────────────────────

export interface IHealthPort {
  checkHealth(): Promise<unknown>
}

export interface ISchemaPort {
  getSicaTables(): Promise<unknown>
  getSicaTableColumns(table: string): Promise<unknown>
  querySicaTable(table: string, filter?: TableQueryFilter): Promise<unknown>
  getSigotTables(): Promise<unknown>
  getSigotTableColumns(table: string): Promise<unknown>
  querySigotTable(table: string, filter?: TableQueryFilter): Promise<unknown>
}

export interface IAirReportPort {
  getAirReportFilial(filter?: AirReportFilter): Promise<unknown>
  getAirReportRepresentante(filter?: AirReportFilter): Promise<unknown>
}

export interface INonAirReportPort {
  getNonAirSicaFilial(filter?: NonAirReportFilter): Promise<unknown>
  getNonAirSicaRepresentante(filter?: NonAirReportFilter): Promise<unknown>
  getNonAirSigotFilial(filter?: NonAirReportFilter): Promise<unknown>
  getNonAirSigotRepresentante(filter?: NonAirReportFilter): Promise<unknown>
}

export interface ICadastroPort {
  getCompanhiaAerea(filter?: CompanhiaAereaFilter): Promise<unknown>
  getEmpresaCadastro(filter?: EmpresaFilter): Promise<unknown>
  getExecutivoGestor(filter?: ExecutivoFilter): Promise<unknown>
  getBilheteEmailAgencia(filter?: BilheteFilter): Promise<unknown>
}

// ─── Tipos para os novos relatórios (v1.1-C) ──────────────────────────────

export interface SaudeBaseRow {
  base: string
  sigla: string
  total: number
  vendendo: number
  saude: number
}

export interface InadimplenciaRow {
  agencia_nome: string
  faturas: number
  valor: number
}

export interface GestorRankingRow {
  gestor: string
  agencias: number
  bilhetes: number
  volume: number
  inadimplencia: number
}

export interface PipelineRow {
  etapa: string
  qty: number
}

export interface NovasAgenciasRow {
  dia: string
  novos: number
}

export interface CreditoBaseRow {
  base: string
  sigla: string
  agencias: number
  limite: number
  credito: number
}

export interface RiscoAgenciaRow {
  nome_fantasia: string
  unidade: string
  limite_aprovado: number
  ultima_compra: string | null
}

export interface CiaRankingRow {
  sigla_cia: string
  airline: string
  bilhetes: number
  volume: number
}

export interface AgenciaRankingRow {
  agencia_nome: string
  bilhetes: number
  volume: number
}

export interface EmbarqueRow {
  data_embarque: string
  agencia_nome: string
  airline: string
  localizador: string
  sigla_cia: string
  valor: number
}

export interface RotaRow {
  rota: string
  bilhetes: number
  volume: number
}

export interface IDashboardPort {
  getSaudeBase(): Promise<SaudeBaseRow[]>
  getInadimplencia(): Promise<{ total: InadimplenciaRow; top20: InadimplenciaRow[] }>
  getRankingGestores(): Promise<GestorRankingRow[]>
  getPipeline(): Promise<PipelineRow[]>
  getNovasAgencias(): Promise<NovasAgenciasRow[]>
  getCreditoPorBase(): Promise<CreditoBaseRow[]>
  getRiscoAgencias(): Promise<RiscoAgenciaRow[]>
  getRankingCias(params?: { limit?: number }): Promise<CiaRankingRow[]>
  getTopAgencias(params?: { limit?: number }): Promise<AgenciaRankingRow[]>
  getEmbarquesFuturos(params?: { days?: number }): Promise<EmbarqueRow[]>
  getNacionalVsInternacional(): Promise<RotaRow[]>
}

// ─── Interface composta — implementada pelo adapter HTTP ───────────────────

export interface IFinancialDataPort
  extends IHealthPort,
    ISchemaPort,
    IAirReportPort,
    INonAirReportPort,
    ICadastroPort,
    IDashboardPort {}
