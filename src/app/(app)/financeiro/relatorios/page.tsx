import { todaySaoPauloDateString } from "@/lib/datetime"
import { getPeriodRange } from "@/lib/period"
import { getClientesReport, getComissoesReport, getFaturamentoReport } from "../../relatorios/actions"
import { RelatoriosView } from "./relatorios-view"

/**
 * A verificacao de canManagePayables ja acontece no layout de /financeiro
 * (compartilhado com as outras abas), entao esta pagina so busca dados.
 * Periodo padrao ao carregar: mes corrente (mesmo default do Fluxo de caixa).
 * Clientes nao depende de periodo, entao e buscado uma unica vez aqui.
 */
export default async function RelatoriosPage() {
  const { start, end } = getPeriodRange("mes")

  const [faturamento, comissoes, clientes] = await Promise.all([
    getFaturamentoReport(start, end),
    getComissoesReport(start, end),
    getClientesReport(),
  ])

  return (
    <RelatoriosView
      today={todaySaoPauloDateString()}
      initialPreset="mes"
      initialStart={start}
      initialEnd={end}
      initialFaturamento={faturamento}
      initialComissoes={comissoes}
      initialClientes={clientes}
    />
  )
}
