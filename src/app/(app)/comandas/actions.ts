"use server"

import { revalidatePath } from "next/cache"

import { prisma } from "@/lib/prisma"
import {
  canAccessCommand,
  canApplyDiscount,
  canAssignItemToOtherProfessional,
  canCloseCommand,
  canOpenCommand,
  requireSessionUser,
} from "@/lib/access"
import { requireProfessionalId } from "@/lib/session"
import { applyStockDelta } from "@/lib/stock"
import { openCommandForAppointment } from "@/lib/commands"
import { formatDateBR } from "@/lib/datetime"
import type { CommandStatus, DiscountType, PaymentMethod } from "@/generated/prisma/client"

export type ClosePaymentInput = { method: PaymentMethod; amount: number }
export type CloseCommandDiscountInput =
  | { type: "PERCENTUAL" | "FIXO"; value: number }
  | null
export type CloseCommandResult = { error?: string }

const AMOUNT_TOLERANCE = 0.01

export async function closeCommand(
  commandId: string,
  payments: ClosePaymentInput[],
  discount: CloseCommandDiscountInput
): Promise<CloseCommandResult> {
  const { businessId, role } = await requireSessionUser()
  const userProfessionalId =
    role === "PROFESSIONAL" ? await requireProfessionalId() : null

  const command = await prisma.command.findFirst({
    where: { id: commandId, businessId },
    include: {
      items: true,
      business: { select: { hasReception: true } },
      appointment: { select: { professionalId: true } },
      client: { select: { name: true } },
    },
  })
  if (!command) return { error: "Comanda não encontrada." }

  if (command.status !== "ABERTA") {
    return { error: "Esta comanda já foi fechada ou cancelada." }
  }

  const isOwnCommand =
    userProfessionalId != null &&
    command.appointment?.professionalId === userProfessionalId

  if (!canCloseCommand(role, command.business, isOwnCommand)) {
    return {
      error: command.business.hasReception
        ? "Só a recepção (OWNER/STAFF) pode fechar esta comanda."
        : "Só a própria profissional responsável pode fechar esta comanda.",
    }
  }

  const itemsTotal = command.items.reduce(
    (sum, item) => sum + item.unitPrice.toNumber() * item.quantity,
    0
  )

  let discountAmount = 0
  if (discount) {
    if (!canApplyDiscount(role)) {
      return { error: "Você não tem permissão para aplicar desconto." }
    }
    const rawDiscount =
      discount.type === "PERCENTUAL"
        ? itemsTotal * (discount.value / 100)
        : discount.value
    discountAmount = Math.min(Math.max(rawDiscount, 0), itemsTotal)
  }

  const netTotal = itemsTotal - discountAmount
  const paymentsTotal = payments.reduce((sum, payment) => sum + payment.amount, 0)

  if (Math.abs(netTotal - paymentsTotal) > AMOUNT_TOLERANCE) {
    return { error: "A soma dos pagamentos não bate com o total da comanda." }
  }

  // Desconto reduz proporcionalmente a base de comissao de todo mundo — nao
  // so de um item especifico — senao daria pra "esconder" desconto na
  // comissao de uma profissional so.
  const discountFactor = itemsTotal > 0 ? netTotal / itemsTotal : 1

  const commissionByProfessional = new Map<string, number>()
  for (const item of command.items) {
    const itemBase = item.unitPrice.toNumber() * item.quantity * discountFactor
    const itemCommission = itemBase * (item.commissionPercent.toNumber() / 100)
    commissionByProfessional.set(
      item.professionalId,
      (commissionByProfessional.get(item.professionalId) ?? 0) + itemCommission
    )
  }

  const referenceLabel = `${command.client.name} — ${formatDateBR(command.openedAt)}`

  await prisma.$transaction(async (tx) => {
    if (payments.length > 0) {
      await tx.commandPayment.createMany({
        data: payments.map((payment) => ({
          commandId,
          method: payment.method,
          amount: payment.amount,
        })),
      })
    }

    for (const item of command.items) {
      if (item.type === "PRODUTO" && item.productId) {
        await applyStockDelta(tx, item.productId, -item.quantity)
      }
    }

    for (const [professionalId, amount] of commissionByProfessional) {
      await tx.payable.create({
        data: {
          businessId,
          kind: "COMISSAO",
          status: "PENDENTE",
          amount,
          description: `Comissão — ${referenceLabel}`,
          professionalId,
          commandId,
        },
      })
    }

    await tx.transaction.create({
      data: {
        businessId,
        type: "RECEITA",
        amount: netTotal,
        description: `Comanda — ${referenceLabel}`,
        commandId,
      },
    })

    await tx.command.update({
      where: { id: commandId },
      data: {
        status: "FECHADA",
        closedAt: new Date(),
        discountType: discount ? discount.type : null,
        discountValue: discount ? discount.value : null,
        discountAmount,
      },
    })
  })

  revalidatePath("/agenda")
  revalidatePath("/comandas")

  return {}
}

export type CommandDetailItem = {
  id: string
  label: string
  professionalName: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

export type CommandDetailPayment = {
  id: string
  method: PaymentMethod
  amount: number
}

export type CommandDetail = {
  id: string
  status: CommandStatus
  clientName: string
  openedAt: Date
  professionalNames: string[]
  items: CommandDetailItem[]
  itemsTotal: number
  payments: CommandDetailPayment[]
  canClose: boolean
  closeBlockedReason: string | null
  canAssignOtherProfessional: boolean
  canApplyDiscount: boolean
  discountType: DiscountType | null
  discountValue: number | null
  discountAmount: number
  services: { id: string; name: string; price: number }[]
  products: { id: string; name: string; salePrice: number }[]
  professionals: { id: string; name: string }[]
}

export type CommandDetailResult =
  | { error: string; detail?: undefined }
  | { error?: undefined; detail: CommandDetail }

/** Carrega tudo que o Drawer de comanda precisa: itens, pagamentos, permissoes e opcoes de formulario. */
export async function getCommandDetail(commandId: string): Promise<CommandDetailResult> {
  const { businessId, role } = await requireSessionUser()
  const userProfessionalId =
    role === "PROFESSIONAL" ? await requireProfessionalId() : null

  const command = await prisma.command.findFirst({
    where: { id: commandId, businessId },
    include: {
      client: { select: { name: true } },
      business: { select: { hasReception: true } },
      appointment: { select: { professionalId: true } },
      items: {
        include: {
          service: { select: { name: true } },
          product: { select: { name: true } },
          professional: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      payments: { orderBy: { createdAt: "asc" } },
    },
  })
  if (!command) return { error: "Comanda não encontrada." }

  const professionalIdsInvolved = Array.from(
    new Set(command.items.map((item) => item.professionalId))
  )

  if (!canAccessCommand(role, { professionalIdsInvolved }, userProfessionalId)) {
    return { error: "Você não tem acesso a esta comanda." }
  }

  const isOwnCommand =
    userProfessionalId != null &&
    command.appointment?.professionalId === userProfessionalId
  const canClose = canCloseCommand(role, command.business, isOwnCommand)
  const canAssignOtherProfessional = canAssignItemToOtherProfessional(role)

  const professionalNames = Array.from(
    new Map(
      command.items.map((item) => [item.professional.id, item.professional.name])
    ).values()
  )

  const items: CommandDetailItem[] = command.items.map((item) => ({
    id: item.id,
    label:
      item.type === "SERVICO"
        ? (item.service?.name ?? "Serviço")
        : (item.product?.name ?? "Produto"),
    professionalName: item.professional.name,
    quantity: item.quantity,
    unitPrice: item.unitPrice.toNumber(),
    lineTotal: item.unitPrice.toNumber() * item.quantity,
  }))

  const itemsTotal = items.reduce((sum, item) => sum + item.lineTotal, 0)

  const payments: CommandDetailPayment[] = command.payments.map((payment) => ({
    id: payment.id,
    method: payment.method,
    amount: payment.amount.toNumber(),
  }))

  const [services, products, professionals] = await Promise.all([
    prisma.service.findMany({
      where: { businessId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, price: true },
    }),
    prisma.product.findMany({
      where: { businessId, active: true, saleType: { in: ["VENDA", "AMBOS"] } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, salePrice: true },
    }),
    canAssignOtherProfessional
      ? prisma.professional.findMany({
          where: { businessId, active: true },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
  ])

  return {
    detail: {
      id: command.id,
      status: command.status,
      clientName: command.client.name,
      openedAt: command.openedAt,
      professionalNames,
      items,
      itemsTotal,
      payments,
      canClose,
      closeBlockedReason: canClose
        ? null
        : command.business.hasReception
          ? "Apenas a recepção (OWNER/STAFF) pode fechar esta comanda."
          : "Apenas a profissional responsável por este atendimento pode fechar esta comanda.",
      canAssignOtherProfessional,
      canApplyDiscount: canApplyDiscount(role),
      discountType: command.discountType,
      discountValue: command.discountValue?.toNumber() ?? null,
      discountAmount: command.discountAmount.toNumber(),
      services: services.map((service) => ({
        id: service.id,
        name: service.name,
        price: service.price.toNumber(),
      })),
      products: products.map((product) => ({
        id: product.id,
        name: product.name,
        salePrice: product.salePrice?.toNumber() ?? 0,
      })),
      professionals,
    },
  }
}

export type CommandItemFormState = { error?: string }

/**
 * unitPrice/commissionPercent sao snapshot do Service/Product e do
 * ProfessionalService/ProfessionalProduct no momento da criacao — mesmo
 * padrao defensivo do cron de abertura (open-commands): default 0 de
 * comissao quando o vinculo profissional-servico/produto nao existe, sem
 * derrubar a request.
 */
export async function createCommandItem(
  commandId: string,
  _prevState: CommandItemFormState,
  formData: FormData
): Promise<CommandItemFormState> {
  const { businessId, role } = await requireSessionUser()
  const userProfessionalId =
    role === "PROFESSIONAL" ? await requireProfessionalId() : null

  const command = await prisma.command.findFirst({
    where: { id: commandId, businessId },
    include: { items: { select: { professionalId: true } } },
  })
  if (!command) return { error: "Comanda não encontrada." }
  if (command.status !== "ABERTA") {
    return { error: "Esta comanda não está mais aberta." }
  }

  const professionalIdsInvolved = Array.from(
    new Set(command.items.map((item) => item.professionalId))
  )
  if (!canAccessCommand(role, { professionalIdsInvolved }, userProfessionalId)) {
    return { error: "Você não tem acesso a esta comanda." }
  }

  const itemKey = String(formData.get("item") ?? "")
  const [kind, refId] = itemKey.split(":")
  if ((kind !== "svc" && kind !== "prd") || !refId) {
    return { error: "Selecione um serviço ou produto." }
  }

  const quantity = Math.trunc(Number(formData.get("quantity") ?? "1"))
  if (!Number.isFinite(quantity) || quantity < 1) {
    return { error: "Quantidade inválida." }
  }

  let professionalId: string
  if (canAssignItemToOtherProfessional(role)) {
    professionalId = String(formData.get("professionalId") ?? "").trim()
    if (!professionalId) return { error: "Selecione a profissional responsável." }
  } else {
    if (!userProfessionalId) {
      return { error: "Sua conta não está vinculada a um profissional." }
    }
    professionalId = userProfessionalId
  }

  const professional = await prisma.professional.findFirst({
    where: { id: professionalId, businessId },
    select: { id: true },
  })
  if (!professional) return { error: "Profissional inválido." }

  if (kind === "svc") {
    const service = await prisma.service.findFirst({
      where: { id: refId, businessId },
      select: { id: true, price: true },
    })
    if (!service) return { error: "Serviço inválido." }

    const professionalService = await prisma.professionalService.findFirst({
      where: { professionalId, serviceId: service.id },
      select: { commissionPercent: true },
    })

    await prisma.commandItem.create({
      data: {
        commandId,
        type: "SERVICO",
        serviceId: service.id,
        professionalId,
        quantity,
        unitPrice: service.price,
        commissionPercent: professionalService?.commissionPercent ?? 0,
      },
    })
  } else {
    const product = await prisma.product.findFirst({
      where: { id: refId, businessId, saleType: { in: ["VENDA", "AMBOS"] } },
      select: { id: true, salePrice: true },
    })
    if (!product) return { error: "Produto inválido." }

    const professionalProduct = await prisma.professionalProduct.findFirst({
      where: { professionalId, productId: product.id },
      select: { commissionPercent: true },
    })

    await prisma.commandItem.create({
      data: {
        commandId,
        type: "PRODUTO",
        productId: product.id,
        professionalId,
        quantity,
        unitPrice: product.salePrice ?? 0,
        commissionPercent: professionalProduct?.commissionPercent ?? 0,
      },
    })
  }

  revalidatePath("/agenda")
  revalidatePath("/comandas")

  return {}
}

export type OpenCommandManuallyResult = { commandId?: string; error?: string }

/**
 * Complementa o cron de abertura automatica (open-commands): abre a comanda
 * na hora, antes do horario do agendamento, ou como fallback onde o cron nao
 * roda. Usa a mesma openCommandForAppointment do cron, sem duplicar logica.
 */
export async function openCommandManually(
  appointmentId: string
): Promise<OpenCommandManuallyResult> {
  const { businessId, role } = await requireSessionUser()
  const userProfessionalId =
    role === "PROFESSIONAL" ? await requireProfessionalId() : null

  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, businessId },
    select: {
      status: true,
      professionalId: true,
      command: { select: { id: true } },
    },
  })
  if (!appointment) return { error: "Agendamento não encontrado." }

  if (appointment.status === "AUSENTE" || appointment.status === "CANCELADO") {
    return { error: "Este agendamento não está ativo." }
  }

  if (appointment.command) {
    return { error: "Este agendamento já tem uma comanda." }
  }

  if (!canOpenCommand(role, appointment.professionalId, userProfessionalId)) {
    return { error: "Você não tem permissão para abrir esta comanda." }
  }

  const result = await prisma.$transaction((tx) =>
    openCommandForAppointment(tx, appointmentId)
  )
  if ("error" in result) return { error: result.error }

  revalidatePath("/agenda")
  revalidatePath("/comandas")

  return { commandId: result.commandId }
}
