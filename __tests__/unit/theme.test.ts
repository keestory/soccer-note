import { describe, expect, it } from 'vitest'
import { accentTokens, DEFAULT_ACCENT, luminance, resolveAccent } from '@/lib/theme'

describe('restored neon theme', () => {
  it('migrates the retired forest default and rejects invalid saved values', () => {
    for (const saved of [null, '', '#176b52', '#176B52', '#fff', 'invalid']) {
      expect(resolveAccent(saved)).toBe(DEFAULT_ACCENT)
    }
    expect(resolveAccent('#22D3EE')).toBe('#22d3ee')
    expect(resolveAccent('#e8b341')).toBe('#e8b341')
  })

  it('keeps the original volt saturated instead of mixing it with white', () => {
    const tokens = accentTokens(DEFAULT_ACCENT)
    expect(tokens['--accent']).toBe('#ccff00')
    expect(tokens['--brand']).toBe('#ccff00')
    expect(tokens['--on-brand']).toBe('#0a0a0a')
  })

  it('keeps accent labels and filled buttons readable for all presets and dark custom colors', () => {
    const contrast = (a: string, b: string) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05)
    for (const accent of ['#ccff00', '#e8b341', '#22d3ee', '#f0398b', '#ff6b35', '#34e2b0', '#000000', '#000080', '#ffffff']) {
      const tokens = accentTokens(accent)
      expect(contrast(tokens['--brand'], '#111010')).toBeGreaterThanOrEqual(4.5)
      expect(contrast(tokens['--brand'], tokens['--on-brand'])).toBeGreaterThanOrEqual(4.5)
    }
  })
})
