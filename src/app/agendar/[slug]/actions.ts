"use server"

import { prisma } from "@/lib/prisma"
import { resolveClient } from "@/lib/resolve-client"
import {
  hasAppointmentConflict,
  hasProfessionalBlockConflict,
} from "@/lib/appointment-conflicts"
import {
  getAvailableSlotsForDate,
  type AvailableSlot,
} from "@/lib/public-booking/availability"
import {
  PUBLIC_BOOKING_MIN_NOTICE_HOURS,
  PUBLIC_BOOKING_MAX_WINDOW_DAYS,
} from "@/lib/public-booking/constants"
import {
  combineSaoPauloDateAndMinutes,
  shiftDateString,
  todaySaoPauloDateString,
  saoPauloDayRange,
} from "@/lib/datetime"
import {
  AGENDA_WINDOW_START_MINUTES,
  AGENDA_WINDOW_END_MINUTES,
} from "@/app/(app)/agenda/constants"

// Nao importar de day-calendar.tsx ("use client") em codigo de servidor —
// mesma armadilha documentada em agenda/constants.ts.
const SLOT_MINUTES = 30

export type PublicBusiness = { id: string; name: string }

/** Retorna so id e name — NUNCA campos internos (document, inviteCode, plan etc) nesta rota publica. */
export async function getPublicBusinessBySlug(slug: string): Promise<PublicBusiness | null> {
  const business = await prisma.business.findUnique({
    where: { slug },
    select: { id: true, name: true },
  })
  return business
}

export type PublicService = {
  id: string
  name: string
  durationMinutes: number
  price: string
}

export async function getPublicServices(businessId: string): Promise<PublicService[]> {
  const services = await prisma.service.findMany({
    where: { businessId, active: true },
    orderBy: { name: "asc" },
  })
  return services.map((s) => ({
    id: s.id,
    name: s.name,
    durationMinutes: s.durationMinutes,
    price: s.price.toFixed(2),
  }))
}

export type PublicProfessional = { id: string; name: string }

export async function getPublicProfessionalsForService(
  businessId: string,
  serviceId: string
): Promise<PublicProfessional[]> {
  const professionals = await prisma.professional.findMany({
    where: {
      businessId,
      category: "SERVICE_PROVIDER",
      active: true,
      services: { some: { serviceId } },
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  })
  return professionals
}

/** Wrapper "use server" em cima da lib de disponibilidade (que roda em server component/action, mas precisa ser chamavel do client). */
export async function getPublicAvailableSlots(params: {
  businessId: string
  serviceId: string
  professionalId?: string | null
  dateStr: string
}): Promise<AvailableSlot[]> {
  return getAvailableSlotsForDate(params)
}

export type CreatePublicAppointmentResult = { error?: string; token?: string }

/**
 * Cria um agendamento vindo da tela publica. Revalida TODAS as regras no
 * servidor (nao confia em nada vindo do client) — antecedencia minima,
 * janela maxima, servico ativo, profissional valido, conflito de horario.
 * "Sem preferencia" (professionalId null/undefined) resolve para a
 * profissional com MENOS agendamentos no dia (distribui a demanda).
 */
export async function createPublicAppointment(params: {
  businessId: string
  serviceId: string
  professionalId?: string | null
  dateStr: string
  time: string
  clientName: string
  clientPhone: string
}): Promise<CreatePublicAppointmentResult> {
  const { businessId, serviceId, professionalId, dateStr, time, clientName, clientPhone } = params

  const cleanPhone = clientPhone.replace(/\D/g, "")
  const cleanName = clientName.trim()
  if (!cleanName) return { error: "Nome e obrigatorio." }
  if (cleanPhone.length < 10) return { error: "WhatsApp invalido." }

  const service = await prisma.service.findFirst({
    where: { id: serviceId, businessId, active: true },
  })
  if (!service) return { error: "Servico invalido." }

  const maxDateStr = shiftDateString(todaySaoPauloDateString(), PUBLIC_BOOKING_MAX_WINDOW_DAYS)
  if (dateStr > maxDateStr) return { error: "Data fora da janela permitida." }

  const [hh, mm] = time.split(":").map(Number)
  const startMinutes = hh * 60 + mm

  if (
    startMinutes < AGENDA_WINDOW_START_MINUTES ||
    startMinutes % SLOT_MINUTES !== 0
  ) {
    return { error: "Horario invalido." }
  }

  const endMinutes = startMinutes + service.durationMinutes
  if (endMinutes > AGENDA_WINDOW_END_MINUTES) {
    return { error: "Horario invalido." }
  }

  const startAt = combineSaoPauloDateAndMinutes(dateStr, startMinutes)
  const endAt = new Date(startAt.getTime() + service.durationMinutes * 60_000)

  const minNoticeThreshold = new Date(Date.now() + PUBLIC_BOOKING_MIN_NOTICE_HOURS * 60 * 60 * 1000)
  if (startAt < minNoticeThreshold) return { error: "Horario muito proximo, escolha outro." }

  // Resolver profissional (especifico ou "sem preferencia")
  let resolvedProfessionalId: string

  if (professionalId) {
    const professional = await prisma.professional.findFirst({
      where: {
        id: professionalId,
        businessId,
        category: "SERVICE_PROVIDER",
        active: true,
        services: { some: { serviceId } },
      },
    })
    if (!professional) return { error: "Profissional invalido." }
    resolvedProfessionalId = professional.id
  } else {
    const candidates = await prisma.professional.findMany({
      where: {
        businessId,
        category: "SERVICE_PROVIDER",
        active: true,
        services: { some: { serviceId } },
      },
      select: { id: true },
    })
    if (candidates.length === 0) return { error: "Nenhum profissional disponivel para este servico." }

    const { start, end } = saoPauloDayRange(dateStr)
    const counts = await Promise.all(
      candidates.map((c) =>
        prisma.appointment.count({
          where: {
            professionalId: c.id,
            startAt: { gte: start, lt: end },
            status: { notIn: ["CANCELADO", "CONCLUIDO"] },
          },
        })
      )
    )
    let minIndex = 0
    for (let i = 1; i < counts.length; i++) {
      if (counts[i] < counts[minIndex]) minIndex = i
    }
    resolvedProfessionalId = candidates[minIndex].id
  }

  if (await hasAppointmentConflict(resolvedProfessionalId, startAt, endAt)) {
    return { error: "Este horario acabou de ser ocupado, escolha outro." }
  }
  if (await hasProfessionalBlockConflict(resolvedProfessionalId, startAt, endAt)) {
    return { error: "Este horario nao esta disponivel, escolha outro." }
  }

  const client = await resolveClient(businessId, cleanName, cleanPhone)
  const token = crypto.randomUUID()

  const appointment = await prisma.appointment.create({
    data: {
      businessId,
      professionalId: resolvedProfessionalId,
      clientId: client.id,
      startAt,
      endAt,
      status: "CONFIRMADO",
      source: "PUBLIC_BOOKING",
      publicManageToken: token,
      services: {
        create: [{
          serviceId: service.id,
          priceSnapshot: service.price,
          durationSnapshot: service.durationMinutes,
        }],
      },
    },
  })

  await prisma.notification.create({
    data: {
      businessId,
      professionalId: resolvedProfessionalId,
      type: "NOVO_AGENDAMENTO_PUBLICO",
      appointmentId: appointment.id,
      message: `Novo agendamento: ${cleanName} - ${service.name} as ${time}`,
    },
  })

  return { token }
}

export type PublicAppointmentDetails = {
  id: string
  status: "CONFIRMADO" | "EM_ATENDIMENTO" | "CONCLUIDO" | "CANCELADO" | "AUSENTE" | "REAGENDADO"
  businessName: string
  professionalId: string
  professionalName: string
  serviceNames: string[]
  startAt: string // ISO string, serializavel para client component
  clientName: string
  clientPhone: string
}

/**
 * Busca cega por token — retorna null tanto para token inexistente quanto
 * para token de outro businessId (nunca diferenciar a mensagem de erro).
 */
export async function getPublicAppointmentByToken(
  businessId: string,
  token: string
): Promise<PublicAppointmentDetails | null> {
  const appointment = await prisma.appointment.findFirst({
    where: { publicManageToken: token, businessId },
    include: {
      business: true,
      professional: true,
      client: true,
      services: { include: { service: true } },
    },
  })
  if (!appointment) return null

  return {
    id: appointment.id,
    status: appointment.status,
    businessName: appointment.business.name,
    professionalId: appointment.professionalId,
    professionalName: appointment.professional.name,
    serviceNames: appointment.services.map((s) => s.service.name),
    startAt: appointment.startAt.toISOString(),
    clientName: appointment.client.name,
    clientPhone: appointment.client.phone,
  }
}

export type CancelPublicAppointmentResult = { error?: string }

export async function cancelPublicAppointment(
  businessId: string,
  token: string
): Promise<CancelPublicAppointmentResult> {
  const appointment = await prisma.appointment.findFirst({
    where: { publicManageToken: token, businessId },
  })
  if (!appointment) return { error: "Agendamento nao encontrado." }
  if (appointment.status === "CANCELADO") {
    return { error: "Este agendamento ja foi cancelado." }
  }

  await prisma.appointment.updateMany({
    where: { id: appointment.id },
    data: { status: "CANCELADO" },
  })

  // Mesma logica de cancelOpenCommandForAppointment em agenda/actions.ts —
  // se houver Command ABERTA vinculada, cancela ela tambem (sem gerar
  // Transaction/Payable). Nao importar de agenda/actions.ts (nao exportada
  // de la) — replicar aqui, mesmo padrao exato.
  await prisma.command.updateMany({
    where: { appointmentId: appointment.id, status: "ABERTA" },
    data: { status: "CANCELADA" },
  })

  return {}
}

export type ReschedulePublicAppointmentResult = { error?: string }

/**
 * Reagenda mantendo o MESMO profissional e servicos do agendamento original
 * — so muda data/horario. Revalida todas as regras (antecedencia minima,
 * janela maxima, grid de 30min, conflito) exatamente como
 * createPublicAppointment, para nao confiar em nada vindo do client.
 */
export async function reschedulePublicAppointment(
  businessId: string,
  token: string,
  dateStr: string,
  time: string
): Promise<ReschedulePublicAppointmentResult> {
  const appointment = await prisma.appointment.findFirst({
    where: { publicManageToken: token, businessId },
    include: { services: true },
  })
  if (!appointment) return { error: "Agendamento nao encontrado." }
  if (appointment.status === "CANCELADO") {
    return { error: "Este agendamento ja foi cancelado." }
  }

  const durationMs = appointment.endAt.getTime() - appointment.startAt.getTime()

  const maxDateStr = shiftDateString(todaySaoPauloDateString(), PUBLIC_BOOKING_MAX_WINDOW_DAYS)
  if (dateStr > maxDateStr) return { error: "Data fora da janela permitida." }

  const [hh, mm] = time.split(":").map(Number)
  const startMinutes = hh * 60 + mm

  if (
    startMinutes < AGENDA_WINDOW_START_MINUTES ||
    startMinutes % SLOT_MINUTES !== 0
  ) {
    return { error: "Horario invalido." }
  }

  const durationMinutes = durationMs / 60_000
  const endMinutes = startMinutes + durationMinutes
  if (endMinutes > AGENDA_WINDOW_END_MINUTES) {
    return { error: "Horario invalido." }
  }

  const startAt = combineSaoPauloDateAndMinutes(dateStr, startMinutes)
  const endAt = new Date(startAt.getTime() + durationMs)

  const minNoticeThreshold = new Date(Date.now() + PUBLIC_BOOKING_MIN_NOTICE_HOURS * 60 * 60 * 1000)
  if (startAt < minNoticeThreshold) return { error: "Horario muito proximo, escolha outro." }

  if (await hasAppointmentConflict(appointment.professionalId, startAt, endAt, appointment.id)) {
    return { error: "Este horario acabou de ser ocupado, escolha outro." }
  }
  if (await hasProfessionalBlockConflict(appointment.professionalId, startAt, endAt)) {
    return { error: "Este horario nao esta disponivel, escolha outro." }
  }

  await prisma.appointment.update({
    where: { id: appointment.id },
    data: { startAt, endAt },
  })

  return {}
}
