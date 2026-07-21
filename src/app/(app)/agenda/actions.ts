"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { prisma } from "@/lib/prisma"
import { requireBusinessId, requireProfessionalId } from "@/lib/session"
import {
  canOpenCommand,
  getAppointmentsVisibleToUser,
  getClientsVisibleToUser,
  requireSessionUser,
} from "@/lib/access"
import {
  combineSaoPauloDateAndMinutes,
  parseLocalDatetimeInput,
  toDatetimeLocalValue,
} from "@/lib/datetime"
import { formatMaskValue } from "@/lib/masks"
import {
  buildConfirmationMessage,
  buildNoShowMessage,
  buildReminderMessage,
  buildWhatsappUrl,
} from "@/lib/whatsapp"
import type { AppointmentStatus } from "@/generated/prisma/client"

export type AppointmentFormState = {
  error?: string
}

const CLOSED_STATUSES: AppointmentStatus[] = ["CANCELADO", "CONCLUIDO"]
const COMMAND_CANCELING_STATUSES: AppointmentStatus[] = ["AUSENTE", "CANCELADO"]
const MIN_APPOINTMENT_DURATION_MS = 15 * 60_000

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

/** Bloqueios de agenda (ferias, folga etc) tambem nao podem ser sobrepostos por um agendamento. */
async function hasBlockConflict(
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

const CLIENT_SEARCH_MIN_DIGITS = 3
const CLIENT_SEARCH_LIMIT = 5

/**
 * Busca parcial por telefone: os digitos digitados podem aparecer em
 * qualquer posicao do numero (ex: os 4 ultimos digitos), nao so no inicio —
 * e o padrao de uso real de quem esta atendendo por telefone.
 */
export async function searchClientsByPhone(phoneRaw: string) {
  const digits = phoneRaw.replace(/\D/g, "")

  if (digits.length < CLIENT_SEARCH_MIN_DIGITS) return []

  return prisma.client.findMany({
    where: { ...(await getClientsVisibleToUser()), phone: { contains: digits } },
    select: { id: true, name: true, phone: true },
    orderBy: { name: "asc" },
    take: CLIENT_SEARCH_LIMIT,
  })
}

/**
 * redirectTo: em modo pagina cheia (/agenda/novo), passa "/agenda" e a action
 * redireciona apos salvar. Em modo drawer, passa null — a action so revalida
 * o cache e retorna {}, deixando o AppointmentForm chamar onSuccess() para
 * fechar o painel sem navegar.
 */
export async function createAppointment(
  redirectTo: string | null,
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

  if (await hasBlockConflict(professionalId, startAt, endAt)) {
    return { error: "Este horário está bloqueado na agenda do profissional." }
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
  if (redirectTo) redirect(redirectTo)
  return {}
}

export async function updateAppointment(
  id: string,
  redirectTo: string | null,
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

  if (await hasBlockConflict(professionalId, startAt, endAt)) {
    return { error: "Este horário está bloqueado na agenda do profissional." }
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
  if (redirectTo) redirect(redirectTo)
  return {}
}

/** Se o agendamento tiver uma Command ABERTA vinculada, cancela ela — sem gerar Transaction/Payable. */
async function cancelOpenCommandForAppointment(appointmentId: string) {
  await prisma.command.updateMany({
    where: { appointmentId, status: "ABERTA" },
    data: { status: "CANCELADA" },
  })
}

export async function cancelAppointment(id: string) {
  const businessId = await requireBusinessId()

  await prisma.appointment.updateMany({
    where: { id, businessId },
    data: { status: "CANCELADO" },
  })

  await cancelOpenCommandForAppointment(id)

  revalidatePath("/agenda")
}

export type ChangeStatusResult = { error?: string }

/**
 * Tenant-scoped via updateMany({where:{id, businessId}}) — um id de outro
 * negocio simplesmente nao casa com o where e count fica 0. Retorna erro
 * nesse caso (em vez de sucesso silencioso) porque o Drawer usa o retorno
 * para decidir se atualiza a grade otimisticamente.
 */
export async function changeAppointmentStatus(
  id: string,
  status: AppointmentStatus
): Promise<ChangeStatusResult> {
  const businessId = await requireBusinessId()

  if (!VALID_STATUSES.includes(status)) {
    return { error: "Status inválido." }
  }

  const result = await prisma.appointment.updateMany({
    where: { id, businessId },
    data: { status },
  })

  if (result.count === 0) {
    return { error: "Agendamento não encontrado." }
  }

  if (COMMAND_CANCELING_STATUSES.includes(status)) {
    await cancelOpenCommandForAppointment(id)
  }

  revalidatePath("/agenda")
  return {}
}

export type RescheduleResult = { error?: string }

/**
 * Reagenda via drag-and-drop na grade do calendario: so muda profissional e
 * horario de inicio, mantendo os mesmos servicos (e portanto a mesma
 * duracao). Diferente de updateAppointment, nao faz redirect — quem chama
 * fica na propria tela do calendario e trata o resultado no cliente.
 */
export async function rescheduleAppointment(
  id: string,
  professionalId: string,
  dateStr: string,
  startMinutes: number
): Promise<RescheduleResult> {
  const businessId = await requireBusinessId()

  const existing = await prisma.appointment.findFirst({
    where: { id, businessId },
    include: { services: true },
  })
  if (!existing) return { error: "Agendamento não encontrado." }

  const professional = await prisma.professional.findFirst({
    where: {
      id: professionalId,
      businessId,
      category: "SERVICE_PROVIDER",
      active: true,
    },
  })
  if (!professional) return { error: "Profissional inválido." }

  const serviceIds = existing.services.map((service) => service.serviceId)
  const attendedCount = await prisma.professionalService.count({
    where: { professionalId, serviceId: { in: serviceIds } },
  })
  if (attendedCount !== serviceIds.length) {
    return {
      error: "Este profissional não atende um ou mais serviços deste agendamento.",
    }
  }

  const durationMs = existing.endAt.getTime() - existing.startAt.getTime()
  const startAt = combineSaoPauloDateAndMinutes(dateStr, startMinutes)
  const endAt = new Date(startAt.getTime() + durationMs)

  if (await hasConflict(professionalId, startAt, endAt, id)) {
    return { error: "Este profissional já tem um atendimento nesse horário." }
  }

  if (await hasBlockConflict(professionalId, startAt, endAt)) {
    return { error: "Este horário está bloqueado na agenda do profissional." }
  }

  await prisma.appointment.update({
    where: { id },
    data: { professionalId, startAt, endAt },
  })

  revalidatePath("/agenda")
  return {}
}

export type WhatsappActionUrls = {
  confirmationUrl: string
  reminderUrl: string
  noShowUrl: string
}

export type AppointmentEditDataResult =
  | {
      error: string
      defaultValues?: undefined
    }
  | {
      error?: undefined
      defaultValues: {
        clientName: string
        clientPhone: string
        professionalId: string
        serviceIds: string[]
        startAt: string
        room: string
        notes: string
        status: AppointmentStatus
        whatsapp: WhatsappActionUrls
        hasCommand: boolean
        canOpenCommand: boolean
      }
    }

/** Carrega os dados de um agendamento no formato esperado pelo AppointmentForm, para o Drawer de edicao. */
export async function getAppointmentEditData(
  id: string
): Promise<AppointmentEditDataResult> {
  const { role } = await requireSessionUser()
  const userProfessionalId =
    role === "PROFESSIONAL" ? await requireProfessionalId() : null

  const appointment = await prisma.appointment.findFirst({
    where: { id, ...(await getAppointmentsVisibleToUser()) },
    include: {
      client: true,
      professional: true,
      business: true,
      services: { include: { service: true } },
      command: { select: { id: true } },
    },
  })
  if (!appointment) return { error: "Agendamento não encontrado." }

  // Mensagens/URLs sao montadas aqui (server action) e nao em lib/whatsapp.ts
  // direto no client component, para nao expor telefone/nome do cliente
  // formatados no bundle JS — o Drawer so recebe as 3 URLs finais.
  const whatsappData = {
    clientName: appointment.client.name,
    clientPhone: appointment.client.phone,
    businessName: appointment.business.name,
    professionalName: appointment.professional.name,
    serviceNames: appointment.services.map((service) => service.service.name),
    startAt: appointment.startAt,
  }

  return {
    defaultValues: {
      clientName: appointment.client.name,
      clientPhone: formatMaskValue("phone", appointment.client.phone),
      professionalId: appointment.professionalId,
      serviceIds: appointment.services.map((service) => service.serviceId),
      startAt: toDatetimeLocalValue(appointment.startAt),
      room: appointment.room ?? "",
      notes: appointment.notes ?? "",
      status: appointment.status,
      hasCommand: appointment.command != null,
      canOpenCommand: canOpenCommand(
        role,
        appointment.professionalId,
        userProfessionalId
      ),
      whatsapp: {
        confirmationUrl: buildWhatsappUrl(
          appointment.client.phone,
          buildConfirmationMessage(whatsappData)
        ),
        reminderUrl: buildWhatsappUrl(
          appointment.client.phone,
          buildReminderMessage(whatsappData)
        ),
        noShowUrl: buildWhatsappUrl(
          appointment.client.phone,
          buildNoShowMessage(whatsappData)
        ),
      },
    },
  }
}

export type ResizeResult = { error?: string }

/**
 * Redimensiona via arrastar a borda inferior do bloco na grade: so muda o
 * horario de termino (endAt), mantendo profissional e horario de inicio.
 * Nao redireciona (mesma razao do rescheduleAppointment) — quem chama fica
 * na tela do calendario e trata o resultado no cliente.
 *
 * IMPORTANTE: endAt normalmente vem da soma de durationSnapshot dos servicos
 * (loadServicesAndComputeEnd, na criacao/edicao). Esta action sobrescreve
 * esse valor calculado com a duracao manual escolhida no arrasto — e
 * intencional (o profissional pode querer estender um atendimento alem do
 * previsto) — mas NAO mexe em durationSnapshot/priceSnapshot de
 * AppointmentService, que continuam representando a duracao/preco "de
 * tabela" do servico, para fins de relatorio futuro.
 */
export async function resizeAppointment(
  id: string,
  dateStr: string,
  endMinutes: number
): Promise<ResizeResult> {
  const businessId = await requireBusinessId()

  if (endMinutes < 0 || endMinutes > 24 * 60) {
    return { error: "Horário de término inválido." }
  }

  const existing = await prisma.appointment.findFirst({
    where: { id, businessId },
  })
  if (!existing) return { error: "Agendamento não encontrado." }

  const endAt = combineSaoPauloDateAndMinutes(dateStr, endMinutes)
  const durationMs = endAt.getTime() - existing.startAt.getTime()

  if (durationMs < MIN_APPOINTMENT_DURATION_MS) {
    return { error: "Duração mínima do agendamento é 15 minutos." }
  }

  if (await hasConflict(existing.professionalId, existing.startAt, endAt, id)) {
    return { error: "Este profissional já tem um atendimento nesse horário." }
  }

  if (await hasBlockConflict(existing.professionalId, existing.startAt, endAt)) {
    return { error: "Este horário está bloqueado na agenda do profissional." }
  }

  await prisma.appointment.update({
    where: { id },
    data: { endAt },
  })

  revalidatePath("/agenda")
  return {}
}

export type ProfessionalBlockFormState = { error?: string }

/**
 * Cria um bloqueio de agenda (ferias, folga, etc). Sempre chamada a partir
 * de um Drawer (arrasto na grade ou botao "Bloquear agenda") — sem
 * equivalente em pagina cheia, por isso nunca redireciona.
 */
export async function createProfessionalBlock(
  _prevState: ProfessionalBlockFormState,
  formData: FormData
): Promise<ProfessionalBlockFormState> {
  const businessId = await requireBusinessId()

  const professionalId = String(formData.get("professionalId") ?? "").trim()
  const startAtRaw = String(formData.get("startAt") ?? "")
  const endAtRaw = String(formData.get("endAt") ?? "")
  const reason = String(formData.get("reason") ?? "").trim()

  if (!professionalId) return { error: "Selecione um profissional." }
  if (!startAtRaw || !endAtRaw) {
    return { error: "Informe início e término do bloqueio." }
  }

  const startAt = parseLocalDatetimeInput(startAtRaw)
  const endAt = parseLocalDatetimeInput(endAtRaw)
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
    return { error: "Data e hora inválidas." }
  }
  if (endAt <= startAt) {
    return { error: "O término deve ser depois do início." }
  }

  const professional = await prisma.professional.findFirst({
    where: { id: professionalId, businessId },
  })
  if (!professional) return { error: "Profissional inválido." }

  if (await hasConflict(professionalId, startAt, endAt)) {
    return {
      error:
        "Já existe um agendamento nesse período — cancele ou remarque antes de bloquear.",
    }
  }

  if (await hasBlockConflict(professionalId, startAt, endAt)) {
    return { error: "Já existe um bloqueio sobrepondo esse período." }
  }

  await prisma.professionalBlock.create({
    data: { professionalId, startAt, endAt, reason: reason || null },
  })

  revalidatePath("/agenda")
  return {}
}

export type RemoveBlockResult = { error?: string }

/** Tenant-scoped via relacao professional.businessId — ProfessionalBlock nao tem coluna businessId direta. */
export async function removeProfessionalBlock(
  id: string
): Promise<RemoveBlockResult> {
  const businessId = await requireBusinessId()

  const block = await prisma.professionalBlock.findFirst({
    where: { id, professional: { businessId } },
  })
  if (!block) return { error: "Bloqueio não encontrado." }

  await prisma.professionalBlock.delete({ where: { id } })

  revalidatePath("/agenda")
  return {}
}
