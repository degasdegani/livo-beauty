"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { prisma } from "@/lib/prisma"
import { requireBusinessId } from "@/lib/session"
import { parseLocalDatetimeInput } from "@/lib/datetime"
import type { AppointmentStatus } from "@/generated/prisma/client"

export type AppointmentFormState = {
  error?: string
}

const CLOSED_STATUSES: AppointmentStatus[] = ["CANCELADO", "CONCLUIDO"]

const VALID_STATUSES: AppointmentStatus[] = [
  "CONFIRMADO",
  "EM_ATENDIMENTO",
  "CONCLUIDO",
  "CANCELADO",
  "AUSENTE",
  "REAGENDADO",
]

function parseServiceIds(formData: FormData): string[] {
  return formData
    .getAll("serviceIds")
    .map((value) => String(value))
    .filter(Boolean)
}

async function resolveClient(
  businessId: string,
  name: string,
  phone: string
) {
  const existing = await prisma.client.findFirst({
    where: { businessId, phone },
  })

  if (existing) return existing

  return prisma.client.create({
    data: { businessId, name, phone, fullProfileCompleted: false },
  })
}

/** Busca os servicos e calcula o horario de termino somando as duracoes. */
async function loadServicesAndComputeEnd(
  businessId: string,
  serviceIds: string[],
  startAt: Date
) {
  const services = await prisma.service.findMany({
    where: { id: { in: serviceIds }, businessId },
  })

  if (services.length !== serviceIds.length) {
    throw new Error("Um ou mais serviços selecionados são inválidos.")
  }

  const totalMinutes = services.reduce(
    (sum, service) => sum + service.durationMinutes,
    0
  )
  const endAt = new Date(startAt.getTime() + totalMinutes * 60_000)

  return { services, endAt }
}

async function hasConflict(
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

const CLIENT_SEARCH_MIN_DIGITS = 3
const CLIENT_SEARCH_LIMIT = 5

/**
 * Busca parcial por telefone: os digitos digitados podem aparecer em
 * qualquer posicao do numero (ex: os 4 ultimos digitos), nao so no inicio —
 * e o padrao de uso real de quem esta atendendo por telefone.
 */
export async function searchClientsByPhone(phoneRaw: string) {
  const businessId = await requireBusinessId()
  const digits = phoneRaw.replace(/\D/g, "")

  if (digits.length < CLIENT_SEARCH_MIN_DIGITS) return []

  return prisma.client.findMany({
    where: { businessId, phone: { contains: digits } },
    select: { id: true, name: true, phone: true },
    orderBy: { name: "asc" },
    take: CLIENT_SEARCH_LIMIT,
  })
}

export async function createAppointment(
  _prevState: AppointmentFormState,
  formData: FormData
): Promise<AppointmentFormState> {
  const businessId = await requireBusinessId()

  const clientName = String(formData.get("clientName") ?? "").trim()
  const clientPhone = String(formData.get("clientPhone") ?? "").replace(
    /\D/g,
    ""
  )
  const professionalId = String(formData.get("professionalId") ?? "").trim()
  const serviceIds = parseServiceIds(formData)
  const startAtRaw = String(formData.get("startAt") ?? "")
  const room = String(formData.get("room") ?? "").trim()
  const notes = String(formData.get("notes") ?? "").trim()

  if (!clientName) return { error: "Nome do cliente é obrigatório." }
  if (clientPhone.length < 10) return { error: "Telefone do cliente inválido." }
  if (!professionalId) return { error: "Selecione um profissional." }
  if (serviceIds.length === 0) {
    return { error: "Selecione ao menos um serviço." }
  }
  if (!startAtRaw) return { error: "Informe a data e hora de início." }

  const startAt = parseLocalDatetimeInput(startAtRaw)
  if (Number.isNaN(startAt.getTime())) {
    return { error: "Data e hora inválidas." }
  }

  const professional = await prisma.professional.findFirst({
    where: {
      id: professionalId,
      businessId,
      category: "SERVICE_PROVIDER",
      active: true,
    },
  })
  if (!professional) return { error: "Profissional inválido." }

  const attendedCount = await prisma.professionalService.count({
    where: { professionalId, serviceId: { in: serviceIds } },
  })
  if (attendedCount !== serviceIds.length) {
    return {
      error: "Este profissional não atende um ou mais serviços selecionados.",
    }
  }

  const { services, endAt } = await loadServicesAndComputeEnd(
    businessId,
    serviceIds,
    startAt
  )

  if (await hasConflict(professionalId, startAt, endAt)) {
    return { error: "Este profissional já tem um atendimento nesse horário." }
  }

  const client = await resolveClient(businessId, clientName, clientPhone)

  await prisma.appointment.create({
    data: {
      businessId,
      professionalId,
      clientId: client.id,
      startAt,
      endAt,
      room: room || null,
      notes: notes || null,
      services: {
        create: services.map((service) => ({
          serviceId: service.id,
          priceSnapshot: service.price,
          durationSnapshot: service.durationMinutes,
        })),
      },
    },
  })

  revalidatePath("/agenda")
  redirect("/agenda")
}

export async function updateAppointment(
  id: string,
  _prevState: AppointmentFormState,
  formData: FormData
): Promise<AppointmentFormState> {
  const businessId = await requireBusinessId()

  const existing = await prisma.appointment.findFirst({
    where: { id, businessId },
  })
  if (!existing) return { error: "Agendamento não encontrado." }

  const professionalId = String(formData.get("professionalId") ?? "").trim()
  const serviceIds = parseServiceIds(formData)
  const startAtRaw = String(formData.get("startAt") ?? "")
  const room = String(formData.get("room") ?? "").trim()
  const notes = String(formData.get("notes") ?? "").trim()

  if (!professionalId) return { error: "Selecione um profissional." }
  if (serviceIds.length === 0) {
    return { error: "Selecione ao menos um serviço." }
  }
  if (!startAtRaw) return { error: "Informe a data e hora de início." }

  const startAt = parseLocalDatetimeInput(startAtRaw)
  if (Number.isNaN(startAt.getTime())) {
    return { error: "Data e hora inválidas." }
  }

  const professional = await prisma.professional.findFirst({
    where: {
      id: professionalId,
      businessId,
      category: "SERVICE_PROVIDER",
      active: true,
    },
  })
  if (!professional) return { error: "Profissional inválido." }

  const attendedCount = await prisma.professionalService.count({
    where: { professionalId, serviceId: { in: serviceIds } },
  })
  if (attendedCount !== serviceIds.length) {
    return {
      error: "Este profissional não atende um ou mais serviços selecionados.",
    }
  }

  const { services, endAt } = await loadServicesAndComputeEnd(
    businessId,
    serviceIds,
    startAt
  )

  if (await hasConflict(professionalId, startAt, endAt, id)) {
    return { error: "Este profissional já tem um atendimento nesse horário." }
  }

  await prisma.$transaction([
    prisma.appointmentService.deleteMany({ where: { appointmentId: id } }),
    prisma.appointment.update({
      where: { id },
      data: {
        professionalId,
        startAt,
        endAt,
        room: room || null,
        notes: notes || null,
        services: {
          create: services.map((service) => ({
            serviceId: service.id,
            priceSnapshot: service.price,
            durationSnapshot: service.durationMinutes,
          })),
        },
      },
    }),
  ])

  revalidatePath("/agenda")
  redirect("/agenda")
}

export async function cancelAppointment(id: string) {
  const businessId = await requireBusinessId()

  await prisma.appointment.updateMany({
    where: { id, businessId },
    data: { status: "CANCELADO" },
  })

  revalidatePath("/agenda")
}

export async function changeAppointmentStatus(
  id: string,
  status: AppointmentStatus
) {
  const businessId = await requireBusinessId()

  if (!VALID_STATUSES.includes(status)) {
    throw new Error("Status inválido.")
  }

  await prisma.appointment.updateMany({
    where: { id, businessId },
    data: { status },
  })

  revalidatePath("/agenda")
}
