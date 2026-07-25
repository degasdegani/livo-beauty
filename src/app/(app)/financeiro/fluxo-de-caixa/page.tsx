import { getPeriodRange } from "@/lib/period"
import { getCashFlow } from "../actions"
import { CashFlowView } from "./cash-flow-view"

/**
 * A verificacao de canManagePayables ja acontece no layout de /financeiro
 * (compartilhado com /contas-a-pagar), entao esta pagina so busca dados.
 * Periodo padrao ao carregar: mes corrente (mesmo default do Relatorios).
 */
export default async function FluxoDeCaixaPage() {
  const { start, end } = getPeriodRange("mes")

  const result = await getCashFlow(start, end)

  return (
    <CashFlowView
      initialPreset="mes"
      initialStart={start}
      initialEnd={end}
      initialResult={result}
    />
  )
}
