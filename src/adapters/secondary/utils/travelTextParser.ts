const DAYS_REGEX = /(\d+)\s*dias?/i

const DESTINATION_PATTERNS = [
  /(?:em|para|no|na|ao?)\s+([A-ZÀ-Úa-zà-ú]+(?:\s+[A-ZÀ-Úa-zà-ú]+){0,3})/i,
  /([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+){0,2})\s+(?:por\s+)?\d+\s*dias?/i,
]

export function extractDays(text: string): number {
  const match = text.match(DAYS_REGEX)
  if (!match) return 3
  return Math.min(Math.max(parseInt(match[1], 10), 1), 30)
}

export function extractDestination(text: string): string {
  for (const pattern of DESTINATION_PATTERNS) {
    const match = text.match(pattern)
    if (match?.[1]) return match[1].trim()
  }
  return 'Destino Especial'
}
