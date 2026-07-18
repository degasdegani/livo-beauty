import { prisma } from "@/lib/prisma"
import { requireBusinessId } from "@/lib/session"
import { createAppointment } from "../actions"
import { AppointmentForm } from "../appointment-form"

export default async function NovoAgendamentoPage() {
  const businessId = await requireBusinessId()

  const professionals = await prisma.professional.findMany({
    where: { businessId, category: "SERVICE_PROVIDER", active: true },
    include: {
      services: {
        include: { service: true },
      },
    },
    orderBy: { name: "asc" },
  })

  const professionalOptions = professionals.map((professional) => ({
    id: professional.id,
    name: professional.name,
    services: professional.services
      .filter((professionalService) => professionalService.service.active)
      .map((professionalService) => ({
        id: professionalService.service.id,
        name: professionalService.service.name,
        durationMinutes: professionalService.service.durationMinutes,
      })),
  }))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2 font-medium text-foreground">
          Novo agendamento
        </h1>
        <p className="text-body-sm text-foreground-secondary">
          Marque um atendimento na agenda.
        </p>
      </div>

      <AppointmentForm
        professionals={professionalOptions}
        action={createAppointment}
        submitLabel="Criar agendamento"
        cancelHref="/agenda"
      />
    </div>
  )
}
