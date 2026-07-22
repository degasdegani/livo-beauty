"use client"

import { usePathname } from "next/navigation"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

const FINANCEIRO_TABS = [
  { key: "/financeiro/contas-a-pagar", label: "Contas a pagar" },
  { key: "/financeiro/fluxo-de-caixa", label: "Fluxo de caixa" },
  { key: "/financeiro/relatorios", label: "Relatórios" },
  { key: "/comandas", label: "Comandas" },
] as const

/**
 * A aba "Comandas" sai da secao /financeiro (link avulso pedido no escopo) —
 * como nao existe rota /comandas dentro deste layout, ela nunca fica
 * selecionada aqui, so serve de atalho.
 */
export function FinanceiroTabs() {
  const pathname = usePathname()
  const selectedKey =
    FINANCEIRO_TABS.find((tab) => tab.key === pathname)?.key ??
    FINANCEIRO_TABS[0].key

  return (
    <Tabs selectedKey={selectedKey}>
      <TabsList variant="line">
        {FINANCEIRO_TABS.map((tab) => (
          <TabsTrigger key={tab.key} id={tab.key} href={tab.key}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
