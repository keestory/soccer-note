import Svg, { Polygon, Line, Circle, Text as SvgText, TSpan } from 'react-native-svg'
import type { PlayerAttributes } from '@/types/database'
import { ATTRIBUTE_KEYS } from '@/types/database'
import { theme } from '@/lib/theme'
import { useI18n } from '@/lib/i18n/context'

const LABEL_KEYS: Record<keyof PlayerAttributes, keyof ReturnType<typeof useI18n>['t']> = {
  pace: 'attrPace', shooting: 'attrShooting', passing: 'attrPassing',
  dribbling: 'attrDribbling', defending: 'attrDefending', physical: 'attrPhysical',
}

export function AbilityHexagon({ attributes, size = 240 }: { attributes: PlayerAttributes; size?: number }) {
  const { t } = useI18n()
  const cx = size / 2, cy = size / 2, R = size * 0.32
  const accent = theme.accent

  const pt = (i: number, r: number): [number, number] => {
    const ang = -Math.PI / 2 + (i * 2 * Math.PI) / 6
    return [cx + R * r * Math.cos(ang), cy + R * r * Math.sin(ang)]
  }

  const rings = [0.25, 0.5, 0.75, 1]
  const dataPoints = ATTRIBUTE_KEYS.map((k, i) => pt(i, Math.max(0.04, (attributes[k] || 0) / 99)))
  const poly = (pts: [number, number][]) => pts.map(([x, y]) => `${x},${y}`).join(' ')

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {rings.map((r, ri) => (
        <Polygon key={ri} points={poly(ATTRIBUTE_KEYS.map((_, i) => pt(i, r)))}
          fill="none" stroke={theme.line} strokeWidth={1} opacity={ri === rings.length - 1 ? 0.8 : 0.4} />
      ))}
      {ATTRIBUTE_KEYS.map((_, i) => {
        const [x, y] = pt(i, 1)
        return <Line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke={theme.line} strokeWidth={1} opacity={0.4} />
      })}
      <Polygon points={poly(dataPoints)} fill={accent} fillOpacity={0.22} stroke={accent} strokeWidth={2} />
      {dataPoints.map(([x, y], i) => <Circle key={i} cx={x} cy={y} r={3} fill={accent} />)}
      {ATTRIBUTE_KEYS.map((k, i) => {
        const [x, y] = pt(i, 1.3)
        return (
          <SvgText key={k} x={x} y={y} fill="#fff" fontSize={size * 0.052} fontWeight="800" textAnchor="middle" alignmentBaseline="middle">
            {t[LABEL_KEYS[k]]}
            <TSpan fill={accent} dx={3}>{String(attributes[k] || 0)}</TSpan>
          </SvgText>
        )
      })}
    </Svg>
  )
}
