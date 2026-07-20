import { notFound } from "next/navigation"

import { prisma } from "@/lib/prisma"
import { requireBusinessId } from "@/lib/session"
import { getAppointmentsVisibleToUser } from "@/lib/access"
import { updateAppointment } from "../../actions"
import { AppointmentForm } from "../../appointment-form"
import { getProfessionalOptions } from "../../professional-options"
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
    where: { id, ...(await getAppointmentsVisibleToUser()) },
    include: { client: true, services: true },
  })

  if (!appointment) {
    notFound()
  }

  const selectedServiceIds = new Set(
    appointment.services.map((service) => service.serviceId)
  )

  const professionalOptions = await getProfessionalOptions(businessId, {
    extraProfessionalId: appointment.professionalId,
    keepServiceIds: selectedServiceIds,
  })

  const updateAppointmentWithId = updateAppointment.bind(
    null,
    appointment.id,
    "/agenda"
  )

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
