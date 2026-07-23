"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { prisma } from "@/lib/prisma"
import { requireBusinessId } from "@/lib/session"
import { canManageAnamneseSettings, requireSessionUser } from "@/lib/access"
import type { UserRole } from "@/generated/prisma/client"

/**
 * requiresAnamnese so e aceito do formulario se quem enviou for OWNER
 * (canManageAnamneseSettings) e o modulo estiver ligado no negocio — o
 * mesmo checkbox no form so aparece nessa condicao, mas a action nunca
 * confia so na UI: um STAFF que force o campo no payload e ignorado aqui.
 */
async function getRequiresAnamneseUpdate(
  businessId: string,
  role: UserRole,
  formData: FormData
) {
  if (!canManageAnamneseSettings(role)) return {}

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { prontuarioEnabled: true },
  })

  if (!business?.prontuarioEnabled) return {}

  return { requiresAnamnese: formData.get("requiresAnamnese") === "on" }
}

export async function createService(formData: FormData) {
  const { businessId, role } = await requireSessionUser()

  const name = String(formData.get("name") ?? "").trim()
  const description = String(formData.get("description") ?? "").trim()
  const durationMinutes = Number(formData.get("durationMinutes"))
  const price = String(formData.get("price") ?? "").trim()

  if (!name) {
    throw new Error("Nome é obrigatório.")
  }

  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    throw new Error("Duração inválida.")
  }

  if (!/^\d+\.\d{2}$/.test(price) || Number(price) <= 0) {
    throw new Error("Preço inválido.")
  }

  const requiresAnamneseUpdate = await getRequiresAnamneseUpdate(
    businessId,
    role,
    formData
  )

  await prisma.service.create({
    data: {
      businessId,
      name,
      description: description || null,
      durationMinutes,
      price,
      ...requiresAnamneseUpdate,
    },
  })

  revalidatePath("/servicos")
  redirect("/servicos")
}

export async function updateService(id: string, formData: FormData) {
  const { businessId, role } = await requireSessionUser()

  const name = String(formData.get("name") ?? "").trim()
  const description = String(formData.get("description") ?? "").trim()
  const durationMinutes = Number(formData.get("durationMinutes"))
  const price = String(formData.get("price") ?? "").trim()

  if (!name) {
    throw new Error("Nome é obrigatório.")
  }

  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    throw new Error("Duração inválida.")
  }

  if (!/^\d+\.\d{2}$/.test(price) || Number(price) <= 0) {
    throw new Error("Preço inválido.")
  }

  const requiresAnamneseUpdate = await getRequiresAnamneseUpdate(
    businessId,
    role,
    formData
  )

  await prisma.service.updateMany({
    where: { id, businessId },
    data: {
      name,
      description: description || null,
      durationMinutes,
      price,
      ...requiresAnamneseUpdate,
    },
  })

  revalidatePath("/servicos")
  redirect("/servicos")
}

export async function toggleServiceActive(id: string, active: boolean) {
  const businessId = await requireBusinessId()

  await prisma.service.updateMany({
    where: { id, businessId },
    data: { active },
  })

  revalidatePath("/servicos")
}
