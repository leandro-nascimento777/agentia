import type {
  IFinancialDataPort,
  TableQueryFilter,
  AirReportFilter,
  NonAirReportFilter,
  CompanhiaAereaFilter,
  EmpresaFilter,
  ExecutivoFilter,
  BilheteFilter,
} from '../../domain/ports/output/IFinancialDataPort'
import { FinancialAdapterHttpClient } from './FinancialAdapterHttpClient'
import { SupabaseReportAdapter } from './SupabaseReportAdapter'

export class CombinedFinancialAdapter implements IFinancialDataPort {
  constructor(
    private readonly http: FinancialAdapterHttpClient,
    private readonly supabase: SupabaseReportAdapter
  ) {}

  // ─── SICA / SIGOT ──────────────────────────────────────────────────────────
  checkHealth()                                              { return this.http.checkHealth() }
  getSicaTables()                                            { return this.http.getSicaTables() }
  getSicaTableColumns(t: string)                             { return this.http.getSicaTableColumns(t) }
  querySicaTable(t: string, f?: TableQueryFilter)            { return this.http.querySicaTable(t, f) }
  getSigotTables()                                           { return this.http.getSigotTables() }
  getSigotTableColumns(t: string)                            { return this.http.getSigotTableColumns(t) }
  querySigotTable(t: string, f?: TableQueryFilter)           { return this.http.querySigotTable(t, f) }
  getAirReportFilial(f?: AirReportFilter)                    { return this.http.getAirReportFilial(f) }
  getAirReportRepresentante(f?: AirReportFilter)             { return this.http.getAirReportRepresentante(f) }
  getNonAirSicaFilial(f?: NonAirReportFilter)                { return this.http.getNonAirSicaFilial(f) }
  getNonAirSicaRepresentante(f?: NonAirReportFilter)         { return this.http.getNonAirSicaRepresentante(f) }
  getNonAirSigotFilial(f?: NonAirReportFilter)               { return this.http.getNonAirSigotFilial(f) }
  getNonAirSigotRepresentante(f?: NonAirReportFilter)        { return this.http.getNonAirSigotRepresentante(f) }
  getCompanhiaAerea(f?: CompanhiaAereaFilter)                { return this.http.getCompanhiaAerea(f) }
  getEmpresaCadastro(f?: EmpresaFilter)                      { return this.http.getEmpresaCadastro(f) }
  getExecutivoGestor(f?: ExecutivoFilter)                    { return this.http.getExecutivoGestor(f) }
  getBilheteEmailAgencia(f?: BilheteFilter)                  { return this.http.getBilheteEmailAgencia(f) }

  // ─── Dashboard (Supabase) ──────────────────────────────────────────────────
  getSaudeBase()                                   { return this.supabase.getSaudeBase() }
  getInadimplencia()                               { return this.supabase.getInadimplencia() }
  getRankingGestores()                             { return this.supabase.getRankingGestores() }
  getPipeline()                                    { return this.supabase.getPipeline() }
  getNovasAgencias()                               { return this.supabase.getNovasAgencias() }
  getCreditoPorBase()                              { return this.supabase.getCreditoPorBase() }
  getRiscoAgencias()                               { return this.supabase.getRiscoAgencias() }
  getRankingCias(p?: { limit?: number })           { return this.supabase.getRankingCias(p) }
  getTopAgencias(p?: { limit?: number })           { return this.supabase.getTopAgencias(p) }
  getEmbarquesFuturos(p?: { days?: number })       { return this.supabase.getEmbarquesFuturos(p) }
  getNacionalVsInternacional()                     { return this.supabase.getNacionalVsInternacional() }
}
