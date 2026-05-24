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

export interface IFinancialDataPort {
  checkHealth(): Promise<unknown>

  getSicaTables(): Promise<unknown>
  getSicaTableColumns(table: string): Promise<unknown>
  querySicaTable(table: string, filter?: TableQueryFilter): Promise<unknown>

  getSigotTables(): Promise<unknown>
  getSigotTableColumns(table: string): Promise<unknown>
  querySigotTable(table: string, filter?: TableQueryFilter): Promise<unknown>

  getAirReportFilial(filter?: AirReportFilter): Promise<unknown>
  getAirReportRepresentante(filter?: AirReportFilter): Promise<unknown>
  getAirReportGeral(filter?: AirReportFilter): Promise<unknown>

  getNonAirSicaFilial(filter?: NonAirReportFilter): Promise<unknown>
  getNonAirSicaRepresentante(filter?: NonAirReportFilter): Promise<unknown>
  getNonAirSigotFilial(filter?: NonAirReportFilter): Promise<unknown>
  getNonAirSigotRepresentante(filter?: NonAirReportFilter): Promise<unknown>

  getCompanhiaAerea(filter?: CompanhiaAereaFilter): Promise<unknown>
  getEmpresaCadastro(filter?: EmpresaFilter): Promise<unknown>
  getExecutivoGestor(filter?: ExecutivoFilter): Promise<unknown>
  getBilheteEmailAgencia(filter?: BilheteFilter): Promise<unknown>
}
