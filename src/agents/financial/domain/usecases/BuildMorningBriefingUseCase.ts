import type { IAirReportPort, INonAirReportPort, ICadastroPort } from '../ports/output/IFinancialDataPort'

type BriefingDataPort = IAirReportPort & INonAirReportPort & ICadastroPort

interface SalesTotal {
  total: number
  count: number
}

interface BriefingData {
  yesterday: { air: SalesTotal; nonAir: SalesTotal }
  monthToDate: { air: SalesTotal; nonAir: SalesTotal }
  lastYearSameMonth: { air: SalesTotal; nonAir: SalesTotal }
  newAgenciesThisMonth: number
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

function dateRange(daysAgo: number, offsetDays = 0): { startDate: string; endDate: string } {
  const end   = new Date(); end.setDate(end.getDate() - offsetDays)
  const start = new Date(end); start.setDate(start.getDate() - daysAgo)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return { startDate: fmt(start), endDate: fmt(end) }
}

function lastYearRange(): { startDate: string; endDate: string } {
  const now   = new Date()
  const start = new Date(now.getFullYear() - 1, now.getMonth(), 1)
  const end   = new Date(now.getFullYear() - 1, now.getMonth() + 1, 0)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return { startDate: fmt(start), endDate: fmt(end) }
}

export class BuildMorningBriefingUseCase {
  constructor(private readonly data: BriefingDataPort) {}

  async build(): Promise<string> {
    const bd = await this.fetchData()
    return this.format(bd)
  }

  private async fetchData(): Promise<BriefingData> {
    const yesterday     = dateRange(1, 1)
    const monthToDate   = dateRange(new Date().getDate() - 1)
    const lastYear      = lastYearRange()

    const [
      airYest, nonAirSicaFilYest, nonAirSicaRepYest, nonAirSigotFilYest, nonAirSigotRepYest,
      airMtd,  nonAirSicaFilMtd,  nonAirSicaRepMtd,  nonAirSigotFilMtd,  nonAirSigotRepMtd,
      airLy,   nonAirSicaFilLy,   nonAirSicaRepLy,
      empresas,
    ] = await Promise.allSettled([
      this.data.getAirReportFilial(yesterday),
      this.data.getNonAirSicaFilial(yesterday),
      this.data.getNonAirSicaRepresentante(yesterday),
      this.data.getNonAirSigotFilial(yesterday),
      this.data.getNonAirSigotRepresentante(yesterday),

      this.data.getAirReportFilial(monthToDate),
      this.data.getNonAirSicaFilial(monthToDate),
      this.data.getNonAirSicaRepresentante(monthToDate),
      this.data.getNonAirSigotFilial(monthToDate),
      this.data.getNonAirSigotRepresentante(monthToDate),

      this.data.getAirReportFilial(lastYear),
      this.data.getNonAirSicaFilial(lastYear),
      this.data.getNonAirSicaRepresentante(lastYear),

      this.data.getEmpresaCadastro({ ...dateRange(30), limit: 200, skipCount: true }),
    ])

    const val = <T>(r: PromiseSettledResult<T>): T | unknown[] =>
      r.status === 'fulfilled' ? r.value : []

    const mergeAir     = (a: unknown, b: unknown) => extractSales([
      ...((a as unknown[]) ?? []), ...((b as unknown[]) ?? [])
    ])
    const mergeNonAir  = (a: unknown, b: unknown, c: unknown, d: unknown) => extractSales([
      ...((a as unknown[]) ?? []), ...((b as unknown[]) ?? []),
      ...((c as unknown[]) ?? []), ...((d as unknown[]) ?? [])
    ])

    return {
      yesterday: {
        air:    mergeAir(val(airYest), []),
        nonAir: mergeNonAir(val(nonAirSicaFilYest), val(nonAirSicaRepYest), val(nonAirSigotFilYest), val(nonAirSigotRepYest)),
      },
      monthToDate: {
        air:    mergeAir(val(airMtd), []),
        nonAir: mergeNonAir(val(nonAirSicaFilMtd), val(nonAirSicaRepMtd), val(nonAirSigotFilMtd), val(nonAirSigotRepMtd)),
      },
      lastYearSameMonth: {
        air:    mergeAir(val(airLy), []),
        nonAir: mergeNonAir(val(nonAirSicaFilLy), val(nonAirSicaRepLy), [], []),
      },
      newAgenciesThisMonth: Array.isArray(val(empresas)) ? (val(empresas) as unknown[]).length : 0,
    }
  }

  private format(d: BriefingData): string {
    const brl = (v: number) =>
      v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

    const totalOntem   = d.yesterday.air.total + d.yesterday.nonAir.total
    const totalMtd     = d.monthToDate.air.total + d.monthToDate.nonAir.total
    const totalLy      = d.lastYearSameMonth.air.total + d.lastYearSameMonth.nonAir.total

    const vsLy = totalLy > 0
      ? ((totalMtd - totalLy) / totalLy * 100).toFixed(1)
      : null

    const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

    const lines = [
      `Bom dia! Aqui esta o panorama financeiro de hoje, ${today}.`,
      '',
      'Ontem:',
      `Aereo: ${brl(d.yesterday.air.total)}`,
      `Terrestre: ${brl(d.yesterday.nonAir.total)}`,
      `Total do dia: ${brl(totalOntem)}`,
      '',
      `Acumulado do mes:`,
      `Aereo: ${brl(d.monthToDate.air.total)}`,
      `Terrestre: ${brl(d.monthToDate.nonAir.total)}`,
      `Total: ${brl(totalMtd)}`,
    ]

    if (vsLy !== null) {
      const sinal = parseFloat(vsLy) >= 0 ? '+' : ''
      lines.push(`Comparado ao mesmo periodo do ano passado: ${sinal}${vsLy}%`)
    }

    if (d.newAgenciesThisMonth > 0) {
      lines.push('')
      lines.push(`Novas agencias esse mes: ${d.newAgenciesThisMonth}`)
    }

    lines.push('')
    lines.push('Precisa de algum detalhe especifico? E so pedir.')

    return lines.join('\n')
  }
}
