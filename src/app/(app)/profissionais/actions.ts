"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { prisma } from "@/lib/prisma"
import { requireBusinessId } from "@/lib/session"
import type { ProfessionalCategory } from "@/generated/prisma/client"

// Decimal(5,2): 0 a 100, ate 2 casas decimais (ex: "40", "37.5", "37.50").
function isValidCommissionPercent(raw: string): boolean {
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(raw)) return false
  const value = Number(raw)
  return value >= 0 && value <= 100
}

export async function createProfessional(formData: FormData) {
  const businessId = await requireBusinessId()

  const name = String(formData.get("name") ?? "").trim()
  const phone = String(formData.get("phone") ?? "").replace(/\D/g, "")
  const category = String(formData.get("category") ?? "")

  if (!name) {
    throw new Error("Nome é obrigatório.")
  }

  if (category !== "RECEPTION" && category !== "SERVICE_PROVIDER") {
    throw new Error("Categoria inválida.")
  }

  await prisma.professional.create({
    data: {
      businessId,
      name,
      phone: phone || null,
      category: category as ProfessionalCategory,
    },
  })

  revalidatePath("/profissionais")
  redirect("/profissionais")
}

export async function updateProfessional(id: string, formData: FormData) {
  const businessId = await requireBusinessId()

  const name = String(formData.get("name") ?? "").trim()
  const phone = String(formData.get("phone") ?? "").replace(/\D/g, "")
  const category = String(formData.get("category") ?? "")

  if (!name) {
    throw new Error("Nome é obrigatório.")
  }

  if (category !== "RECEPTION" && category !== "SERVICE_PROVIDER") {
    throw new Error("Categoria inválida.")
  }

  await prisma.professional.updateMany({
    where: { id, businessId },
    data: {
      name,
      phone: phone || null,
      category: category as ProfessionalCategory,
    },
  })

  revalidatePath("/profissionais")
  redirect("/profissionais")
}

export async function toggleProfessionalActive(id: string, active: boolean) {
  const businessId = await requireBusinessId()

  await prisma.professional.updateMany({
    where: { id, businessId },
    data: { active },
  })

  revalidatePath("/profissionais")
}

export async function addProfessionalService(
  professionalId: string,
  formData: FormData
) {
  const businessId = await requireBusinessId()

  const serviceId = String(formData.get("serviceId") ?? "").trim()
  const commissionPercent = String(
    formData.get("commissionPercent") ?? ""
  ).trim()

  if (!serviceId) {
    throw new Error("Selecione um serviço.")
  }

  if (!isValidCommissionPercent(commissionPercent)) {
    throw new Error("Comissão inválida.")
  }

  const [professional, service] = await Promise.all([
    prisma.professional.findFirst({
      where: { id: professionalId, businessId },
    }),
    prisma.service.findFirst({ where: { id: serviceId, businessId } }),
  ])

  if (!professional || !service) {
    throw new Error("Profissional ou serviço inválido.")
  }

  if (professional.category !== "SERVICE_PROVIDER") {
    throw new Error("Recepção não vincula serviços.")
  }

  await prisma.professionalService.create({
    data: {
      professionalId,
      serviceId,
      commissionPercent,
    },
  })

  revalidatePath(`/profissionais/${professionalId}/editar`)
}

export async function updateProfessionalServiceCommission(
  professionalId: string,
  professionalServiceId: string,
  formData: FormData
) {
  const businessId = await requireBusinessId()

  const commissionPercent = String(
    formData.get("commissionPercent") ?? ""
  ).trim()

  if (!isValidCommissionPercent(commissionPercent)) {
    throw new Error("Comissão inválida.")
  }

  await prisma.professionalService.updateMany({
    where: {
      id: professionalServiceId,
      professionalId,
      professional: { businessId },
    },
    data: { commissionPercent },
  })

  revalidatePath(`/profissionais/${professionalId}/editar`)
}

export async function removeProfessionalService(
  professionalId: string,
  professionalServiceId: string
) {
  const businessId = await requireBusinessId()

  await prisma.professionalService.deleteMany({
    where: {
      id: professionalServiceId,
      professionalId,
      professional: { businessId },
    },
  })

  revalidatePath(`/profissionais/${professionalId}/editar`)
}
