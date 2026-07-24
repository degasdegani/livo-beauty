import type { DashboardRevenuePoint } from "./actions"

const WIDTH = 800
const HEIGHT = 220
const PADDING_X = 8
const PADDING_TOP = 16
const PADDING_BOTTOM = 28

/**
 * Grafico de linha estatico (Server Component, sem JS) — segue a linguagem
 * visual do design system: linha fina, area sob a linha em tom bem sutil,
 * sem grade pesada, so uma linha de base e os rotulos do eixo X. Sem eixo Y
 * numerado nem tooltip por ora (interatividade fica pra uma proxima fase,
 * se fizer sentido).
 */
export function RevenueChart({ data }: { data: DashboardRevenuePoint[] }) {
  const chartWidth = WIDTH - PADDING_X * 2
  const chartHeight = HEIGHT - PADDING_TOP - PADDING_BOTTOM
  const maxAmount = Math.max(...data.map((point) => point.amount), 1)
  const xStep = data.length > 1 ? chartWidth / (data.length - 1) : 0
  const baselineY = PADDING_TOP + chartHeight

  const points = data.map((point, index) => ({
    x: PADDING_X + index * xStep,
    y: PADDING_TOP + chartHeight - (point.amount / maxAmount) * chartHeight,
  }))

  const linePath = points.map((point) => `${point.x},${point.y}`).join(" L ")
  const areaPath =
    points.length > 0
      ? `M ${points[0].x},${baselineY} L ${linePath} L ${points[points.length - 1].x},${baselineY} Z`
      : ""

  // Com 30 pontos mostra 1 a cada 5 dias (evita poluir); com 7 mostra todos.
  const labelStep = data.length > 10 ? 5 : 1

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label="Receita diária no período selecionado"
      >
        <line
          x1={PADDING_X}
          y1={baselineY}
          x2={WIDTH - PADDING_X}
          y2={baselineY}
          stroke="#E7ECF3"
          strokeWidth={1}
        />

        {areaPath ? <path d={areaPath} fill="#7C6CF6" fillOpacity={0.08} stroke="none" /> : null}

        {linePath ? (
          <path
            d={`M ${linePath}`}
            fill="none"
            stroke="#7C6CF6"
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}

        {points.map((point, index) =>
          index % labelStep === 0 ? (
            <text
              key={data[index].date}
              x={point.x}
              y={HEIGHT - 8}
              textAnchor={
                index === 0 ? "start" : index === data.length - 1 ? "end" : "middle"
              }
              fontSize={11}
              fill="#94A3B8"
            >
              {data[index].label}
            </text>
          ) : null
        )}
      </svg>
    </div>
  )
}
