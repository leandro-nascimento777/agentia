export interface UserPreferences {
  phoneNumber: string
  ownerName: string      // ex: "Wagner"
  briefingTime: string   // "HH:MM" no timezone do usuário, ex: "08:00"
  timezone: string       // ex: "America/Sao_Paulo"
}

export interface IUserPreferencesPort {
  get(phoneNumber: string): UserPreferences | undefined
  set(phoneNumber: string, prefs: Partial<Omit<UserPreferences, 'phoneNumber'>>): void
  getAll(): UserPreferences[]
}
