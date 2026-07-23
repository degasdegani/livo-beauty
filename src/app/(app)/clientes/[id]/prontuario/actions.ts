"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { prisma } from "@/lib/prisma"
import {
  canAccessAnamnese,
  canAccessClientAnamnese,
  requireSessionUser,
} from "@/lib/access"
import { requireProfessionalId } from "@/lib/session"
import { buildAnamneseConsentText } from "@/lib/anamnese-consent"
import type { AnamneseCustomField, AnamneseRecord } from "@/generated/prisma/client"

/**
 * Resolve acesso ao prontuario de UM cliente: modulo ligado + papel + "e meu
 * cliente" (para PROFESSIONAL). Compartilhado por leitura e escrita — nao
 * deixa ler nem escrever dado de um modulo desligado, mesmo que a ficha ja
 * exista de antes.
 */
export async function resolveAnamneseAccess(clientId: string) {
  const { businessId, userId, role } = await requireSessionUser()

  const business = await prisma.business.findUniqueOrThrow({
    where: { id: businessId },
    select: { name: true, prontuarioEnabled: true },
  })

  if (!business.prontuarioEnabled) {
    throw new Error(
      "O módulo de Prontuário/Anamnese não está ativado para este negócio."
    )
  }

  if (!canAccessAnamnese(role)) {
    throw new Error("Você não tem permissão para acessar prontuários.")
  }

  let isOwnClient = role !== "PROFESSIONAL"
  if (role === "PROFESSIONAL") {
    const professionalId = await requireProfessionalId()
    const appointmentCount = await prisma.appointment.count({
      where: { clientId, professionalId },
    })
    isOwnClient = appointmentCount > 0
  }

  if (!canAccessClientAnamnese(role, isOwnClient)) {
    throw new Error("Você não tem acesso ao prontuário deste cliente.")
  }

  const client = await prisma.client.findFirst({
    where: { id: clientId, businessId },
    select: { id: true },
  })

  if (!client) {
    throw new Error("Cliente não encontrado.")
  }

  return { businessId, businessName: business.name, userId }
}

export async function getAnamneseRecord(
  clientId: string
): Promise<AnamneseRecord | null> {
  await resolveAnamneseAccess(clientId)

  return prisma.anamneseRecord.findUnique({ where: { clientId } })
}

export async function getAnamneseCustomFields(
  clientId: string
): Promise<AnamneseCustomField[]> {
  const { businessId } = await resolveAnamneseAccess(clientId)

  return prisma.anamneseCustomField.findMany({
    where: { businessId },
    orderBy: { order: "asc" },
  })
}

function optionalText(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim()
  return value || null
}

export async function saveAnamneseRecord(clientId: string, formData: FormData) {
  const { businessId, businessName, userId } = await resolveAnamneseAccess(
    clientId
  )

  const consentChecked = formData.get("consent") === "on"
  if (!consentChecked) {
    throw new Error(
      "É necessário marcar a autorização de consentimento para salvar a ficha."
    )
  }

  const healthData = {
    allergies: optionalText(formData, "allergies"),
    medications: optionalText(formData, "medications"),
    healthConditions: optionalText(formData, "healthConditions"),
    previousProcedures: optionalText(formData, "previousProcedures"),
    contraindications: optionalText(formData, "contraindications"),
    notes: optionalText(formData, "notes"),
  }

  const customFieldDefs = await prisma.anamneseCustomField.findMany({
    where: { businessId },
  })

  const customFieldValues: Record<string, string | boolean | null> = {}
  for (const field of customFieldDefs) {
    const key = `custom_${field.id}`
    customFieldValues[field.id] =
      field.type === "BOOLEAN"
        ? formData.get(key) === "on"
        : optionalText(formData, key)
  }

  const consentText = buildAnamneseConsentText(businessName)

  const headerList = await headers()
  const ipAddress =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || null
  const userAgent = headerList.get("user-agent") || null

  await prisma.$transaction(async (tx) => {
    const record = await tx.anamneseRecord.upsert({
      where: { clientId },
      create: {
        businessId,
        clientId,
        createdByUserId: userId,
        ...healthData,
        customFields: customFieldValues,
      },
      update: { ...healthData, customFields: customFieldValues },
    })

    await tx.anamneseConsent.create({
      data: {
        anamneseRecordId: record.id,
        consentText,
        dataSnapshot: { ...healthData, customFields: customFieldValues },
        ipAddress,
        userAgent,
        registeredByUserId: userId,
      },
    })
  })

  revalidatePath(`/clientes/${clientId}/prontuario`)
  revalidatePath(`/clientes/${clientId}/editar`)
  redirect(`/clientes/${clientId}/editar?prontuario=salvo`)
}
