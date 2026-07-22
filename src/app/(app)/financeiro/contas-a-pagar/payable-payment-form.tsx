"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { centsFromDigits, centsToBRLDisplay, decimalToCents } from "@/lib/masks"
import { payPayable } from "../actions"

/**
 * Mesmo padrao de mascara de centavos do CommandPaymentSection: o valor
 * digitado e sempre inteiro em centavos, pre-preenchido com o restante mas
 * editavel (permite pagamento parcial).
 */
export function PayablePaymentForm({
  payableId,
  remainingAmount,
  onPaid,
}: {
  payableId: string
  remainingAmount: number
  onPaid: () => void
}) {
  const remainingCents = decimalToCents(remainingAmount)
  const [amountCents, setAmountCents] = React.useState(remainingCents)
  const [error, setError] = React.useState<string | null>(null)
  const [isPending, startTransition] = React.useTransition()

  function handleAmountChange(rawValue: string) {
    setAmountCents(centsFromDigits(rawValue))
  }

  function handleSubmit() {
    setError(null)

    if (amountCents <= 0) {
      setError("Informe um valor maior que zero.")
      return
    }
    if (amountCents > remainingCents) {
      setError("O valor não pode ser maior que o restante.")
      return
    }

    startTransition(async () => {
      const result = await payPayable(payableId, amountCents)
      if (result.error) {
        setError(result.error)
      } else {
        onPaid()
      }
    })
  }

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4">
      <span className="text-body-sm font-medium text-foreground">
        Registrar pagamento
      </span>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="payable-payment-amount"
          className="text-body-sm text-foreground-secondary"
        >
          Valor
        </label>
        <input
          id="payable-payment-amount"
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

      <Button
        type="button"
        variant="default"
        isDisabled={isPending}
        onPress={handleSubmit}
        className="self-start"
      >
        {isPending ? "Confirmando..." : "Confirmar pagamento"}
      </Button>
    </div>
  )
}
