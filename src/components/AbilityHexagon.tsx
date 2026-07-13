'use client'

import type { PlayerAttributes } from '@/types/database'
import { ATTRIBUTE_KEYS } from '@/types/database'
import { useI18n } from '@/lib/i18n/context'

const LABEL_KEYS: Record<keyof PlayerAttributes, 'attrPace'|'attrShooting'|'attrPassing'|'attrDribbling'|'attrDefending'|'attrPhysical'> = {
  pace: 'attrPace', shooting: 'attrShooting', passing: 'attrPassing',
  dribbling: 'attrDribbling', defending: 'attrDefending', physical: 'attrPhysical',
}

export function overallRating(a: PlayerAttributes): number {
  const vals = ATTRIBUTE_KEYS.map(k => a[k] || 0)
  return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length)
}

/** FIFA-style hexagon radar of the 6 self-rated attributes. */
export function AbilityHexagon({ attributes, size = 220 }: { attributes: PlayerAttributes; size?: number }) {
  const { t } = useI18n()
  const cx = size / 2, cy = size / 2
  const R = size * 0.34
  const accent = 'var(--accent)'

  // point on the hexagon for attribute i at ratio r (0..1)
  const pt = (i: number, r: number) => {
    const ang = -Math.PI / 2 + (i * 2 * Math.PI) / 6 // start at top
    return [cx + R * r * Math.cos(ang), cy + R * r * Math.sin(ang)]
  }

  const rings = [0.25, 0.5, 0.75, 1]
  const dataPoints = ATTRIBUTE_KEYS.map((k, i) => pt(i, Math.max(0.04, (attributes[k] || 0) / 99)))
  const dataPath = dataPoints.map(([x, y]) => `${x},${y}`).join(' ')

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: size }}>
      {/* grid rings */}
      {rings.map((r, ri) => (
        <polygon key={ri}
          points={ATTRIBUTE_KEYS.map((_, i) => pt(i, r).join(',')).join(' ')}
          fill="none" stroke="var(--line)" strokeWidth={1}
          opacity={ri === rings.length - 1 ? 0.8 : 0.4} />
      ))}
      {/* spokes */}
      {ATTRIBUTE_KEYS.map((_, i) => {
        const [x, y] = pt(i, 1)
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--line)" strokeWidth={1} opacity={0.4} />
      })}
      {/* data shape */}
      <polygon points={dataPath} fill={accent} fillOpacity={0.22} stroke={accent} strokeWidth={2} />
      {dataPoints.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={3} fill={accent} />
      ))}
      {/* labels */}
      {ATTRIBUTE_KEYS.map((k, i) => {
        const [x, y] = pt(i, 1.28)
        return (
          <text key={k} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
            fontSize={size * 0.052} fontWeight={800} fill="#fff">
            {t[LABEL_KEYS[k]]}
            <tspan fontSize={size * 0.05} fill={accent} dx={4}>{attributes[k] || 0}</tspan>
          </text>
        )
      })}
    </svg>
  )
}
