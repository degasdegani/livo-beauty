import { redirect } from "next/navigation"

import { auth } from "@/lib/auth"
import { requireProfessionalId } from "@/lib/session"
import type { Prisma, UserRole } from "@/generated/prisma/client"

export async function requireSessionUser() {
  const session = await auth()
  const businessId = session?.user?.businessId
  const role = session?.user?.role

  if (!businessId || !role) {
    redirect("/login")
  }

  return { businessId, role }
}

/**
 * OWNER/STAFF veem todos os clientes do negocio. PROFESSIONAL ve apenas
 * clientes com ao menos um agendamento com ele.
 */
export async function getClientsVisibleToUser(): Promise<Prisma.ClientWhereInput> {
  const { businessId, role } = await requireSessionUser()

  if (role === "PROFESSIONAL") {
    const professionalId = await requireProfessionalId()
    return { businessId, appointments: { some: { professionalId } } }
  }

  return { businessId }
}

/**
 * OWNER/STAFF veem todos os agendamentos do negocio. PROFESSIONAL ve apenas
 * os proprios agendamentos.
 */
export async function getAppointmentsVisibleToUser(): Promise<Prisma.AppointmentWhereInput> {
  const { businessId, role } = await requireSessionUser()

  if (role === "PROFESSIONAL") {
    const professionalId = await requireProfessionalId()
    return { businessId, professionalId }
  }

  return { businessId }
}

/**
 * Produtos/Estoque e Fornecedores nao tem recorte por profissional (nao sao
 * dados "do atendimento") — e um modulo de gestao, por isso o controle e
 * so um booleano de papel, nao um filtro de Prisma.WhereInput como os acima.
 */
export function canAccessProducts(role: UserRole): boolean {
  return role === "OWNER" || role === "STAFF"
}

/** Preco de custo (fornecedor) e informacao sensivel de negocio — so o OWNER ve. */
export function canViewCostPrice(role: UserRole): boolean {
  return role === "OWNER"
}

/**
 * OWNER/STAFF acessam qualquer comanda. PROFESSIONAL so acessa comandas onde
 * ela esta entre os profissionais envolvidos (professionalIdsInvolved).
 */
export function canAccessCommand(
  role: UserRole,
  command: { professionalIdsInvolved: string[] },
  userProfessionalId: string | null,
): boolean {
  if (role === "OWNER" || role === "STAFF") return true
  if (role === "PROFESSIONAL") {
    return userProfessionalId != null && command.professionalIdsInvolved.includes(userProfessionalId)
  }
  return false
}

/** OWNER/STAFF podem atribuir um item a qualquer profissional. PROFESSIONAL so a si mesma. */
export function canAssignItemToOtherProfessional(role: UserRole): boolean {
  return role === "OWNER" || role === "STAFF"
}

/**
 * OWNER/STAFF sempre podem fechar a comanda. PROFESSIONAL so pode fechar
 * quando o negocio nao tem recepcao (hasReception false) e a comanda e dela.
 */
export function canCloseCommand(
  role: UserRole,
  business: { hasReception: boolean },
  isOwnCommand: boolean,
): boolean {
  if (role === "OWNER" || role === "STAFF") return true
  if (role === "PROFESSIONAL") return !business.hasReception && isOwnCommand
  return false
}

/**
 * OWNER/STAFF podem abrir a comanda de qualquer agendamento. PROFESSIONAL so
 * pode abrir a comanda do proprio agendamento (mesma regra de "e dela" usada
 * em isOwnCommand no fechamento).
 */
export function canOpenCommand(
  role: UserRole,
  appointmentProfessionalId: string,
  userProfessionalId: string | null,
): boolean {
  if (role === "OWNER" || role === "STAFF") return true
  if (role === "PROFESSIONAL") {
    return userProfessionalId != null && userProfessionalId === appointmentProfessionalId
  }
  return false
}
