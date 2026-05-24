// pdf-lib's Helvetica (WinAnsiEncoding) doesn't support UTF-8 characters.
// This module normalizes text before rendering to avoid rendering artifacts.

const ACCENT_MAP: Array<[RegExp, string]> = [
  [/[áàâã]/gi, 'a'],
  [/[éèê]/gi,  'e'],
  [/[íì]/gi,   'i'],
  [/[óòôõ]/gi, 'o'],
  [/[úù]/gi,   'u'],
  [/[ç]/gi,    'c'],
]

export function toPdfSafeText(text: string): string {
  let result = text
  for (const [pattern, base] of ACCENT_MAP) {
    result = result.replace(pattern, (c) => (c === c.toUpperCase() ? base.toUpperCase() : base))
  }
  return result.replace(/[^\x20-\x7E]/g, '?')
}
