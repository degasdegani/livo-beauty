"use client"

import * as React from "react"
import { HandCoinsIcon, UserRoundXIcon, UsersIcon } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PeriodSelector, type PeriodSelectorValue } from "@/components/period-selector"
import { formatDateBR } from "@/lib/datetime"
import { formatDecimalToBRL } from "@/lib/masks"
import type { PeriodPreset } from "@/lib/period"
import {
  getComissoesReport,
  getFaturamentoReport,
  type ClientesReport,
  type ComissaoDetalheItem,
  type ComissoesReport,
  type FaturamentoReport,
} from "../../relatorios/actions"
import { PAYABLE_STATUS_BADGE_VARIANT, PAYABLE_STATUS_LABEL } from "../contas-a-pagar/status"
import type { PaymentMethod } from "@/generated/prisma/client"

const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  DINHEIRO: "Dinheiro",
  PIX: "Pix",
  CARTAO_DEBITO: "Cartão de Débito",
  CARTAO_CREDITO: "Cartão de Crédito",
}

type ReportTab = "faturamento" | "comissoes" | "clientes"

export function RelatoriosView({
  today,
  initialPreset,
  initialStart,
  initialEnd,
  initialFaturamento,
  initialComissoes,
  initialClientes,
}: {
  today: string
  initialPreset: PeriodPreset
  initialStart: string
  initialEnd: string
  initialFaturamento: FaturamentoReport
  initialComissoes: ComissoesReport
  initialClientes: ClientesReport
}) {
  const [activeTab, setActiveTab] = React.useState<ReportTab>("faturamento")
  const [period, setPeriod] = React.useState<PeriodSelectorValue>({
    preset: initialPreset,
    start: initialStart,
    end: initialEnd,
  })
  const [faturamento, setFaturamento] = React.useState(initialFaturamento)
  const [comissoes, setComissoes] = React.useState(initialComissoes)
  const [isPending, startTransition] = React.useTransition()

  function handlePeriodChange(next: PeriodSelectorValue) {
    setPeriod(next)
    startTransition(async () => {
      const [nextFaturamento, nextComissoes] = await Promise.all([
        getFaturamentoReport(next.start, next.end),
        getComissoesReport(next.start, next.end),
      ])
      setFaturamento(nextFaturamento)
      setComissoes(nextComissoes)
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {activeTab !== "clientes" ? (
        <PeriodSelector
          value={period.preset}
          customStart={period.preset === "personalizado" ? period.start : undefined}
          customEnd={period.preset === "personalizado" ? period.end : undefined}
          onChange={handlePeriodChange}
        />
      ) : null}

      <Tabs
        selectedKey={activeTab}
        onSelectionChange={(key) => setActiveTab(key as ReportTab)}
      >
        <TabsList>
          <TabsTrigger id="faturamento">Faturamento</TabsTrigger>
          <TabsTrigger id="comissoes">Comissões</TabsTrigger>
          <TabsTrigger id="clientes">Clientes</TabsTrigger>
        </TabsList>

        <TabsContent id="faturamento">
          <FaturamentoTab report={faturamento} isPending={isPending} />
        </TabsContent>
        <TabsContent id="comissoes">
          <ComissoesTab report={comissoes} isPending={isPending} />
        </TabsContent>
        <TabsContent id="clientes">
          <ClientesTab report={initialClientes} today={today} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function FaturamentoTab({
  report,
  isPending,
}: {
  report: FaturamentoReport
  isPending: boolean
}) {
  return (
    <div className={`flex flex-col gap-6 ${isPending ? "opacity-60" : ""}`}>
      <div className="flex flex-col gap-1 rounded-xl border border-border bg-surface p-5">
        <span className="text-body-sm text-foreground-secondary">
          Total do período
        </span>
        <span className="text-h3 font-medium text-foreground">
          {formatDecimalToBRL(report.total)}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden py-0">
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-body-sm font-medium text-foreground">
              Por forma de pagamento
            </h3>
          </div>
          {report.byPaymentMethod.length === 0 ? (
            <div className="px-4 py-8 text-center text-body-sm text-muted-foreground">
              Nenhum pagamento no período.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-body-sm">
                <thead>
                  <tr className="border-b border-border text-micro text-muted-foreground">
                    <th className="px-4 py-2.5 font-medium">Forma de pagamento</th>
                    <th className="px-4 py-2.5 text-right font-medium">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {report.byPaymentMethod.map((row) => (
                    <tr key={row.method}>
                      <td className="px-4 py-2.5 text-foreground-secondary">
                        {PAYMENT_METHOD_LABEL[row.method]}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium text-foreground">
                        {formatDecimalToBRL(row.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="overflow-hidden py-0">
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-body-sm font-medium text-foreground">
              Por profissional
            </h3>
          </div>
          {report.byProfessional.length === 0 ? (
            <div className="px-4 py-8 text-center text-body-sm text-muted-foreground">
              Nenhum atendimento faturado no período.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-body-sm">
                <thead>
                  <tr className="border-b border-border text-micro text-muted-foreground">
                    <th className="px-4 py-2.5 font-medium">Profissional</th>
                    <th className="px-4 py-2.5 text-right font-medium">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {report.byProfessional.map((row) => (
                    <tr key={row.professionalId}>
                      <td className="px-4 py-2.5 text-foreground-secondary">
                        {row.professionalName}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium text-foreground">
                        {formatDecimalToBRL(row.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

function ComissoesTab({
  report,
  isPending,
}: {
  report: ComissoesReport
  isPending: boolean
}) {
  const [expandedId, setExpandedId] = React.useState<string | null>(null)

  function toggle(professionalId: string) {
    setExpandedId((current) => (current === professionalId ? null : professionalId))
  }

  return (
    <div className={isPending ? "opacity-60" : ""}>
      {report.byProfessional.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <HandCoinsIcon className="size-8 text-muted-foreground" strokeWidth={1.75} />
            <p className="text-body-sm text-muted-foreground">
              Nenhuma comissão gerada no período.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden py-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-body-sm">
              <thead>
                <tr className="border-b border-border text-micro text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Profissional</th>
                  <th className="px-4 py-2.5 text-right font-medium">Total gerado</th>
                  <th className="px-4 py-2.5 text-right font-medium">Total pago</th>
                  <th className="px-4 py-2.5 text-right font-medium">Total pendente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {report.byProfessional.map((row) => (
                  <React.Fragment key={row.professionalId}>
                    <tr
                      onClick={() => toggle(row.professionalId)}
                      className="cursor-pointer transition-colors duration-150 ease-out hover:bg-background"
                    >
                      <td className="px-4 py-2.5 text-foreground">
                        {row.professionalName}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium text-foreground">
                        {formatDecimalToBRL(row.totalGerado)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-success">
                        {formatDecimalToBRL(row.totalPago)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-warning">
                        {formatDecimalToBRL(row.totalPendente)}
                      </td>
                    </tr>
                    {expandedId === row.professionalId ? (
                      <tr>
                        <td colSpan={4} className="bg-background px-4 py-3">
                          <ComissaoDetalheTable detalhe={row.detalhe} />
                        </td>
                      </tr>
                    ) : null}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

function ComissaoDetalheTable({ detalhe }: { detalhe: ComissaoDetalheItem[] }) {
  return (
    <table className="w-full text-left text-body-sm">
      <thead>
        <tr className="text-micro text-muted-foreground">
          <th className="py-1.5 pr-4 font-medium">Descrição</th>
          <th className="py-1.5 pr-4 font-medium">Cliente</th>
          <th className="py-1.5 pr-4 font-medium">Fechamento</th>
          <th className="py-1.5 pr-4 text-right font-medium">Valor</th>
          <th className="py-1.5 font-medium">Status</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {detalhe.map((item) => (
          <tr key={item.id}>
            <td className="py-1.5 pr-4 text-foreground-secondary">
              {item.description}
            </td>
            <td className="py-1.5 pr-4 text-foreground-secondary">
              {item.clientName ?? "—"}
            </td>
            <td className="py-1.5 pr-4 text-foreground-secondary">
              {item.commandClosedAt ? formatDateBR(item.commandClosedAt) : "—"}
            </td>
            <td className="py-1.5 pr-4 text-right text-foreground">
              {formatDecimalToBRL(item.amount)}
            </td>
            <td className="py-1.5">
              <Badge variant={PAYABLE_STATUS_BADGE_VARIANT[item.status]}>
                {PAYABLE_STATUS_LABEL[item.status]}
              </Badge>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** Data (instante) -> YYYY-MM-DD em horario de Brasilia, para diff de dias por calendario. */
function saoPauloDateString(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
}

/** Dias entre duas datas YYYY-MM-DD, por calendario (sem hora), independente de fuso do processo. */
function daysBetweenDateStrings(fromStr: string, toStr: string): number {
  const [fy, fm, fd] = fromStr.split("-").map(Number)
  const [ty, tm, td] = toStr.split("-").map(Number)
  const fromUTC = Date.UTC(fy, fm - 1, fd)
  const toUTC = Date.UTC(ty, tm - 1, td)
  return Math.round((toUTC - fromUTC) / (24 * 60 * 60 * 1000))
}

function ClientesTab({ report, today }: { report: ClientesReport; today: string }) {
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h3 className="text-body-sm font-medium text-foreground">Ranking</h3>
        {report.ranking.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <UsersIcon className="size-8 text-muted-foreground" strokeWidth={1.75} />
              <p className="text-body-sm text-muted-foreground">
                Nenhum cliente com atendimento fechado ainda.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden py-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-body-sm">
                <thead>
                  <tr className="border-b border-border text-micro text-muted-foreground">
                    <th className="px-4 py-2.5 font-medium">Cliente</th>
                    <th className="px-4 py-2.5 text-right font-medium">Total gasto</th>
                    <th className="px-4 py-2.5 text-right font-medium">Visitas</th>
                    <th className="px-4 py-2.5 text-right font-medium">Ticket médio</th>
                    <th className="px-4 py-2.5 font-medium">Última visita</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {report.ranking.map((client) => (
                    <tr key={client.clientId}>
                      <td className="px-4 py-2.5 text-foreground">
                        {client.clientName}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium text-foreground">
                        {formatDecimalToBRL(client.totalGasto)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-foreground-secondary">
                        {client.visitas}
                      </td>
                      <td className="px-4 py-2.5 text-right text-foreground-secondary">
                        {formatDecimalToBRL(client.ticketMedio)}
                      </td>
                      <td className="px-4 py-2.5 text-foreground-secondary">
                        {client.ultimaVisita ? formatDateBR(client.ultimaVisita) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-body-sm font-medium text-foreground">
          Clientes sumidos
        </h3>
        {report.sumidos.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <UserRoundXIcon className="size-8 text-muted-foreground" strokeWidth={1.75} />
              <p className="text-body-sm text-muted-foreground">
                Nenhum cliente sumido — todo mundo voltou nos últimos 60 dias.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden py-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-body-sm">
                <thead>
                  <tr className="border-b border-border text-micro text-muted-foreground">
                    <th className="px-4 py-2.5 font-medium">Cliente</th>
                    <th className="px-4 py-2.5 font-medium">Última visita</th>
                    <th className="px-4 py-2.5 text-right font-medium">
                      Total gasto histórico
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {report.sumidos.map((client) => (
                    <tr key={client.clientId} className="border-l-2 border-l-warning">
                      <td className="px-4 py-2.5 text-foreground">
                        {client.clientName}
                      </td>
                      <td className="px-4 py-2.5 text-foreground-secondary">
                        {client.ultimaVisita ? formatDateBR(client.ultimaVisita) : "—"}
                        {client.ultimaVisita ? (
                          <span className="ml-2 text-micro text-warning">
                            {daysBetweenDateStrings(
                              saoPauloDateString(client.ultimaVisita),
                              today
                            )}{" "}
                            dias
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium text-foreground">
                        {formatDecimalToBRL(client.totalGasto)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </section>
    </div>
  )
}
