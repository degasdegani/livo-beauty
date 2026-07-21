import { prisma } from "@/lib/prisma"
import { requireBusinessId } from "@/lib/session"
import { getAppointmentsVisibleToUser } from "@/lib/access"
import {
  formatDateTimeBR,
  isValidDateString,
  saoPauloDayRange,
  todaySaoPauloDateString,
} from "@/lib/datetime"
import { getProfessionalOptions } from "./professional-options"
import { AGENDA_WINDOW_START_MINUTES, AGENDA_WINDOW_END_MINUTES } from "./constants"
import {
  DayCalendar,
  type AppointmentBlockData,
  type ProfessionalBlockData,
} from "./day-calendar"

/** Recorta [rawStart, rawEnd) (minutos desde a meia-noite do dia exibido) para a janela fixa da grade. */
function clampToWindow(
  rawStart: number,
  rawEnd: number
): { startMinutes: number; durationMinutes: number } {
  const startMinutes = Math.max(rawStart, AGENDA_WINDOW_START_MINUTES)
  const endMinutes = Math.min(rawEnd, AGENDA_WINDOW_END_MINUTES)
  return { startMinutes, durationMinutes: Math.max(endMinutes - startMinutes, 0) }
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const businessId = await requireBusinessId()
  const { date: dateParam } = await searchParams
  const today = todaySaoPauloDateString()
  const date = isValidDateString(dateParam) ? dateParam : today

  const { start, end } = saoPauloDayRange(date)

  const professionals = await getProfessionalOptions(businessId)
  const professionalIds = professionals.map((professional) => professional.id)
  const appointmentsVisibleWhere = await getAppointmentsVisibleToUser()

  const [appointmentRows, blockRows] = await Promise.all([
    professionalIds.length > 0
      ? prisma.appointment.findMany({
          where: {
            ...appointmentsVisibleWhere,
            professionalId: { in: professionalIds },
            startAt: { lt: end },
            endAt: { gt: start },
          },
          include: {
            client: true,
            services: { include: { service: true } },
            command: { include: { items: true } },
          },
          orderBy: { startAt: "asc" },
        })
      : Promise.resolve([]),
    professionalIds.length > 0
      ? prisma.professionalBlock.findMany({
          where: {
            professionalId: { in: professionalIds },
            startAt: { lt: end },
            endAt: { gt: start },
          },
        })
      : Promise.resolve([]),
  ])

  const appointments: AppointmentBlockData[] = appointmentRows
    .map((appointment) => {
      const rawStart = (appointment.startAt.getTime() - start.getTime()) / 60_000
      const rawEnd = (appointment.endAt.getTime() - start.getTime()) / 60_000
      const { startMinutes, durationMinutes } = clampToWindow(rawStart, rawEnd)

      const openCommand =
        appointment.command && appointment.command.status === "ABERTA"
          ? {
              id: appointment.command.id,
              total: appointment.command.items.reduce(
                (sum, item) => sum + item.unitPrice.toNumber() * item.quantity,
                0
              ),
            }
          : null

      return {
        id: appointment.id,
        professionalId: appointment.professionalId,
        clientName: appointment.client.name,
        serviceLabel: appointment.services
          .map((service) => service.service.name)
          .join(", "),
        status: appointment.status,
        room: appointment.room,
        startMinutes,
        durationMinutes,
        openCommand,
      }
    })
    // Fora da janela fixa 06:00-24:00 (ex: agendamento cruzando a madrugada)
    // — nao ha onde desenhar na grade atual; ficam ocultos aqui ate a janela
    // virar dinamica via BusinessHours.
    .filter((appointment) => appointment.durationMinutes > 0)

  const blocks: ProfessionalBlockData[] = blockRows
    .map((block) => {
      const rawStart = (block.startAt.getTime() - start.getTime()) / 60_000
      const rawEnd = (block.endAt.getTime() - start.getTime()) / 60_000
      const { startMinutes, durationMinutes } = clampToWindow(rawStart, rawEnd)

      return {
        id: block.id,
        professionalId: block.professionalId,
        reason: block.reason,
        startMinutes,
        durationMinutes,
        // Periodo real do bloqueio, sem o recorte da janela da grade — o
        // bloqueio pode abranger varios dias (ex: ferias).
        rangeLabel: `${formatDateTimeBR(block.startAt)} – ${formatDateTimeBR(block.endAt)}`,
      }
    })
    .filter((block) => block.durationMinutes > 0)

  return (
    <DayCalendar
      key={date}
      date={date}
      today={today}
      professionals={professionals}
      appointments={appointments}
      blocks={blocks}
    />
  )
}
