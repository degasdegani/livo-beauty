import { prisma } from "@/lib/prisma"
import { requireBusinessId } from "@/lib/session"
import { cancelAppointment } from "../actions"
import { STATUS_LABEL, STATUS_BADGE_VARIANT } from "../status"
import { Button, LinkButton } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDateTimeBR, formatTimeBR } from "@/lib/datetime"

export default async function AgendaListaPage() {
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
          <h1 className="text-h2 font-medium text-foreground">
            Agenda — lista
          </h1>
          <p className="text-body-sm text-foreground-secondary">
            Visão alternativa em lista de todos os agendamentos.{" "}
            <LinkButton href="/agenda" variant="link" size="default" className="h-auto p-0">
              Ver como calendário
            </LinkButton>
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
