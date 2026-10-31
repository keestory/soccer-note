export const DEFAULT_ACCENT = '#ccff00'

const isHex = (value: string) => /^#[0-9a-f]{6}$/i.test(value)

function channels(hex: string) {
  return [1, 3, 5].map(start => parseInt(hex.slice(start, start + 2), 16))
}

function mix(a: string, b: string, amount: number) {
  const target = channels(b)
  return '#' + channels(a).map((value, i) => Math.round(value * (1 - amount) + target[i] * amount).toString(16).padStart(2, '0')).join('')
}

export function luminance(hex: string) {
  const [r, g, b] = channels(hex).map(value => {
    const channel = value / 255
    return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4
  })
  return r * .2126 + g * .7152 + b * .0722
}

/** Migrate the retired forest default while retaining personal neon accents. */
export function resolveAccent(stored: string | null) {
  return stored && isHex(stored) && stored.toLowerCase() !== '#176b52' ? stored.toLowerCase() : DEFAULT_ACCENT
}

export function accentTokens(value: string) {
  const accent = resolveAccent(value)
  // Accent is also used for small labels on dark cards, so keep it readable.
  let brand = accent
  for (let step = 1; (luminance(brand) + .05) / (luminance('#111010') + .05) < 4.5 && step <= 10; step++) {
    brand = mix(accent, '#ffffff', step / 10)
  }
  return {
    '--accent': brand,
    '--brand': brand,
    '--on-brand': luminance(brand) > .179 ? '#0a0a0a' : '#ffffff',
    '--on-accent': luminance(brand) > .179 ? '#0a0a0a' : '#ffffff',
    '--chip': mix(brand, '#0a0a0a', .92),
    '--chipText': brand,
    '--dash': mix(brand, '#0a0a0a', .86),
  }
}
