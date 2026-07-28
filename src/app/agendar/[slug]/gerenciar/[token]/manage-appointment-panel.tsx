"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

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
import { formatDateBR, formatTimeBR } from "@/lib/datetime"
import {
  cancelPublicAppointment,
  reschedulePublicAppointment,
  type PublicAppointmentDetails,
} from "../../actions"

type Mode = "idle" | "cancelling" | "rescheduling"

// Grade de horarios de 30 em 30 min entre 06:00 e 23:30, gerada localmente —
// so uma lista para o usuario escolher. A disponibilidade real e validada no
// servidor por reschedulePublicAppointment (que roda as mesmas checagens de
// createPublicAppointment), entao nao ha necessidade de chamar nenhuma action
// so para montar esta lista.
const TIME_OPTIONS: string[] = []
for (let minutes = 6 * 60; minutes <= 23 * 60 + 30; minutes += 30) {
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0")
  const mm = String(minutes % 60).padStart(2, "0")
  TIME_OPTIONS.push(`${hh}:${mm}`)
}

export function ManageAppointmentPanel({
  slug,
  token,
  businessId,
  businessName,
  appointment,
  minDate,
  maxDate,
}: {
  slug: string
  token: string
  businessId: string
  businessName: string
  appointment: PublicAppointmentDetails
  minDate: string
  maxDate: string
}) {
  const router = useRouter()

  const [mode, setMode] = React.useState<Mode>("idle")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const [newDate, setNewDate] = React.useState("")
  const [newTime, setNewTime] = React.useState("")

  const startAtDate = new Date(appointment.startAt)

  if (appointment.status === "CANCELADO") {
    return (
      <Card>
        <CardContent>
          <p className="text-body-sm text-foreground-secondary">
            Este agendamento ja foi cancelado.
          </p>
        </CardContent>
      </Card>
    )
  }

  function handleStartCancel() {
    setError(null)
    setMode("cancelling")
  }

  function handleStartReschedule() {
    setError(null)
    setNewDate("")
    setNewTime("")
    setMode("rescheduling")
  }

  function handleBackToIdle() {
    setError(null)
    setMode("idle")
  }

  async function handleConfirmCancel() {
    setError(null)
    setIsSubmitting(true)
    try {
      const result = await cancelPublicAppointment(businessId, token)
      if (result.error) {
        setError(result.error)
        return
      }
      router.refresh()
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleConfirmReschedule() {
    setError(null)
    if (!newDate || !newTime) {
      setError("Escolha data e horario.")
      return
    }
    setIsSubmitting(true)
    try {
      const result = await reschedulePublicAppointment(businessId, token, newDate, newTime)
      if (result.error) {
        setError(result.error)
        return
      }
      setMode("idle")
      router.refresh()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{businessName}</CardTitle>
        <CardDescription>
          {appointment.serviceNames.join(", ")} com {appointment.professionalName}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-body-sm font-medium text-foreground">
          {formatDateBR(startAtDate)} as {formatTimeBR(startAtDate)}
        </p>

        {mode === "rescheduling" ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="newDate" className="text-body-sm font-medium text-foreground">
                Nova data *
              </label>
              <Input
                id="newDate"
                type="date"
                min={minDate}
                max={maxDate}
                value={newDate}
                onChange={(event) => setNewDate(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="newTime" className="text-body-sm font-medium text-foreground">
                Novo horario *
              </label>
              <select
                id="newTime"
                value={newTime}
                onChange={(event) => setNewTime(event.target.value)}
                className="h-8 w-full min-w-0 rounded-lg border border-input bg-surface px-2.5 py-1 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
              >
                <option value="">Selecione...</option>
                {TIME_OPTIONS.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : null}

        {mode === "cancelling" ? (
          <p className="text-body-sm text-foreground">Tem certeza que deseja cancelar?</p>
        ) : null}

        {error ? (
          <p className="w-full rounded-lg bg-error-light px-3 py-2 text-body-sm text-error">
            {error}
          </p>
        ) : null}
      </CardContent>
      <CardFooter className="flex justify-between gap-3">
        {mode === "idle" ? (
          <>
            <Button
              type="button"
              variant="destructive"
              isDisabled={isSubmitting}
              onPress={handleStartCancel}
            >
              Cancelar agendamento
            </Button>
            <Button
              type="button"
              variant="outline"
              isDisabled={isSubmitting}
              onPress={handleStartReschedule}
            >
              Reagendar
            </Button>
          </>
        ) : null}

        {mode === "cancelling" ? (
          <>
            <Button
              type="button"
              variant="outline"
              isDisabled={isSubmitting}
              onPress={handleBackToIdle}
            >
              Voltar
            </Button>
            <Button
              type="button"
              variant="destructive"
              isDisabled={isSubmitting}
              onPress={handleConfirmCancel}
            >
              {isSubmitting ? "Cancelando..." : "Sim, cancelar"}
            </Button>
          </>
        ) : null}

        {mode === "rescheduling" ? (
          <>
            <Button
              type="button"
              variant="outline"
              isDisabled={isSubmitting}
              onPress={handleBackToIdle}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="default"
              isDisabled={isSubmitting}
              onPress={handleConfirmReschedule}
            >
              {isSubmitting ? "Confirmando..." : "Confirmar novo horario"}
            </Button>
          </>
        ) : null}
      </CardFooter>
    </Card>
  )
}
