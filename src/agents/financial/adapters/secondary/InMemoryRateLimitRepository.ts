import type { IRateLimitPort } from '../../domain/ports/output/IRateLimitPort'

export class InMemoryRateLimitRepository implements IRateLimitPort {
  private static readonly MAX_DAILY = 100
  private readonly counts = new Map<string, { count: number; date: string }>()

  check(key: string): boolean {
    const today = new Date().toISOString().slice(0, 10)
    const entry = this.counts.get(key)
    if (!entry || entry.date !== today) {
      this.counts.set(key, { count: 1, date: today })
      return true
    }
    if (entry.count >= InMemoryRateLimitRepository.MAX_DAILY) return false
    entry.count++
    return true
  }
}
