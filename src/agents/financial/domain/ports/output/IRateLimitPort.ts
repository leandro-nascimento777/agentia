export interface IRateLimitPort {
  check(key: string): boolean
}
