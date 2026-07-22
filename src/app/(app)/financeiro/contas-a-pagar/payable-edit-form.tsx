"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { centsFromDigits, centsToBRLDisplay, decimalToCents } from "@/lib/masks"
import { updatePayable } from "../actions"

/**
 * So renderizado pelo PayableDrawer quando detail.payments.length === 0.
 * Mesma mascara de centavos do PayablePaymentForm.
 */
export function PayableEditForm({
  payableId,
  initialDescription,
  initialAmount,
  onSaved,
  onCancel,
}: {
  payableId: string
  initialDescription: string
  initialAmount: number
  onSaved: () => void
  onCancel: () => void
}) {
  const [description, setDescription] = React.useState(initialDescription)
  const [amountCents, setAmountCents] = React.useState(() =>
    decimalToCents(initialAmount)
  )
  const [error, setError] = React.useState<string | null>(null)
  const [isPending, startTransition] = React.useTransition()

  function handleAmountChange(rawValue: string) {
    setAmountCents(centsFromDigits(rawValue))
  }

  function handleSubmit() {
    setError(null)

    if (description.trim() === "") {
      setError("Informe uma descrição.")
      return
    }
    if (amountCents <= 0) {
      setError("Informe um valor maior que zero.")
      return
    }

    startTransition(async () => {
      const result = await updatePayable(payableId, {
        amount: amountCents / 100,
        description: description.trim(),
      })
      if (result.error) {
        setError(result.error)
      } else {
        onSaved()
      }
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="payable-edit-description"
          className="text-body-sm text-foreground-secondary"
        >
          Descrição
        </label>
        <input
          id="payable-edit-description"
          type="text"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="h-8 w-full rounded-lg border border-input bg-surface px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="payable-edit-amount"
          className="text-body-sm text-foreground-secondary"
        >
          Valor
        </label>
        <input
          id="payable-edit-amount"
          type="text"
          inputMode="numeric"
          placeholder="R$ 0,00"
          value={amountCents > 0 ? centsToBRLDisplay(amountCents) : ""}
          onChange={(event) => handleAmountChange(event.target.value)}
          className="h-8 w-40 rounded-lg border border-input bg-surface px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>

      {error ? (
        <p className="rounded-lg bg-error-light px-3 py-2 text-body-sm text-error">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="default"
          size="sm"
          isDisabled={isPending}
          onPress={handleSubmit}
        >
          {isPending ? "Salvando..." : "Salvar"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          isDisabled={isPending}
          onPress={onCancel}
        >
          Cancelar
        </Button>
      </div>
    </div>
  )
}
