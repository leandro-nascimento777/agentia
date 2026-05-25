import type {
  IAirReportPort,
  INonAirReportPort,
  ICadastroPort,
  IDashboardPort,
  SaudeBaseRow,
  InadimplenciaRow,
  PipelineRow,
  CreditoBaseRow,
  NovasAgenciasRow,
} from '../ports/output/IFinancialDataPort'

type BriefingDataPort = IAirReportPort & INonAirReportPort & ICadastroPort & IDashboardPort

interface SalesTotal {
  total: number
  count: number
}

interface BriefingData {
  today:             { air: SalesTotal; nonAir: SalesTotal }
  yesterday:         { air: SalesTotal; nonAir: SalesTotal }
  monthToDate:       { air: SalesTotal; nonAir: SalesTotal }
  lastYearSameMonth: { air: SalesTotal; nonAir: SalesTotal }
  newAgenciesThisMonth: number
  saude:         { vendendo: number; total: number } | null
  inadimplencia: { faturas: number; valor: number } | null
  pipeline:      { emAnalise: number; novasOntem: number } | null
  credito:       { total: number } | null
}

function sumNumericFields(rows: Record<string, unknown>[]): Record<string, number> {
  if (rows.length === 0) return {}
  const totals: Record<string, number> = {}
  for (const key of Object.keys(rows[0])) {
    const sum = rows.reduce((acc, r) => acc + (parseFloat(String(r[key])) || 0), 0)
    if (sum !== 0) totals[key] = Math.round(sum * 100) / 100
  }
  return totals
}

function extractSales(raw: unknown): SalesTotal {
  if (!Array.isArray(raw) || raw.length === 0) return { total: 0, count: 0 }
  const rows = raw as Record<string, unknown>[]
  const totals = sumNumericFields(rows)
  const total = totals['valorTotal'] ?? totals['valor'] ?? totals['totalVenda'] ?? Object.values(totals)[0] ?? 0
  return { total, count: rows.length }
}

function singleDay(offsetDays: number): { startDate: string; endDate: string } {
  const d = new Date()
  d.setDate(d.getDate() - offsetDays)
  const s = d.toISOString().slice(0, 10)
  return { startDate: s, endDate: s }
}

function monthToDateRange(): { startDate: string; endDate: string } {
  const now   = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const fmt   = (d: Date) => d.toISOString().slice(0, 10)
  return { startDate: fmt(start), endDate: fmt(now) }
}

function lastYearRange(): { startDate: string; endDate: string } {
  const now   = new Date()
  const start = new Date(now.getFullYear() - 1, now.getMonth(), 1)
  const end   = new Date(now.getFullYear() - 1, now.getMonth() + 1, 0)
  const fmt   = (d: Date) => d.toISOString().slice(0, 10)
  return { startDate: fmt(start), endDate: fmt(end) }
}

function fmtValue(v: number): string {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1).replace('.', ',')}M`
  if (v >= 1_000)     return `R$ ${Math.round(v / 1_000)}K`
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtVar(current: number, previous: number): string {
  if (previous === 0) return ''
  const pct = (current - previous) / previous * 100
  if (Math.abs(pct) < 0.05) return ' (–)'
  return pct > 0 ? ` (+${pct.toFixed(1)}%)` : ` (${pct.toFixed(1)}%)`
}

function nowBrasilia(): { date: string; time: string; weekday: string; monthName: string } {
  const now = new Date()
  const opts = { timeZone: 'America/Sao_Paulo' }
  const date    = now.toLocaleDateString('pt-BR', opts)
  const time    = now.toLocaleTimeString('pt-BR', { ...opts, hour: '2-digit', minute: '2-digit' })
  const weekday = now.toLocaleDateString('pt-BR', { ...opts, weekday: 'long' })
  const monthName = now.toLocaleDateString('pt-BR', { ...opts, month: 'long' })
  return { date, time, weekday, monthName }
}

export class BuildMorningBriefingUseCase {
  constructor(
    private readonly data: BriefingDataPort,
    private readonly ownerName = 'Wagner'
  ) {}

  async build(): Promise<string> {
    const bd = await this.fetchData()
    return this.format(bd)
  }

  private async fetchData(): Promise<BriefingData> {
    const today     = singleDay(0)
    const yesterday = singleDay(1)
    const mtd       = monthToDateRange()
    const lastYear  = lastYearRange()

    const [
      airToday, nonAirSicaFilToday, nonAirSicaRepToday, nonAirSigotFilToday, nonAirSigotRepToday,
      airYest,  nonAirSicaFilYest,  nonAirSicaRepYest,  nonAirSigotFilYest,  nonAirSigotRepYest,
      airMtd,   nonAirSicaFilMtd,   nonAirSicaRepMtd,   nonAirSigotFilMtd,   nonAirSigotRepMtd,
      airLy,    nonAirSicaFilLy,    nonAirSicaRepLy,
      empresas,
      saudeResult,
      inadimplenciaResult,
      pipelineResult,
      novasResult,
      creditoResult,
    ] = await Promise.allSettled([
      this.data.getAirReportFilial(today),
      this.data.getNonAirSicaFilial(today),
      this.data.getNonAirSicaRepresentante(today),
      this.data.getNonAirSigotFilial(today),
      this.data.getNonAirSigotRepresentante(today),

      this.data.getAirReportFilial(yesterday),
      this.data.getNonAirSicaFilial(yesterday),
      this.data.getNonAirSicaRepresentante(yesterday),
      this.data.getNonAirSigotFilial(yesterday),
      this.data.getNonAirSigotRepresentante(yesterday),

      this.data.getAirReportFilial(mtd),
      this.data.getNonAirSicaFilial(mtd),
      this.data.getNonAirSicaRepresentante(mtd),
      this.data.getNonAirSigotFilial(mtd),
      this.data.getNonAirSigotRepresentante(mtd),

      this.data.getAirReportFilial(lastYear),
      this.data.getNonAirSicaFilial(lastYear),
      this.data.getNonAirSicaRepresentante(lastYear),

      this.data.getEmpresaCadastro({ ...mtd, skipCount: true }),

      this.data.getSaudeBase(),
      this.data.getInadimplencia(),
      this.data.getPipeline(),
      this.data.getNovasAgencias(),
      this.data.getCreditoPorBase(),
    ])

    const val = (r: PromiseSettledResult<unknown>): unknown[] =>
      r.status === 'fulfilled' && Array.isArray(r.value) ? r.value : []

    const mergeAir    = (a: unknown[]) => extractSales(a)
    const mergeNonAir = (a: unknown[], b: unknown[], c: unknown[], d: unknown[]) =>
      extractSales([...a, ...b, ...c, ...d])

    // ─── Saúde ─────────────────────────────────────────────────────────────
    let saude: BriefingData['saude'] = null
    if (saudeResult.status === 'fulfilled') {
      const rows = saudeResult.value as SaudeBaseRow[]
      if (rows.length > 0) {
        const totalAgencias  = rows.reduce((s, r) => s + r.total, 0)
        const totalVendendo  = rows.reduce((s, r) => s + r.vendendo, 0)
        saude = { vendendo: totalVendendo, total: totalAgencias }
      }
    }

    // ─── Inadimplência ─────────────────────────────────────────────────────
    let inadimplencia: BriefingData['inadimplencia'] = null
    if (inadimplenciaResult.status === 'fulfilled') {
      const data = inadimplenciaResult.value as { total: InadimplenciaRow; top20: InadimplenciaRow[] }
      if (data?.total) inadimplencia = { faturas: data.total.faturas, valor: data.total.valor }
    }

    // ─── Pipeline ──────────────────────────────────────────────────────────
    let pipeline: BriefingData['pipeline'] = null
    if (pipelineResult.status === 'fulfilled') {
      const rows = pipelineResult.value as PipelineRow[]
      const emAnalise = rows.find(r => r.etapa === 'em_analise')?.qty ?? 0

      let novasOntem = 0
      if (novasResult.status === 'fulfilled') {
        const novasRows = novasResult.value as NovasAgenciasRow[]
        const ontem = singleDay(1).startDate
        novasOntem = novasRows.find(r => r.dia === ontem)?.novos ?? 0
      }

      pipeline = { emAnalise, novasOntem }
    }

    // ─── Crédito ───────────────────────────────────────────────────────────
    let credito: BriefingData['credito'] = null
    if (creditoResult.status === 'fulfilled') {
      const rows = creditoResult.value as CreditoBaseRow[]
      const total = rows.reduce((s, r) => s + r.limite, 0)
      credito = { total }
    }

    return {
      today: {
        air:    mergeAir(val(airToday)),
        nonAir: mergeNonAir(val(nonAirSicaFilToday), val(nonAirSicaRepToday), val(nonAirSigotFilToday), val(nonAirSigotRepToday)),
      },
      yesterday: {
        air:    mergeAir(val(airYest)),
        nonAir: mergeNonAir(val(nonAirSicaFilYest), val(nonAirSicaRepYest), val(nonAirSigotFilYest), val(nonAirSigotRepYest)),
      },
      monthToDate: {
        air:    mergeAir(val(airMtd)),
        nonAir: mergeNonAir(val(nonAirSicaFilMtd), val(nonAirSicaRepMtd), val(nonAirSigotFilMtd), val(nonAirSigotRepMtd)),
      },
      lastYearSameMonth: {
        air:    mergeAir(val(airLy)),
        nonAir: mergeNonAir(val(nonAirSicaFilLy), val(nonAirSicaRepLy), [], []),
      },
      newAgenciesThisMonth: val(empresas).length,
      saude,
      inadimplencia,
      pipeline,
      credito,
    }
  }

  private format(d: BriefingData): string {
    const { date, time, weekday, monthName } = nowBrasilia()

    const totalOntem = d.yesterday.air.total + d.yesterday.nonAir.total
    const totalMtd   = d.monthToDate.air.total + d.monthToDate.nonAir.total
    const totalLy    = d.lastYearSameMonth.air.total + d.lastYearSameMonth.nonAir.total

    const mediaBilhete = d.yesterday.air.count > 0
      ? d.yesterday.air.total / d.yesterday.air.count
      : 0

    const vsLy = totalLy > 0
      ? ((totalMtd - totalLy) / totalLy * 100)
      : null

    const capitalizeFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

    const lines: string[] = [
      `*Panorama Sakura*`,
      `🕐 ${capitalizeFirst(weekday)}, ${date} às ${time}`,
      `Bom dia, Sr. ${this.ownerName}!`,
      '',
    ]

    if (d.saude) {
      const pct = d.saude.total > 0
        ? Math.round(d.saude.vendendo / d.saude.total * 100)
        : 0
      lines.push(`📉 *Saúde Geral:* ${pct}% (${d.saude.vendendo}/${d.saude.total} agências vendendo nos últimos 30 dias)`)
      lines.push('')
    }

    lines.push(
      `✈️ *Hoje (até agora):*`,
      `- Aéreo: ${fmtValue(d.today.air.total)}${fmtVar(d.today.air.total, d.yesterday.air.total)}`,
      `- Terrestre: ${fmtValue(d.today.nonAir.total)}${fmtVar(d.today.nonAir.total, d.yesterday.nonAir.total)}`,
      '',
      `📅 *Ontem:*`,
      `- Aéreo: ${fmtValue(d.yesterday.air.total)} — ${d.yesterday.air.count} bilhetes${mediaBilhete > 0 ? ` (média: ${fmtValue(mediaBilhete)})` : ''}`,
      `- Terrestre: ${fmtValue(d.yesterday.nonAir.total)}`,
      `- _Total: ${fmtValue(totalOntem)}_`,
      '',
      `🗓️ *${capitalizeFirst(monthName)} (acumulado):*`,
      `- Aéreo: ${fmtValue(d.monthToDate.air.total)}`,
      `- Terrestre: ${fmtValue(d.monthToDate.nonAir.total)}`,
      `- _Total: ${fmtValue(totalMtd)}${vsLy !== null ? fmtVar(totalMtd, totalLy) + ' vs ano passado' : ''}_`,
    )

    if (d.newAgenciesThisMonth > 0) {
      lines.push(`- Novas agências no mês: ${d.newAgenciesThisMonth}`)
    }

    const extras: string[] = []

    if (d.pipeline) {
      extras.push(`🆕 *Pipeline:* ${d.pipeline.emAnalise} em análise — ${d.pipeline.novasOntem} novas ontem`)
    }

    if (d.credito) {
      extras.push(`💰 *Crédito exposto:* ${fmtValue(d.credito.total)}`)
    }

    if (d.inadimplencia) {
      extras.push(`🔴 *Inadimplência:* ${d.inadimplencia.faturas} faturas — ${fmtValue(d.inadimplencia.valor)}`)
    }

    if (extras.length > 0) {
      lines.push('', ...extras)
    }

    lines.push('', '_Precisa de algum detalhe? É só pedir._')

    return lines.join('\n')
  }
}
