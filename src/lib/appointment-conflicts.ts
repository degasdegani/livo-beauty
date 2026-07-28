import { prisma } from "@/lib/prisma"
import type { AppointmentStatus } from "@/generated/prisma/client"

const CLOSED_STATUSES: AppointmentStatus[] = ["CANCELADO", "CONCLUIDO"]

export async function hasAppointmentConflict(
  professionalId: string,
  startAt: Date,
  endAt: Date,
  excludeAppointmentId?: string
): Promise<boolean> {
  const conflict = await prisma.appointment.findFirst({
    where: {
      professionalId,
      status: { notIn: CLOSED_STATUSES },
      startAt: { lt: endAt },
      endAt: { gt: startAt },
      ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
    },
    select: { id: true },
  })
  return conflict !== null
}

export async function hasProfessionalBlockConflict(
  professionalId: string,
  startAt: Date,
  endAt: Date
): Promise<boolean> {
  const conflict = await prisma.professionalBlock.findFirst({
    where: {
      professionalId,
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
    select: { id: true },
  })
  return conflict !== null
}
