import { prisma } from "@/lib/prisma"
import { requireBusinessId } from "@/lib/session"
import { cancelAppointment } from "./actions"
import { Button, LinkButton } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge, type badgeVariants } from "@/components/ui/badge"
import { formatDateTimeBR, formatTimeBR } from "@/lib/datetime"
import type { AppointmentStatus } from "@/generated/prisma/client"
import type { VariantProps } from "class-variance-authority"

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  CONFIRMADO: "Confirmado",
  EM_ATENDIMENTO: "Em atendimento",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
  AUSENTE: "Ausente",
  REAGENDADO: "Reagendado",
}

const STATUS_BADGE_VARIANT: Record<
  AppointmentStatus,
  NonNullable<VariantProps<typeof badgeVariants>["variant"]>
> = {
  CONFIRMADO: "confirmado",
  EM_ATENDIMENTO: "em-atendimento",
  CONCLUIDO: "concluido",
  CANCELADO: "cancelado",
  AUSENTE: "ausente",
  REAGENDADO: "reagendado",
}

export default async function AgendaPage() {
  const businessId = await requireBusinessId()

  const appointments = await prisma.appointment.findMany({
    where: { businessId },
    include: {
      client: true,
      professional: true,
      services: { include: { service: true } },
    },
    orderBy: { startAt: "asc" },
  })

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h2 font-medium text-foreground">Agenda</h1>
          <p className="text-body-sm text-foreground-secondary">
            Lista de agendamentos — a visão de calendário chega na próxima
            etapa.
          </p>
        </div>
        <LinkButton href="/agenda/novo" variant="default">
          Novo agendamento
        </LinkButton>
      </div>

      {appointments.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-body-sm text-muted-foreground">
            Nenhum agendamento cadastrado ainda.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col divide-y divide-border p-0">
            {appointments.map((appointment) => (
              <div
                key={appointment.id}
                className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-body-sm font-medium text-foreground">
                      {appointment.client.name}
                    </span>
                    <Badge variant={STATUS_BADGE_VARIANT[appointment.status]}>
                      {STATUS_LABEL[appointment.status]}
                    </Badge>
                  </div>
                  <span className="text-body-sm text-foreground-secondary">
                    {appointment.professional.name} ·{" "}
                    {appointment.services
                      .map((service) => service.service.name)
                      .join(", ")}
                  </span>
                  <span className="text-micro text-muted-foreground">
                    {formatDateTimeBR(appointment.startAt)} –{" "}
                    {formatTimeBR(appointment.endAt)}
                    {appointment.room ? ` · ${appointment.room}` : ""}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <LinkButton
                    href={`/agenda/${appointment.id}/editar`}
                    variant="outline"
                    size="sm"
                  >
                    Editar
                  </LinkButton>
                  {appointment.status !== "CANCELADO" &&
                  appointment.status !== "CONCLUIDO" ? (
                    <form action={cancelAppointment.bind(null, appointment.id)}>
                      <Button type="submit" variant="destructive" size="sm">
                        Cancelar
                      </Button>
                    </form>
                  ) : null}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
