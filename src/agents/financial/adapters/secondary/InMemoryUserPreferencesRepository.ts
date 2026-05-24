import type { IUserPreferencesPort, UserPreferences } from '../../domain/ports/output/IUserPreferencesPort'

const DEFAULT_BRIEFING_TIME = '08:00'
const DEFAULT_TIMEZONE      = 'America/Sao_Paulo'

export class InMemoryUserPreferencesRepository implements IUserPreferencesPort {
  private readonly store = new Map<string, UserPreferences>()

  get(phoneNumber: string): UserPreferences | undefined {
    return this.store.get(phoneNumber)
  }

  set(phoneNumber: string, prefs: Partial<Omit<UserPreferences, 'phoneNumber'>>): void {
    const existing = this.store.get(phoneNumber) ?? {
      phoneNumber,
      briefingTime: DEFAULT_BRIEFING_TIME,
      timezone: DEFAULT_TIMEZONE,
    }
    this.store.set(phoneNumber, { ...existing, ...prefs })
  }

  getAll(): UserPreferences[] {
    return [...this.store.values()]
  }
}
