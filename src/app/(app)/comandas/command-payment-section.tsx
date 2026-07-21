"use client"

import * as React from "react"
import { XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { centsToBRLDisplay, formatDecimalToBRL } from "@/lib/masks"
import { PAYMENT_METHOD_LABEL } from "./status"
import { closeCommand, type ClosePaymentInput, type CloseCommandDiscountInput } from "./actions"
import type { PaymentMethod } from "@/generated/prisma/client"

const PAYMENT_METHODS = Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]

type PaymentRow = { key: number; method: PaymentMethod; amountCents: number }
type DiscountType = "PERCENTUAL" | "FIXO"

let nextRowKey = 0
function createEmptyRow(): PaymentRow {
  nextRowKey += 1
  return { key: nextRowKey, method: "DINHEIRO", amountCents: 0 }
}

/** Digitos digitados -> centavos inteiros (mesmo padrao de CurrencyInput em lib/masks). */
function centsFromInput(rawValue: string): number {
  const digits = rawValue.replace(/\D/g, "").replace(/^0+(?=\d)/, "")
  return digits === "" ? 0 : parseInt(digits, 10)
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
  canApplyDiscount,
  onClosed,
}: {
  commandId: string
  itemsTotal: number
  canClose: boolean
  closeBlockedReason: string | null
  canApplyDiscount: boolean
  onClosed: () => void
}) {
  const [rows, setRows] = React.useState<PaymentRow[]>(() => [createEmptyRow()])
  const [discountType, setDiscountType] = React.useState<DiscountType>("PERCENTUAL")
  const [discountPercentRaw, setDiscountPercentRaw] = React.useState("")
  const [discountValueCents, setDiscountValueCents] = React.useState(0)
  const [error, setError] = React.useState<string | null>(null)
  const [isPending, startTransition] = React.useTransition()

  // Mesma formula do desconto no servidor (closeCommand): percentual sobre o
  // total ou valor fixo, sempre clampado entre 0 e itemsTotal — pra o "Pago
  // X / Y" bater com o que o servidor vai conferir de fato. FIXO entra em
  // centavos (mesmo padrao dos campos de pagamento) e so vira reais aqui.
  const discountValue =
    discountType === "PERCENTUAL"
      ? Number(discountPercentRaw.replace(",", ".")) || 0
      : discountValueCents / 100
  const rawDiscountAmount =
    discountValue > 0
      ? discountType === "PERCENTUAL"
        ? itemsTotal * (discountValue / 100)
        : discountValue
      : 0
  const discountAmount = Math.min(Math.max(rawDiscountAmount, 0), itemsTotal)

  const itemsTotalCents = Math.round(itemsTotal * 100)
  const discountAmountCents = Math.round(discountAmount * 100)
  const netTotalCents = itemsTotalCents - discountAmountCents
  const paymentsCents = rows.reduce((sum, row) => sum + row.amountCents, 0)
  const matches = paymentsCents === netTotalCents

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
    updateRow(key, { amountCents: centsFromInput(rawValue) })
  }

  function handleDiscountTypeChange(nextType: DiscountType) {
    setDiscountType(nextType)
    // Reseta o valor digitado ao trocar de tipo — um numero de percentual
    // (ex: "37.5") nao faz sentido virando centavos de valor fixo, e vice-versa.
    setDiscountPercentRaw("")
    setDiscountValueCents(0)
  }

  function handleDiscountValueCentsChange(rawValue: string) {
    setDiscountValueCents(centsFromInput(rawValue))
  }

  function handleClose() {
    setError(null)

    const payments: ClosePaymentInput[] = rows
      .filter((row) => row.amountCents > 0)
      .map((row) => ({ method: row.method, amount: row.amountCents / 100 }))

    const discount: CloseCommandDiscountInput =
      discountValue > 0 ? { type: discountType, value: discountValue } : null

    startTransition(async () => {
      const result = await closeCommand(commandId, payments, discount)
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

      {canApplyDiscount ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-body-sm font-medium text-foreground">Desconto</span>
          <div className="flex items-center gap-2">
            <select
              value={discountType}
              onChange={(event) =>
                handleDiscountTypeChange(event.target.value as DiscountType)
              }
              className="h-8 rounded-lg border border-input bg-surface px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="PERCENTUAL">Percentual (%)</option>
              <option value="FIXO">Valor fixo (R$)</option>
            </select>
            {discountType === "PERCENTUAL" ? (
              <input
                type="number"
                inputMode="decimal"
                min={0}
                max={100}
                step="0.01"
                placeholder="0"
                value={discountPercentRaw}
                onChange={(event) => setDiscountPercentRaw(event.target.value)}
                className="h-8 w-24 rounded-lg border border-input bg-surface px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            ) : (
              <input
                type="text"
                inputMode="numeric"
                placeholder="R$ 0,00"
                value={discountValueCents > 0 ? centsToBRLDisplay(discountValueCents) : ""}
                onChange={(event) => handleDiscountValueCentsChange(event.target.value)}
                className="h-8 w-28 rounded-lg border border-input bg-surface px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            )}
          </div>
          {discountAmount > 0 ? (
            <p className="text-micro text-foreground-secondary">
              Desconto: {formatDecimalToBRL(discountAmount)}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center justify-between text-body-sm">
        <span className="text-foreground-secondary">Pago</span>
        <span className={matches ? "font-medium text-success" : "font-medium text-foreground"}>
          {formatDecimalToBRL(paymentsCents / 100)} / {formatDecimalToBRL(netTotalCents / 100)}
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
