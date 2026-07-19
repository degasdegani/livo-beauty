"use client"

import * as React from "react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { changeAppointmentStatus } from "./actions"
import { STATUS_LABEL, STATUS_BADGE_VARIANT } from "./status"
import type { AppointmentStatus } from "@/generated/prisma/client"

const QUICK_STATUSES: AppointmentStatus[] = [
  "CONFIRMADO",
  "EM_ATENDIMENTO",
  "CONCLUIDO",
  "AUSENTE",
  "REAGENDADO",
  "CANCELADO",
]

/**
 * Badges clicaveis para trocar o status do agendamento sem sair do Drawer de
 * edicao. onChanged so dispara depois que o servidor confirma — sem
 * atualizacao otimista, ja que nao ha nada para reverter visualmente aqui
 * (diferente do move/resize na grade, que tem uma posicao anterior "valida"
 * para voltar).
 */
export function AppointmentStatusActions({
  appointmentId,
  currentStatus,
  onChanged,
}: {
  appointmentId: string
  currentStatus: AppointmentStatus
  onChanged: (status: AppointmentStatus) => void
}) {
  const [isPending, startTransition] = React.useTransition()
  const [pendingStatus, setPendingStatus] = React.useState<AppointmentStatus | null>(
    null
  )
  const [error, setError] = React.useState<string | null>(null)

  function handleClick(status: AppointmentStatus) {
    if (status === currentStatus || isPending) return
    setError(null)
    setPendingStatus(status)

    startTransition(async () => {
      const result = await changeAppointmentStatus(appointmentId, status)
      setPendingStatus(null)

      if (result.error) {
        setError(result.error)
      } else {
        onChanged(status)
      }
    })
  }

  return (
    <div className="flex flex-col gap-2 border-b border-border pb-4">
      <span className="text-body-sm font-medium text-foreground">Status</span>
      <div className="flex flex-wrap gap-2">
        {QUICK_STATUSES.map((status) => (
          <Badge
            key={status}
            variant={STATUS_BADGE_VARIANT[status]}
            className={cn(
              "select-none transition-all duration-150 ease-out",
              status === currentStatus
                ? "ring-2 ring-ring ring-offset-1"
                : "cursor-pointer opacity-60 hover:opacity-100",
              isPending && status === pendingStatus && "animate-pulse"
            )}
            render={(props) => (
              <button
                type="button"
                onClick={() => handleClick(status)}
                disabled={isPending || status === currentStatus}
                {...props}
              />
            )}
          >
            {STATUS_LABEL[status]}
          </Badge>
        ))}
      </div>
      {error ? <p className="text-micro text-error">{error}</p> : null}
    </div>
  )
}
