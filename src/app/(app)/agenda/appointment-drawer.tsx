"use client"

import * as React from "react"

import { SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
  AppointmentForm,
  type ProfessionalOption,
  type AppointmentFormValues,
} from "./appointment-form"
import { AppointmentStatusActions } from "./appointment-status-actions"
import { AppointmentWhatsappActions } from "./appointment-whatsapp-actions"
import { OpenCommandButton } from "./open-command-button"
import {
  createAppointment,
  updateAppointment,
  getAppointmentEditData,
  type WhatsappActionUrls,
} from "./actions"
import type { AppointmentStatus } from "@/generated/prisma/client"

export type AppointmentDrawerState =
  | { mode: "closed" }
  | { mode: "create"; professionalId: string; startAt: string }
  | { mode: "edit"; appointmentId: string }

type EditFormValues = Partial<AppointmentFormValues> & {
  status: AppointmentStatus
  whatsapp: WhatsappActionUrls
  hasCommand: boolean
  canOpenCommand: boolean
}

export function AppointmentDrawer({
  state,
  onOpenChange,
  professionals,
  onSaved,
  onStatusChanged,
  onCommandOpened,
}: {
  state: AppointmentDrawerState
  onOpenChange: (open: boolean) => void
  professionals: ProfessionalOption[]
  onSaved: () => void
  onStatusChanged: (appointmentId: string, status: AppointmentStatus) => void
  onCommandOpened: (commandId: string) => void
}) {
  const appointmentId = state.mode === "edit" ? state.appointmentId : null

  const [editValues, setEditValues] = React.useState<EditFormValues | null>(null)
  const [editError, setEditError] = React.useState<string | null>(null)
  const [, startLoadEdit] = React.useTransition()

  React.useEffect(() => {
    setEditValues(null)
    setEditError(null)

    if (!appointmentId) return

    startLoadEdit(async () => {
      const result = await getAppointmentEditData(appointmentId)
      if (!result.defaultValues) {
        setEditError(result.error ?? "Erro ao carregar agendamento.")
      } else {
        setEditValues(result.defaultValues)
      }
    })
  }, [appointmentId])

  function handleCancel() {
    onOpenChange(false)
  }

  function handleStatusChanged(status: AppointmentStatus) {
    if (state.mode !== "edit") return
    setEditValues((prev) => (prev ? { ...prev, status } : prev))
    onStatusChanged(state.appointmentId, status)
  }

  function handleCommandOpened(commandId: string) {
    onOpenChange(false)
    onCommandOpened(commandId)
  }

  function renderBody() {
    if (state.mode === "closed") return null

    if (state.mode === "edit") {
      if (editError) {
        return <p className="py-6 text-body-sm text-error">{editError}</p>
      }
      if (!editValues) {
        return (
          <p className="py-6 text-body-sm text-muted-foreground">
            Carregando...
          </p>
        )
      }
      return (
        <div className="flex flex-col gap-4">
          <AppointmentStatusActions
            appointmentId={state.appointmentId}
            currentStatus={editValues.status}
            onChanged={handleStatusChanged}
          />
          {!editValues.hasCommand && editValues.canOpenCommand ? (
            <OpenCommandButton
              appointmentId={state.appointmentId}
              onOpened={handleCommandOpened}
            />
          ) : null}
          <AppointmentWhatsappActions urls={editValues.whatsapp} />
          <AppointmentForm
            key={state.appointmentId}
            professionals={professionals}
            action={updateAppointment.bind(null, state.appointmentId, null)}
            submitLabel="Salvar alterações"
            clientLocked
            onCancel={handleCancel}
            onSuccess={onSaved}
            defaultValues={editValues}
          />
        </div>
      )
    }

    return (
      <AppointmentForm
        key="create"
        professionals={professionals}
        action={createAppointment.bind(null, null)}
        submitLabel="Criar agendamento"
        onCancel={handleCancel}
        onSuccess={onSaved}
        defaultValues={{
          professionalId: state.professionalId,
          startAt: state.startAt,
        }}
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
          {state.mode === "edit" ? "Editar agendamento" : "Novo agendamento"}
        </SheetTitle>
      </SheetHeader>
      <div className="flex-1 overflow-y-auto px-4 pb-4">{renderBody()}</div>
    </SheetContent>
  )
}
