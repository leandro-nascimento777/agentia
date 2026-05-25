import cron, { ScheduledTask } from 'node-cron'
import type { IUserPreferencesPort } from '../domain/ports/output/IUserPreferencesPort'
import type { IFinancialDataPort } from '../domain/ports/output/IFinancialDataPort'
import { BuildMorningBriefingUseCase } from '../domain/usecases/BuildMorningBriefingUseCase'

type SendFn = (to: string, body: string) => Promise<void>

export class BriefingScheduler {
  private task: ScheduledTask | null = null

  constructor(
    private readonly preferences: IUserPreferencesPort,
    private readonly dataService: IFinancialDataPort,
    private readonly send: SendFn
  ) {}

  start(): void {
    // Roda a cada minuto e verifica se algum usuário tem briefing agendado para agora
    this.task = cron.schedule('* * * * *', () => this.tick(), {
      timezone: 'America/Sao_Paulo',
    })
    console.log('[BriefingScheduler] iniciado')
  }

  stop(): void {
    this.task?.stop()
    console.log('[BriefingScheduler] parado')
  }

  private async tick(): Promise<void> {
    const hhmm = new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Sao_Paulo',
    }).format(new Date())

    const due = this.preferences.getAll().filter(p => p.briefingTime === hhmm)
    if (due.length === 0) return

    for (const user of due) {
      const briefing = new BuildMorningBriefingUseCase(this.dataService, user.ownerName)
      try {
        const text = await briefing.build()
        await this.send(user.phoneNumber, text)
        console.log(`[BriefingScheduler] briefing enviado para ${user.phoneNumber}`)
      } catch (err) {
        console.error(`[BriefingScheduler] erro ao enviar para ${user.phoneNumber}:`, err)
      }
    }
  }
}
