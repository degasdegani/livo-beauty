import { redirect } from "next/navigation"

import { auth } from "@/lib/auth"
import { requireProfessionalId } from "@/lib/session"
import type { Prisma, UserRole } from "@/generated/prisma/client"

export async function requireSessionUser() {
  const session = await auth()
  const userId = session?.user?.id
  const businessId = session?.user?.businessId
  const role = session?.user?.role

  if (!userId || !businessId || !role) {
    redirect("/login")
  }

  return { userId, businessId, role }
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

/** So OWNER/STAFF podem aplicar desconto — independente de hasReception, diferente de canCloseCommand. */
export function canApplyDiscount(role: UserRole): boolean {
  return role === "OWNER" || role === "STAFF"
}

/**
 * Contas a pagar (Payable) sao dado financeiro sensivel do negocio — so o
 * OWNER ve a tela e registra pagamento, mesma regra pros dois casos
 * (diferente de canApplyDiscount, que inclui STAFF).
 */
export function canManagePayables(role: UserRole): boolean {
  return role === "OWNER"
}

/**
 * Tela /profissionais (criar, editar, ativar/desativar, % de comissao) e
 * gestao de equipe e remuneracao — so o OWNER acessa, mesma regra de
 * canManagePayables. STAFF e PROFESSIONAL nao podem ver nem editar dados
 * de outros profissionais.
 */
export function canManageProfessionals(role: UserRole): boolean {
  return role === "OWNER"
}

/**
 * Prontuario/Anamnese e dado sensivel de saude (LGPD) — STAFF nao acessa
 * conteudo clinico, decisao de produto ja fechada, nao e omissao.
 */
export function canAccessAnamnese(role: UserRole): boolean {
  return role === "OWNER" || role === "PROFESSIONAL"
}

/**
 * OWNER ve o prontuario de qualquer cliente do negocio. PROFESSIONAL so ve o
 * de clientes com ao menos um agendamento com ela (mesmo padrao de
 * getClientsVisibleToUser). STAFF nunca acessa — retorna filtro que nao bate
 * com nenhum cliente, nunca undefined/sem filtro.
 */
export async function getAnamneseClientFilterForUser(): Promise<Prisma.AnamneseRecordWhereInput> {
  const { businessId, role } = await requireSessionUser()

  if (role === "OWNER") {
    return { businessId }
  }

  if (role === "PROFESSIONAL") {
    const professionalId = await requireProfessionalId()
    return { businessId, client: { appointments: { some: { professionalId } } } }
  }

  return { clientId: { in: [] } }
}

/**
 * Checagem pontual de "posso acessar o prontuario DESTE cliente" — diferente
 * de getAnamneseClientFilterForUser, que e para listar/filtrar. O chamador
 * calcula isOwnClient (prisma.appointment.count > 0), mesmo padrao de
 * canCloseCommand/canOpenCommand: funcao pura, sem query dentro dela.
 */
export function canAccessClientAnamnese(
  role: UserRole,
  isOwnClient: boolean,
): boolean {
  if (role === "OWNER") return true
  if (role === "PROFESSIONAL") return isOwnClient
  return false
}

/**
 * Ligar/desligar o modulo (Business.prontuarioEnabled) e marcar
 * Service.requiresAnamnese sao decisao de configuracao de negocio com
 * implicacao de LGPD (habilita captura de dado de saude) — so o OWNER mexe,
 * mesma regra de canManagePayables. Diferente de canAccessAnamnese, que e
 * sobre LER a ficha clinica, nao sobre configurar o modulo.
 */
export function canManageAnamneseSettings(role: UserRole): boolean {
  return role === "OWNER"
}

/**
 * Gerar/regenerar o codigo de convite e decisao de seguranca do negocio
 * (quem pode trazer profissionais pra dentro do sistema) — mesma regra de
 * canManageAnamneseSettings.
 */
export function canManageInviteCode(role: UserRole): boolean {
  return role === "OWNER"
}

/**
 * Todo role autenticado acessa alguma versao do dashboard — o conteudo
 * interno e que varia por role (ver canViewDashboardFinancials). Mantido
 * como funcao, e nao um acesso irrestrito implicito, pelo mesmo motivo dos
 * outros gates deste arquivo: nunca pular a checagem, mesmo quando ela hoje
 * sempre retorna true.
 */
export function canAccessDashboard(role: UserRole): boolean {
  return true
}

/**
 * KPIs de receita, grafico e desempenho de profissionais no dashboard sao
 * dado financeiro sensivel — so o OWNER ve. Separado de canManagePayables
 * porque e uma tela diferente (resumo do negocio vs. gestao de contas a
 * pagar), mesmo que hoje as duas regras coincidam.
 */
export function canViewDashboardFinancials(role: UserRole): boolean {
  return role === "OWNER"
}

/**
 * Assinatura (Subscription) — status do trial, link de checkout do Asaas —
 * e dado financeiro do negocio, mesma sensibilidade de canManagePayables:
 * so o OWNER ve. Funcao separada (nao reaproveita canManagePayables) porque
 * o recurso e outro (Subscription, nao Payable); a regra so coincide hoje.
 */
export function canManageSubscription(role: UserRole): boolean {
  return role === "OWNER"
}
