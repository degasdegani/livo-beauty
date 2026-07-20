import { redirect } from "next/navigation"

import { auth } from "@/lib/auth"
import { requireProfessionalId } from "@/lib/session"
import type { Prisma } from "@/generated/prisma/client"

async function requireSessionUser() {
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
