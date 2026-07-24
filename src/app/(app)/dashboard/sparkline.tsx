const WIDTH = 100
const HEIGHT = 32
const PADDING_Y = 3

/**
 * Mini grafico de linha estatico (Server Component, sem JS) — so a
 * tendencia, sem eixos, sem preenchimento, cor herdada via currentColor
 * (controlada pelo className de quem usa). Quando todos os valores sao
 * iguais (ex: tudo 0), a normalizacao por (max - min) explodiria em divisao
 * por zero — desenha uma linha reta no meio em vez de "achatada no chao".
 */
export function Sparkline({ data, className }: { data: number[]; className?: string }) {
  if (data.length === 0) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min

  const xStep = data.length > 1 ? WIDTH / (data.length - 1) : 0
  const chartHeight = HEIGHT - PADDING_Y * 2

  const points = data.map((value, index) => ({
    x: index * xStep,
    y:
      range === 0
        ? HEIGHT / 2
        : PADDING_Y + chartHeight - ((value - min) / range) * chartHeight,
  }))

  const linePath = points.map((point) => `${point.x},${point.y}`).join(" L ")

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className={className}
      preserveAspectRatio="none"
      role="img"
      aria-hidden="true"
    >
      <path
        d={`M ${linePath}`}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
