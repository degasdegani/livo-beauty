"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { openCommandManually } from "../comandas/actions"

/** Complementa a abertura automatica via cron — abre a comanda na hora, sob demanda. */
export function OpenCommandButton({
  appointmentId,
  onOpened,
}: {
  appointmentId: string
  onOpened: (commandId: string) => void
}) {
  const [isPending, startTransition] = React.useTransition()
  const [error, setError] = React.useState<string | null>(null)

  function handleClick() {
    setError(null)
    startTransition(async () => {
      const result = await openCommandManually(appointmentId)
      if (result.error || !result.commandId) {
        setError(result.error ?? "Não foi possível abrir a comanda.")
      } else {
        onOpened(result.commandId)
      }
    })
  }

  return (
    <div className="flex flex-col gap-2 border-b border-border pb-4">
      <Button
        type="button"
        variant="outline"
        size="sm"
        isDisabled={isPending}
        onPress={handleClick}
        className="self-start"
      >
        {isPending ? "Abrindo..." : "Abrir comanda"}
      </Button>
      {error ? <p className="text-micro text-error">{error}</p> : null}
    </div>
  )
}
