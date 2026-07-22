import { todaySaoPauloDateString } from "@/lib/datetime"
import { getCashFlow } from "../actions"
import { CashFlowView } from "./cash-flow-view"

/**
 * A verificacao de canManagePayables ja acontece no layout de /financeiro
 * (compartilhado com /contas-a-pagar), entao esta pagina so busca dados.
 * Periodo padrao ao carregar: mes corrente (dia 1 ate hoje).
 */
export default async function FluxoDeCaixaPage() {
  const today = todaySaoPauloDateString()
  const startDate = `${today.slice(0, 7)}-01`

  const result = await getCashFlow(startDate, today)

  return (
    <CashFlowView
      initialStartDate={startDate}
      initialEndDate={today}
      initialResult={result}
    />
  )
}
