"use client"

import * as React from "react"

import { SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { ProfessionalBlockForm } from "./professional-block-form"
import { createProfessionalBlock, removeProfessionalBlock } from "./actions"
import type { ProfessionalOption } from "./appointment-form"

export type ProfessionalBlockDrawerState =
  | { mode: "closed" }
  | { mode: "create"; professionalId?: string; startAt?: string; endAt?: string }
  | {
      mode: "remove"
      blockId: string
      professionalName: string
      reason: string | null
      rangeLabel: string
    }

export function ProfessionalBlockDrawer({
  state,
  onOpenChange,
  professionals,
  onSaved,
}: {
  state: ProfessionalBlockDrawerState
  onOpenChange: (open: boolean) => void
  professionals: ProfessionalOption[]
  onSaved: () => void
}) {
  const [isPending, startTransition] = React.useTransition()
  const [removeError, setRemoveError] = React.useState<string | null>(null)

  React.useEffect(() => {
    setRemoveError(null)
  }, [state])

  function handleCancel() {
    onOpenChange(false)
  }

  function handleConfirmRemove(blockId: string) {
    setRemoveError(null)
    startTransition(async () => {
      const result = await removeProfessionalBlock(blockId)
      if (result.error) {
        setRemoveError(result.error)
      } else {
        onSaved()
      }
    })
  }

  function renderBody() {
    if (state.mode === "closed") return null

    if (state.mode === "remove") {
      return (
        <div className="flex flex-col gap-4 py-2">
          <p className="text-body-sm text-foreground">
            Remover o bloqueio de{" "}
            <span className="font-medium">{state.professionalName}</span>{" "}
            ({state.rangeLabel})
            {state.reason ? ` — ${state.reason}` : ""}?
          </p>
          {removeError ? (
            <p className="rounded-lg bg-error-light px-3 py-2 text-body-sm text-error">
              {removeError}
            </p>
          ) : null}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onPress={handleCancel}
              isDisabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              isDisabled={isPending}
              onPress={() => handleConfirmRemove(state.blockId)}
            >
              {isPending ? "Removendo..." : "Remover bloqueio"}
            </Button>
          </div>
        </div>
      )
    }

    return (
      <ProfessionalBlockForm
        key={`${state.professionalId ?? ""}-${state.startAt ?? ""}`}
        professionals={professionals}
        action={createProfessionalBlock}
        defaultValues={{
          professionalId: state.professionalId,
          startAt: state.startAt,
          endAt: state.endAt,
        }}
        onCancel={handleCancel}
        onSuccess={onSaved}
      />
    )
  }

  return (
    <SheetContent
      isOpen={state.mode !== "closed"}
      onOpenChange={onOpenChange}
      className="data-[side=right]:sm:max-w-120"
    >
      <SheetHeader className="border-b border-border">
        <SheetTitle>
          {state.mode === "remove" ? "Remover bloqueio" : "Bloquear agenda"}
        </SheetTitle>
      </SheetHeader>
      <div className="flex-1 overflow-y-auto px-4 pb-4">{renderBody()}</div>
    </SheetContent>
  )
}
