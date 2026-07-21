import type { Prisma } from "@/generated/prisma/client"

/**
 * Cria a Command ABERTA + um CommandItem por servico do Appointment, com
 * snapshot de unitPrice/commissionPercent do Service/ProfessionalService no
 * momento da criacao (default 0 de comissao se o vinculo nao existir).
 * Compartilhado entre o cron de abertura automatica (open-commands) e a
 * abertura manual (openCommandManually) — recebe o client transacional (tx)
 * de quem chama, nao abre transacao propria.
 */
export async function openCommandForAppointment(
  tx: Prisma.TransactionClient,
  appointmentId: string
): Promise<{ commandId: string } | { error: string }> {
  const appointment = await tx.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      services: { include: { service: true } },
      command: { select: { id: true } },
    },
  })
  if (!appointment) return { error: "Agendamento não encontrado." }
  if (appointment.command) return { error: "Este agendamento já tem uma comanda." }

  const professionalServices = await tx.professionalService.findMany({
    where: {
      professionalId: appointment.professionalId,
      serviceId: { in: appointment.services.map((service) => service.serviceId) },
    },
  })
  const commissionByServiceId = new Map(
    professionalServices.map((professionalService) => [
      professionalService.serviceId,
      professionalService.commissionPercent,
    ])
  )

  const command = await tx.command.create({
    data: {
      businessId: appointment.businessId,
      appointmentId: appointment.id,
      clientId: appointment.clientId,
      status: "ABERTA",
      items: {
        create: appointment.services.map((appointmentService) => ({
          type: "SERVICO",
          serviceId: appointmentService.serviceId,
          professionalId: appointment.professionalId,
          unitPrice: appointmentService.service.price,
          commissionPercent:
            commissionByServiceId.get(appointmentService.serviceId) ?? 0,
        })),
      },
    },
    select: { id: true },
  })

  return { commandId: command.id }
}
