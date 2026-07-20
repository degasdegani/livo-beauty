"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { prisma } from "@/lib/prisma"
import { requireBusinessId } from "@/lib/session"
import { getClientsVisibleToUser } from "@/lib/access"
import { parseDateOnlyInput } from "@/lib/datetime"
import type { ClientOrigin } from "@/generated/prisma/client"

const VALID_ORIGINS: ClientOrigin[] = [
  "INDICACAO",
  "INSTAGRAM",
  "GOOGLE",
  "FACHADA",
  "OUTRO",
]

function optionalText(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim()
  return value || null
}

function parseClientFormData(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim()
  const phone = String(formData.get("phone") ?? "").replace(/\D/g, "")
  const birthDateRaw = String(formData.get("birthDate") ?? "").trim()
  const originRaw = String(formData.get("origin") ?? "").trim()
  const addressZipCode =
    optionalText(formData, "addressZipCode")?.replace(/\D/g, "") || null

  if (!name) {
    throw new Error("Nome é obrigatório.")
  }
  if (phone.length < 10) {
    throw new Error("WhatsApp inválido.")
  }
  if (originRaw && !VALID_ORIGINS.includes(originRaw as ClientOrigin)) {
    throw new Error("Origem inválida.")
  }

  const birthDate = birthDateRaw ? parseDateOnlyInput(birthDateRaw) : null
  if (birthDate && Number.isNaN(birthDate.getTime())) {
    throw new Error("Data de nascimento inválida.")
  }

  return {
    name,
    phone,
    birthDate,
    instagram: optionalText(formData, "instagram"),
    origin: (originRaw || null) as ClientOrigin | null,
    addressStreet: optionalText(formData, "addressStreet"),
    addressNumber: optionalText(formData, "addressNumber"),
    addressComplement: optionalText(formData, "addressComplement"),
    addressNeighborhood: optionalText(formData, "addressNeighborhood"),
    addressCity: optionalText(formData, "addressCity"),
    addressState: optionalText(formData, "addressState"),
    addressZipCode,
  }
}

/**
 * fullProfileCompleted vira true aqui porque o usuario passou pela tela
 * completa de cadastro (mesmo que tenha deixado campos opcionais em branco
 * de proposito). O cadastro rapido (so nome+telefone, sem passar por esta
 * tela) acontece via resolveClient em agenda/actions.ts e mantem o valor
 * default false.
 */
export async function createClient(formData: FormData) {
  const businessId = await requireBusinessId()
  const data = parseClientFormData(formData)

  await prisma.client.create({
    data: { businessId, ...data, fullProfileCompleted: true },
  })

  revalidatePath("/clientes")
  redirect("/clientes")
}

export async function updateClient(id: string, formData: FormData) {
  const data = parseClientFormData(formData)

  const result = await prisma.client.updateMany({
    where: { id, ...(await getClientsVisibleToUser()) },
    data: { ...data, fullProfileCompleted: true },
  })

  if (result.count === 0) {
    throw new Error("Cliente não encontrado ou sem permissão de acesso.")
  }

  revalidatePath("/clientes")
  redirect("/clientes")
}
