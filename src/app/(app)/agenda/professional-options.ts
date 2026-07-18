import { prisma } from "@/lib/prisma"
import type { ProfessionalOption } from "./appointment-form"

/**
 * Profissionais SERVICE_PROVIDER ativos + seus servicos ativos, no formato
 * esperado pelo AppointmentForm. Reaproveitado por /agenda/novo,
 * /agenda/[id]/editar e pelo Drawer da grade de calendario — evita
 * triplicar a mesma query+mapeamento.
 *
 * extraProfessionalId: inclui um profissional especifico mesmo que tenha
 * sido desativado (necessario ao editar um agendamento antigo, para o
 * select nao perder o valor selecionado).
 * keepServiceIds: mantem tambem servicos ja desativados que ja estavam
 * vinculados ao agendamento sendo editado.
 */
export async function getProfessionalOptions(
  businessId: string,
  options?: { extraProfessionalId?: string; keepServiceIds?: Set<string> }
): Promise<ProfessionalOption[]> {
  const professionals = await prisma.professional.findMany({
    where: {
      businessId,
      ...(options?.extraProfessionalId
        ? {
            OR: [
              { category: "SERVICE_PROVIDER", active: true },
              { id: options.extraProfessionalId },
            ],
          }
        : { category: "SERVICE_PROVIDER" as const, active: true }),
    },
    include: { services: { include: { service: true } } },
    orderBy: { name: "asc" },
  })

  return professionals.map((professional) => ({
    id: professional.id,
    name: professional.name,
    services: professional.services
      .filter(
        (professionalService) =>
          professionalService.service.active ||
          options?.keepServiceIds?.has(professionalService.service.id)
      )
      .map((professionalService) => ({
        id: professionalService.service.id,
        name: professionalService.service.name,
        durationMinutes: professionalService.service.durationMinutes,
      })),
  }))
}
