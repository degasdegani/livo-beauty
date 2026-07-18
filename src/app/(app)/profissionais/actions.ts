"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { prisma } from "@/lib/prisma"
import { requireBusinessId } from "@/lib/session"
import type { ProfessionalCategory } from "@/generated/prisma/client"

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
