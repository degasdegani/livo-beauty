"use server"

import { revalidatePath } from "next/cache"

import { prisma } from "@/lib/prisma"
import { canManageAnamneseSettings, requireSessionUser } from "@/lib/access"
import { MAX_ANAMNESE_CUSTOM_FIELDS } from "./anamnese-field-constants"
import type { AnamneseCustomField, AnamneseFieldType } from "@/generated/prisma/client"

export async function listAnamneseCustomFields(): Promise<AnamneseCustomField[]> {
  const { businessId, role } = await requireSessionUser()

  if (!canManageAnamneseSettings(role)) {
    throw new Error(
      "Você não tem permissão para configurar campos customizáveis."
    )
  }

  return prisma.anamneseCustomField.findMany({
    where: { businessId },
    orderBy: { order: "asc" },
  })
}

export async function createAnamneseCustomField(formData: FormData) {
  const { businessId, role } = await requireSessionUser()

  if (!canManageAnamneseSettings(role)) {
    throw new Error(
      "Você não tem permissão para configurar campos customizáveis."
    )
  }

  const label = String(formData.get("label") ?? "").trim()
  const type = String(formData.get("type") ?? "")

  if (!label) {
    throw new Error("Informe um nome para o campo.")
  }

  if (type !== "TEXT" && type !== "BOOLEAN") {
    throw new Error("Tipo de campo inválido.")
  }

  const count = await prisma.anamneseCustomField.count({ where: { businessId } })

  if (count >= MAX_ANAMNESE_CUSTOM_FIELDS) {
    throw new Error(
      `Limite de ${MAX_ANAMNESE_CUSTOM_FIELDS} campos customizáveis atingido.`
    )
  }

  await prisma.anamneseCustomField.create({
    data: {
      businessId,
      label,
      type: type as AnamneseFieldType,
      order: count,
    },
  })

  revalidatePath("/configuracoes")
}

export async function deleteAnamneseCustomField(fieldId: string) {
  const { businessId, role } = await requireSessionUser()

  if (!canManageAnamneseSettings(role)) {
    throw new Error(
      "Você não tem permissão para configurar campos customizáveis."
    )
  }

  const result = await prisma.anamneseCustomField.deleteMany({
    where: { id: fieldId, businessId },
  })

  if (result.count === 0) {
    throw new Error("Campo não encontrado.")
  }

  revalidatePath("/configuracoes")
}
