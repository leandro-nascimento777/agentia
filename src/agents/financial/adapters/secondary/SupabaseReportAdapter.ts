import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type {
  IDashboardPort,
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
  RotaRow,
} from '../../domain/ports/output/IFinancialDataPort'

// Tabelas reais no Supabase (schema da Sakura)
// vendas_aereo:     cod_agencia, agencia_nome, airline, sigla_cia, rota, data_emissao,
//                   data_embarque, data_vencimento, pago, tarifa, tarifa_adicional
// vendas_terrestres: sica (= cod_agencia), nome_fantasia, tarifa_total, data_venda, promotor
// agencias:          id_erp, nome_fantasia, ativo, status, unidade, gestor, ultima_compra,
//                    limite_aprovado, limite_credito
// cadastros:         etapa_atual, status, created_at, deleted_at, ativado_em

// Aeroportos brasileiros (whitelist para detectar rotas nacionais)
const BR_AIRPORTS = new Set([
  'GRU','GIG','BSB','SSA','REC','FOR','CWB','POA','CGH','VCP','SDU','CNF','MCZ',
  'NAT','PMW','CGB','FLN','BEL','MAO','CGR','MGF','LDB','JPA','THE','AJU','BPS',
  'SJP','MCP','PNZ','IMP','SLZ','STM','MNX','TFF','OPS','PPB','JOI','NVT','XAP',
  'CCI','IGU','FOZ','LVB','UDI','VIX','PMG','CGB','GYN','JDO','RAO','CPV','CXJ',
  'PLU','CAC','CFB','ITR','IOS','BVB','PVH','CGR','CMG','PPB','PAV','RBR','CZS',
])

function isNationalRoute(rota: string): boolean {
  const codes = rota.split('/').filter(c => c.length === 3).map(c => c.toUpperCase())
  return codes.length > 0 && codes.every(c => BR_AIRPORTS.has(c))
}

function startOfMonth(): string {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

export class SupabaseReportAdapter implements IDashboardPort {
  private readonly db: SupabaseClient

  constructor(url: string, serviceKey: string) {
    this.db = createClient(url, serviceKey)
  }

  async testConnection(): Promise<void> {
    const tables = ['vendas_aereo', 'agencias', 'cadastros', 'vendas_terrestres'] as const
    const results: string[] = []

    for (const table of tables) {
      const { count, error } = await this.db
        .from(table)
        .select('*', { count: 'exact', head: true })

      if (error) {
        results.push(`  ✗ ${table}: ${error.message}`)
      } else {
        results.push(`  ✓ ${table}: ${count ?? '?'} linhas`)
      }
    }

    console.log('[Supabase] Teste de conexão:')
    results.forEach(r => console.log(r))
  }

  async getSaudeBase(): Promise<SaudeBaseRow[]> {
    const { data, error } = await this.db
      .from('agencias')
      .select('unidade, ultima_compra')
      .eq('ativo', true)
      .limit(2000)

    if (error) throw new Error(`getSaudeBase: ${error.message}`)

    const cutoff = new Date(daysAgo(30))
    const byBase = new Map<string, { total: number; vendendo: number }>()

    for (const row of data ?? []) {
      const base = row.unidade ?? 'SEM_BASE'
      const entry = byBase.get(base) ?? { total: 0, vendendo: 0 }
      entry.total++
      if (row.ultima_compra && new Date(row.ultima_compra) >= cutoff) entry.vendendo++
      byBase.set(base, entry)
    }

    return [...byBase.entries()]
      .map(([sigla, { total, vendendo }]) => ({
        base: sigla,
        sigla,
        total,
        vendendo,
        saude: total > 0 ? Math.round(vendendo / total * 1000) / 10 : 0,
      }))
      .sort((a, b) => a.saude - b.saude)
  }

  async getInadimplencia(): Promise<{ total: InadimplenciaRow; top20: InadimplenciaRow[] }> {
    const { data, error } = await this.db
      .from('vendas_aereo')
      .select('cod_agencia, agencia_nome, tarifa, tarifa_adicional')
      .eq('pago', false)
      .lt('data_vencimento', today())
      .not('data_vencimento', 'is', null)
      .limit(2000)

    if (error) throw new Error(`getInadimplencia: ${error.message}`)

    const byAgencia = new Map<number, { agencia_nome: string; faturas: number; valor: number }>()
    let totalFaturas = 0
    let totalValor   = 0

    for (const row of data ?? []) {
      const valor = (Number(row.tarifa) || 0) + (Number(row.tarifa_adicional) || 0)
      totalFaturas++
      totalValor += valor
      const entry = byAgencia.get(row.cod_agencia) ?? { agencia_nome: row.agencia_nome, faturas: 0, valor: 0 }
      entry.faturas++
      entry.valor += valor
      byAgencia.set(row.cod_agencia, entry)
    }

    const top20 = [...byAgencia.values()]
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 20)

    return {
      total:  { agencia_nome: 'TOTAL', faturas: totalFaturas, valor: Math.round(totalValor * 100) / 100 },
      top20,
    }
  }

  async getRankingGestores(): Promise<GestorRankingRow[]> {
    const [vendasRes, agenciasRes] = await Promise.all([
      this.db
        .from('vendas_aereo')
        .select('cod_agencia, tarifa, tarifa_adicional, pago, data_vencimento')
        .gte('data_emissao', startOfMonth())
        .lte('data_emissao', today())
        .limit(5000),
      this.db
        .from('agencias')
        .select('id_erp, gestor')
        .eq('ativo', true)
        .not('gestor', 'is', null)
        .limit(2000),
    ])

    if (vendasRes.error) throw new Error(`getRankingGestores vendas: ${vendasRes.error.message}`)
    if (agenciasRes.error) throw new Error(`getRankingGestores agencias: ${agenciasRes.error.message}`)

    const agenciaGestor = new Map<number, string>()
    for (const a of agenciasRes.data ?? []) {
      agenciaGestor.set(Number(a.id_erp), a.gestor)
    }

    const byGestor = new Map<string, GestorRankingRow>()
    const agenciasPorGestor = new Map<string, Set<number>>()

    for (const v of vendasRes.data ?? []) {
      const gestor = agenciaGestor.get(Number(v.cod_agencia))
      if (!gestor) continue
      const valor = (Number(v.tarifa) || 0) + (Number(v.tarifa_adicional) || 0)
      const inadimplente = v.pago === false && v.data_vencimento && v.data_vencimento < today() ? valor : 0

      const entry = byGestor.get(gestor) ?? { gestor, agencias: 0, bilhetes: 0, volume: 0, inadimplencia: 0 }
      entry.bilhetes++
      entry.volume += valor
      entry.inadimplencia += inadimplente
      byGestor.set(gestor, entry)

      const set = agenciasPorGestor.get(gestor) ?? new Set()
      set.add(Number(v.cod_agencia))
      agenciasPorGestor.set(gestor, set)
    }

    return [...byGestor.values()]
      .map(g => ({ ...g, agencias: agenciasPorGestor.get(g.gestor)?.size ?? 0, volume: Math.round(g.volume * 100) / 100, inadimplencia: Math.round(g.inadimplencia * 100) / 100 }))
      .sort((a, b) => b.volume - a.volume)
  }

  async getPipeline(): Promise<PipelineRow[]> {
    const { data, error } = await this.db
      .from('cadastros')
      .select('etapa_atual, status')
      .is('deleted_at', null)
      .limit(2000)

    if (error) throw new Error(`getPipeline: ${error.message}`)

    const byEtapa = new Map<string, number>()
    for (const row of data ?? []) {
      const etapa = row.etapa_atual ?? row.status ?? 'desconhecido'
      byEtapa.set(etapa, (byEtapa.get(etapa) ?? 0) + 1)
    }

    return [...byEtapa.entries()]
      .map(([etapa, qty]) => ({ etapa, qty }))
      .sort((a, b) => b.qty - a.qty)
  }

  async getNovasAgencias(): Promise<NovasAgenciasRow[]> {
    const { data, error } = await this.db
      .from('cadastros')
      .select('created_at')
      .gte('created_at', daysAgo(7))
      .is('deleted_at', null)
      .limit(1000)

    if (error) throw new Error(`getNovasAgencias: ${error.message}`)

    const byDia = new Map<string, number>()
    for (const row of data ?? []) {
      const dia = (row.created_at as string).slice(0, 10)
      byDia.set(dia, (byDia.get(dia) ?? 0) + 1)
    }

    return [...byDia.entries()]
      .map(([dia, novos]) => ({ dia, novos }))
      .sort((a, b) => b.dia.localeCompare(a.dia))
  }

  async getCreditoPorBase(): Promise<CreditoBaseRow[]> {
    const { data, error } = await this.db
      .from('agencias')
      .select('unidade, limite_aprovado, limite_credito')
      .eq('ativo', true)
      .gt('limite_aprovado', 0)
      .limit(2000)

    if (error) throw new Error(`getCreditoPorBase: ${error.message}`)

    const byBase = new Map<string, CreditoBaseRow>()
    for (const row of data ?? []) {
      const sigla = row.unidade ?? 'SEM_BASE'
      const entry = byBase.get(sigla) ?? { base: sigla, sigla, agencias: 0, limite: 0, credito: 0 }
      entry.agencias++
      entry.limite  += Number(row.limite_aprovado) || 0
      entry.credito += Number(row.limite_credito)  || 0
      byBase.set(sigla, entry)
    }

    return [...byBase.values()]
      .map(r => ({ ...r, limite: Math.round(r.limite * 100) / 100, credito: Math.round(r.credito * 100) / 100 }))
      .sort((a, b) => b.limite - a.limite)
  }

  async getRiscoAgencias(): Promise<RiscoAgenciaRow[]> {
    const cutoff = daysAgo(90)
    const { data, error } = await this.db
      .from('agencias')
      .select('nome_fantasia, unidade, limite_aprovado, ultima_compra')
      .eq('ativo', true)
      .gt('limite_aprovado', 0)
      .or(`ultima_compra.is.null,ultima_compra.lt.${cutoff}`)
      .order('limite_aprovado', { ascending: false })
      .limit(50)

    if (error) throw new Error(`getRiscoAgencias: ${error.message}`)
    return (data ?? []).map(r => ({
      nome_fantasia:   r.nome_fantasia ?? '',
      unidade:         r.unidade ?? '',
      limite_aprovado: Number(r.limite_aprovado) || 0,
      ultima_compra:   r.ultima_compra ?? null,
    }))
  }

  async getRankingCias(params?: { limit?: number }): Promise<CiaRankingRow[]> {
    const top = params?.limit ?? 10
    const { data, error } = await this.db
      .from('vendas_aereo')
      .select('sigla_cia, airline, tarifa, tarifa_adicional')
      .gte('data_emissao', startOfMonth())
      .lte('data_emissao', today())
      .limit(5000)

    if (error) throw new Error(`getRankingCias: ${error.message}`)

    const byCia = new Map<string, CiaRankingRow>()
    for (const row of data ?? []) {
      const key = row.sigla_cia ?? 'DESCONHECIDA'
      const valor = (Number(row.tarifa) || 0) + (Number(row.tarifa_adicional) || 0)
      const entry = byCia.get(key) ?? { sigla_cia: key, airline: row.airline ?? key, bilhetes: 0, volume: 0 }
      entry.bilhetes++
      entry.volume += valor
      byCia.set(key, entry)
    }

    return [...byCia.values()]
      .map(r => ({ ...r, volume: Math.round(r.volume * 100) / 100 }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, top)
  }

  async getTopAgencias(params?: { limit?: number }): Promise<AgenciaRankingRow[]> {
    const top = params?.limit ?? 10

    const [aereoRes, terrestreRes] = await Promise.all([
      this.db
        .from('vendas_aereo')
        .select('cod_agencia, agencia_nome, tarifa, tarifa_adicional')
        .gte('data_emissao', startOfMonth())
        .lte('data_emissao', today())
        .limit(5000),
      this.db
        .from('vendas_terrestres')
        .select('sica, nome_fantasia, tarifa_total')
        .gte('data_venda', startOfMonth())
        .lte('data_venda', today())
        .limit(5000),
    ])

    if (aereoRes.error)    throw new Error(`getTopAgencias aereo: ${aereoRes.error.message}`)
    if (terrestreRes.error) throw new Error(`getTopAgencias terrestre: ${terrestreRes.error.message}`)

    const byAgencia = new Map<string, AgenciaRankingRow>()

    for (const row of aereoRes.data ?? []) {
      const key = String(row.cod_agencia)
      const valor = (Number(row.tarifa) || 0) + (Number(row.tarifa_adicional) || 0)
      const entry = byAgencia.get(key) ?? { agencia_nome: row.agencia_nome ?? key, bilhetes: 0, volume: 0 }
      entry.bilhetes++
      entry.volume += valor
      byAgencia.set(key, entry)
    }

    for (const row of terrestreRes.data ?? []) {
      const key = String(row.sica)
      const valor = Number(row.tarifa_total) || 0
      const entry = byAgencia.get(key) ?? { agencia_nome: row.nome_fantasia ?? key, bilhetes: 0, volume: 0 }
      entry.bilhetes++
      entry.volume += valor
      byAgencia.set(key, entry)
    }

    return [...byAgencia.values()]
      .map(r => ({ ...r, volume: Math.round(r.volume * 100) / 100 }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, top)
  }

  async getEmbarquesFuturos(params?: { days?: number }): Promise<EmbarqueRow[]> {
    const horizon = daysAgo(-(params?.days ?? 7))
    const { data, error } = await this.db
      .from('vendas_aereo')
      .select('data_embarque, agencia_nome, airline, localizador, sigla_cia, tarifa, tarifa_adicional')
      .gte('data_embarque', today())
      .lte('data_embarque', horizon)
      .order('data_embarque', { ascending: true })
      .limit(100)

    if (error) throw new Error(`getEmbarquesFuturos: ${error.message}`)
    return (data ?? []).map(r => ({
      data_embarque: r.data_embarque ?? '',
      agencia_nome:  r.agencia_nome ?? '',
      airline:       r.airline ?? '',
      localizador:   r.localizador ?? '',
      sigla_cia:     r.sigla_cia ?? '',
      valor:         Math.round(((Number(r.tarifa) || 0) + (Number(r.tarifa_adicional) || 0)) * 100) / 100,
    }))
  }

  async getNacionalVsInternacional(): Promise<RotaRow[]> {
    const { data, error } = await this.db
      .from('vendas_aereo')
      .select('rota, tarifa, tarifa_adicional')
      .gte('data_emissao', startOfMonth())
      .lte('data_emissao', today())
      .limit(5000)

    if (error) throw new Error(`getNacionalVsInternacional: ${error.message}`)

    let nBilhetes = 0, nVolume = 0, iBilhetes = 0, iVolume = 0

    for (const row of data ?? []) {
      const valor = (Number(row.tarifa) || 0) + (Number(row.tarifa_adicional) || 0)
      if (isNationalRoute(row.rota ?? '')) {
        nBilhetes++; nVolume += valor
      } else {
        iBilhetes++; iVolume += valor
      }
    }

    return [
      { rota: 'N', bilhetes: nBilhetes, volume: Math.round(nVolume * 100) / 100 },
      { rota: 'I', bilhetes: iBilhetes, volume: Math.round(iVolume * 100) / 100 },
    ]
  }
}
