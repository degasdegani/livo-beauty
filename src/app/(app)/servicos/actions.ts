"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { prisma } from "@/lib/prisma"
import { requireBusinessId } from "@/lib/session"

export async function createService(formData: FormData) {
  const businessId = await requireBusinessId()

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

  await prisma.service.create({
    data: {
      businessId,
      name,
      description: description || null,
      durationMinutes,
      price,
    },
  })

  revalidatePath("/servicos")
  redirect("/servicos")
}

export async function updateService(id: string, formData: FormData) {
  const businessId = await requireBusinessId()

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

  await prisma.service.updateMany({
    where: { id, businessId },
    data: {
      name,
      description: description || null,
      durationMinutes,
      price,
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
