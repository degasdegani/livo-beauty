import { listPayables } from "../actions"
import { PayablesList } from "./payables-list"

/**
 * A verificacao de canManagePayables ja acontece no layout de /financeiro
 * (compartilhado com /fluxo-de-caixa), entao esta pagina so busca dados.
 */
export default async function ContasAPagarPage() {
  const rows = await listPayables()

  return <PayablesList initialRows={rows} />
}
