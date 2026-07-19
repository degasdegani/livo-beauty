"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { ProfessionalBlockFormState } from "./actions"
import type { ProfessionalOption } from "./appointment-form"

const EMPTY_FORM_STATE: ProfessionalBlockFormState = {}

export function ProfessionalBlockForm({
  professionals,
  action,
  defaultValues,
  onCancel,
  onSuccess,
}: {
  professionals: ProfessionalOption[]
  action: (
    state: ProfessionalBlockFormState,
    formData: FormData
  ) => Promise<ProfessionalBlockFormState>
  defaultValues?: { professionalId?: string; startAt?: string; endAt?: string }
  onCancel: () => void
  onSuccess: () => void
}) {
  const [state, formAction, isPending] = React.useActionState(
    action,
    EMPTY_FORM_STATE
  )

  React.useEffect(() => {
    if (!isPending && state !== EMPTY_FORM_STATE && !state.error) {
      onSuccess()
    }
  }, [state, isPending, onSuccess])

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Bloqueio de agenda</CardTitle>
          <CardDescription>
            O profissional fica indisponível para novos agendamentos nesse
            período. Pode abranger vários dias.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="blockProfessionalId"
              className="text-body-sm font-medium text-foreground"
            >
              Profissional *
            </label>
            <select
              id="blockProfessionalId"
              name="professionalId"
              required
              defaultValue={defaultValues?.professionalId ?? ""}
              className="h-8 w-full rounded-lg border border-input bg-surface px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="" disabled>
                Selecione...
              </option>
              {professionals.map((professional) => (
                <option key={professional.id} value={professional.id}>
                  {professional.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="blockStartAt"
              className="text-body-sm font-medium text-foreground"
            >
              Início *
            </label>
            <Input
              id="blockStartAt"
              name="startAt"
              type="datetime-local"
              required
              defaultValue={defaultValues?.startAt}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="blockEndAt"
              className="text-body-sm font-medium text-foreground"
            >
              Término *
            </label>
            <Input
              id="blockEndAt"
              name="endAt"
              type="datetime-local"
              required
              defaultValue={defaultValues?.endAt}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="blockReason"
              className="text-body-sm font-medium text-foreground"
            >
              Motivo
            </label>
            <Input
              id="blockReason"
              name="reason"
              placeholder="Ex: Férias, folga, consulta médica"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          {state.error ? (
            <p className="w-full rounded-lg bg-error-light px-3 py-2 text-body-sm text-error">
              {state.error}
            </p>
          ) : null}
          <div className="flex w-full justify-end gap-3">
            <Button type="button" variant="outline" onPress={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" variant="default" isDisabled={isPending}>
              {isPending ? "Salvando..." : "Bloquear"}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </form>
  )
}
