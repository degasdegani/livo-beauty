"use client"

import * as React from "react"
import { ReceiptTextIcon } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatDateBR } from "@/lib/datetime"
import { formatDecimalToBRL } from "@/lib/masks"
import { listPayables, type PayableListItem } from "../actions"
import { PayableDrawer, type PayableDrawerState } from "./payable-drawer"
import {
  PAYABLE_KIND_LABEL,
  PAYABLE_STATUS_LABEL,
  PAYABLE_STATUS_BADGE_VARIANT,
  PAYABLE_OPEN_STATUSES,
} from "./status"
import type { PayableKind, PayableStatus } from "@/generated/prisma/client"

const KIND_OPTIONS = Object.keys(PAYABLE_KIND_LABEL) as PayableKind[]
const STATUS_OPTIONS = Object.keys(PAYABLE_STATUS_LABEL) as PayableStatus[]

type Filters = { kind?: PayableKind; status?: PayableStatus }

export function PayablesList({
  initialRows,
}: {
  initialRows: PayableListItem[]
}) {
  const [rows, setRows] = React.useState(initialRows)
  const [filters, setFilters] = React.useState<Filters>({})
  const [drawerState, setDrawerState] = React.useState<PayableDrawerState>({
    mode: "closed",
  })
  const [isPending, startTransition] = React.useTransition()

  function reload(nextFilters: Filters) {
    startTransition(async () => {
      const result = await listPayables(nextFilters)
      setRows(result)
    })
  }

  function handleKindChange(value: string) {
    const nextFilters: Filters = {
      ...filters,
      kind: value === "" ? undefined : (value as PayableKind),
    }
    setFilters(nextFilters)
    reload(nextFilters)
  }

  function handleStatusChange(value: string) {
    const nextFilters: Filters = {
      ...filters,
      status: value === "" ? undefined : (value as PayableStatus),
    }
    setFilters(nextFilters)
    reload(nextFilters)
  }

  function handleClearFilters() {
    setFilters({})
    reload({})
  }

  function handleOpen(payableId: string) {
    setDrawerState({ mode: "open", payableId })
  }

  function handleOpenChange(open: boolean) {
    if (!open) setDrawerState({ mode: "closed" })
  }

  function handleChanged() {
    reload(filters)
  }

  const hasActiveFilters = filters.kind !== undefined || filters.status !== undefined

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={filters.kind ?? ""}
          onChange={(event) => handleKindChange(event.target.value)}
          className="h-8 rounded-lg border border-input bg-surface px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="">Todos os tipos</option>
          {KIND_OPTIONS.map((kind) => (
            <option key={kind} value={kind}>
              {PAYABLE_KIND_LABEL[kind]}
            </option>
          ))}
        </select>
        <select
          value={filters.status ?? ""}
          onChange={(event) => handleStatusChange(event.target.value)}
          className="h-8 rounded-lg border border-input bg-surface px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="">Todos os status</option>
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {PAYABLE_STATUS_LABEL[status]}
            </option>
          ))}
        </select>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <ReceiptTextIcon
              className="size-8 text-muted-foreground"
              strokeWidth={1.75}
            />
            <p className="text-body-sm text-muted-foreground">
              Nenhuma conta a pagar encontrada
              {hasActiveFilters ? " para este filtro." : "."}
            </p>
            {hasActiveFilters ? (
              <Button variant="outline" size="sm" onPress={handleClearFilters}>
                Limpar filtros
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden py-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-body-sm">
              <thead>
                <tr className="border-b border-border text-micro text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Descrição</th>
                  <th className="px-4 py-2.5 font-medium">Tipo</th>
                  <th className="px-4 py-2.5 font-medium">
                    Profissional/Fornecedor
                  </th>
                  <th className="px-4 py-2.5 text-right font-medium">
                    Valor total
                  </th>
                  <th className="px-4 py-2.5 text-right font-medium">Pago</th>
                  <th className="px-4 py-2.5 text-right font-medium">
                    Restante
                  </th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Vencimento</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => handleOpen(row.id)}
                    className={`cursor-pointer transition-colors duration-150 ease-out hover:bg-background ${
                      isPending ? "opacity-60" : ""
                    }`}
                  >
                    <td className="px-4 py-2.5 text-foreground">
                      {row.description}
                    </td>
                    <td className="px-4 py-2.5 text-foreground-secondary">
                      {PAYABLE_KIND_LABEL[row.kind]}
                    </td>
                    <td className="px-4 py-2.5 text-foreground-secondary">
                      {row.professionalName ?? row.supplierName ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right text-foreground">
                      {formatDecimalToBRL(row.amount)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-foreground-secondary">
                      {formatDecimalToBRL(row.paidAmount)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-foreground">
                      {formatDecimalToBRL(row.remainingAmount)}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant={PAYABLE_STATUS_BADGE_VARIANT[row.status]}>
                        {PAYABLE_STATUS_LABEL[row.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-foreground-secondary">
                      {row.dueDate ? formatDateBR(row.dueDate) : "—"}
                    </td>
                    <td
                      className="px-4 py-2.5 text-right"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {PAYABLE_OPEN_STATUSES.includes(row.status) ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onPress={() => handleOpen(row.id)}
                        >
                          Registrar pagamento
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <PayableDrawer
        state={drawerState}
        onOpenChange={handleOpenChange}
        onChanged={handleChanged}
      />
    </div>
  )
}
