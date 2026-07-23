"use client"

import * as React from "react"
import { toast } from "sonner"

import { Switch } from "@/components/ui/switch"
import { updateProntuarioEnabled } from "./actions"

export function ProntuarioToggle({
  initialEnabled,
}: {
  initialEnabled: boolean
}) {
  const [enabled, setEnabled] = React.useState(initialEnabled)
  const [isPending, startTransition] = React.useTransition()

  function handleChange(checked: boolean) {
    const previous = enabled
    setEnabled(checked)

    startTransition(async () => {
      const result = await updateProntuarioEnabled(checked)

      if (!result.success) {
        setEnabled(previous)
        toast.error(result.error ?? "Erro ao atualizar configuração.")
        return
      }

      toast.success(
        checked
          ? "Prontuário/Anamnese ativado."
          : "Prontuário/Anamnese desativado."
      )
    })
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col gap-1">
        <label
          htmlFor="prontuario-toggle"
          className="text-body-sm font-medium text-foreground"
        >
          Prontuário/Anamnese
        </label>
        <p className="text-micro text-muted-foreground">
          Ative para habilitar fichas de anamnese, consentimento e fotos de
          acompanhamento para os serviços que exigirem.
        </p>
      </div>
      <Switch
        id="prontuario-toggle"
        isSelected={enabled}
        onChange={handleChange}
        isDisabled={isPending}
      />
    </div>
  )
}
