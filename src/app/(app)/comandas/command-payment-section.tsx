"use client"

import * as React from "react"
import { XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { centsToBRLDisplay, formatDecimalToBRL } from "@/lib/masks"
import { PAYMENT_METHOD_LABEL } from "./status"
import { closeCommand, type ClosePaymentInput } from "./actions"
import type { PaymentMethod } from "@/generated/prisma/client"

const PAYMENT_METHODS = Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]

type PaymentRow = { key: number; method: PaymentMethod; amountCents: number }

let nextRowKey = 0
function createEmptyRow(): PaymentRow {
  nextRowKey += 1
  return { key: nextRowKey, method: "DINHEIRO", amountCents: 0 }
}

/**
 * Valores em centavos (mesmo padrao de CurrencyInput em lib/masks) — soma
 * comparada em inteiros, sem risco de erro de arredondamento de float.
 * Nao usa <form>/FormData porque payments e um array estruturado; fecha a
 * comanda chamando closeCommand direto, igual ao padrao ja usado em
 * AppointmentStatusActions (changeAppointmentStatus via startTransition).
 */
export function CommandPaymentSection({
  commandId,
  itemsTotal,
  canClose,
  closeBlockedReason,
  onClosed,
}: {
  commandId: string
  itemsTotal: number
  canClose: boolean
  closeBlockedReason: string | null
  onClosed: () => void
}) {
  const [rows, setRows] = React.useState<PaymentRow[]>(() => [createEmptyRow()])
  const [error, setError] = React.useState<string | null>(null)
  const [isPending, startTransition] = React.useTransition()

  const itemsTotalCents = Math.round(itemsTotal * 100)
  const paymentsCents = rows.reduce((sum, row) => sum + row.amountCents, 0)
  const matches = paymentsCents === itemsTotalCents

  function updateRow(key: number, patch: Partial<PaymentRow>) {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  }

  function addRow() {
    setRows((prev) => [...prev, createEmptyRow()])
  }

  function removeRow(key: number) {
    setRows((prev) => (prev.length > 1 ? prev.filter((row) => row.key !== key) : prev))
  }

  function handleAmountChange(key: number, rawValue: string) {
    const digits = rawValue.replace(/\D/g, "").replace(/^0+(?=\d)/, "")
    updateRow(key, { amountCents: digits === "" ? 0 : parseInt(digits, 10) })
  }

  function handleClose() {
    setError(null)

    const payments: ClosePaymentInput[] = rows
      .filter((row) => row.amountCents > 0)
      .map((row) => ({ method: row.method, amount: row.amountCents / 100 }))

    startTransition(async () => {
      const result = await closeCommand(commandId, payments)
      if (result.error) {
        setError(result.error)
      } else {
        onClosed()
      }
    })
  }

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4">
      <span className="text-body-sm font-medium text-foreground">Pagamento</span>

      <div className="flex flex-col gap-2">
        {rows.map((row) => (
          <div key={row.key} className="flex items-center gap-2">
            <select
              value={row.method}
              onChange={(event) =>
                updateRow(row.key, { method: event.target.value as PaymentMethod })
              }
              className="h-8 flex-1 rounded-lg border border-input bg-surface px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {PAYMENT_METHOD_LABEL[method]}
                </option>
              ))}
            </select>
            <input
              type="text"
              inputMode="numeric"
              placeholder="R$ 0,00"
              value={row.amountCents > 0 ? centsToBRLDisplay(row.amountCents) : ""}
              onChange={(event) => handleAmountChange(row.key, event.target.value)}
              className="h-8 w-28 rounded-lg border border-input bg-surface px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            {rows.length > 1 ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onPress={() => removeRow(row.key)}
              >
                <XIcon />
                <span className="sr-only">Remover</span>
              </Button>
            ) : null}
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onPress={addRow}
        className="self-start"
      >
        + adicionar forma de pagamento
      </Button>

      <div className="flex items-center justify-between text-body-sm">
        <span className="text-foreground-secondary">Pago</span>
        <span className={matches ? "font-medium text-success" : "font-medium text-foreground"}>
          {formatDecimalToBRL(paymentsCents / 100)} / {formatDecimalToBRL(itemsTotal)}
        </span>
      </div>

      {error ? (
        <p className="rounded-lg bg-error-light px-3 py-2 text-body-sm text-error">
          {error}
        </p>
      ) : null}

      {!canClose ? (
        <p className="text-micro text-muted-foreground">{closeBlockedReason}</p>
      ) : null}

      <Button
        type="button"
        variant="default"
        isDisabled={!matches || !canClose || isPending}
        onPress={handleClose}
      >
        {isPending ? "Fechando..." : "Fechar comanda"}
      </Button>
    </div>
  )
}
