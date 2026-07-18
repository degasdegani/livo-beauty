import { notFound } from "next/navigation"

import { prisma } from "@/lib/prisma"
import { requireBusinessId } from "@/lib/session"
import { updateAppointment } from "../../actions"
import { AppointmentForm } from "../../appointment-form"
import { toDatetimeLocalValue } from "@/lib/datetime"
import { formatMaskValue } from "@/lib/masks"

export default async function EditarAgendamentoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const businessId = await requireBusinessId()

  const appointment = await prisma.appointment.findFirst({
    where: { id, businessId },
    include: { client: true, services: true },
  })

  if (!appointment) {
    notFound()
  }

  // Inclui o profissional atual do agendamento mesmo que tenha sido desativado
  // depois — senão o select perderia o valor selecionado.
  const professionals = await prisma.professional.findMany({
    where: {
      businessId,
      OR: [
        { category: "SERVICE_PROVIDER", active: true },
        { id: appointment.professionalId },
      ],
    },
    include: {
      services: {
        include: { service: true },
      },
    },
    orderBy: { name: "asc" },
  })

  const selectedServiceIds = new Set(
    appointment.services.map((service) => service.serviceId)
  )

  const professionalOptions = professionals.map((professional) => ({
    id: professional.id,
    name: professional.name,
    // Mantem tambem servicos ja vinculados a este agendamento, mesmo que
    // tenham sido desativados/desvinculados depois.
    services: professional.services
      .filter(
        (professionalService) =>
          professionalService.service.active ||
          selectedServiceIds.has(professionalService.service.id)
      )
      .map((professionalService) => ({
        id: professionalService.service.id,
        name: professionalService.service.name,
        durationMinutes: professionalService.service.durationMinutes,
      })),
  }))

  const updateAppointmentWithId = updateAppointment.bind(null, appointment.id)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2 font-medium text-foreground">
          Editar agendamento
        </h1>
        <p className="text-body-sm text-foreground-secondary">
          Atualize os dados do atendimento de {appointment.client.name}.
        </p>
      </div>

      <AppointmentForm
        professionals={professionalOptions}
        action={updateAppointmentWithId}
        submitLabel="Salvar alterações"
        cancelHref="/agenda"
        clientLocked
        defaultValues={{
          clientName: appointment.client.name,
          clientPhone: formatMaskValue("phone", appointment.client.phone),
          professionalId: appointment.professionalId,
          serviceIds: appointment.services.map((service) => service.serviceId),
          startAt: toDatetimeLocalValue(appointment.startAt),
          room: appointment.room ?? "",
          notes: appointment.notes ?? "",
        }}
      />
    </div>
  )
}
