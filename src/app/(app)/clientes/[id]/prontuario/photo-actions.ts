"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { put } from "@vercel/blob"

import { prisma } from "@/lib/prisma"
import { resolveAnamneseAccess } from "./actions"
import type { AnamnesePhotoKind } from "@/generated/prisma/client"

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
const PHOTO_KINDS: AnamnesePhotoKind[] = ["ANTES", "DEPOIS", "GERAL"]

function isAnamnesePhotoKind(value: string): value is AnamnesePhotoKind {
  return (PHOTO_KINDS as string[]).includes(value)
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_")
}

export async function uploadAnamnesePhoto(clientId: string, formData: FormData) {
  const { businessId, userId } = await resolveAnamneseAccess(clientId)

  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Selecione um arquivo de imagem para enviar.")
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error(
      "Formato de arquivo não suportado. Envie um JPEG, PNG ou WEBP."
    )
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error("Arquivo muito grande. O tamanho máximo é 10MB.")
  }

  const kindValue = String(formData.get("kind") ?? "")
  if (!isAnamnesePhotoKind(kindValue)) {
    throw new Error("Tipo de foto inválido.")
  }

  const appointmentIdRaw = String(formData.get("appointmentId") ?? "").trim()
  let appointmentId: string | null = null
  if (appointmentIdRaw) {
    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentIdRaw, clientId, businessId },
      select: { id: true },
    })
    if (!appointment) {
      throw new Error("Atendimento inválido para este cliente.")
    }
    appointmentId = appointment.id
  }

  const record = await prisma.anamneseRecord.findUnique({
    where: { clientId },
    select: { id: true },
  })

  if (!record) {
    throw new Error(
      "É necessário preencher a ficha de anamnese antes de anexar fotos."
    )
  }

  const pathname = `anamnese/${businessId}/${clientId}/${Date.now()}-${sanitizeFileName(file.name)}`

  const blob = await put(pathname, file, {
    access: "private",
    contentType: file.type,
    token: process.env.ANAMNESE_BLOB_READ_WRITE_TOKEN,
    storeId: process.env.ANAMNESE_BLOB_STORE_ID,
  })

  await prisma.anamnesePhoto.create({
    data: {
      businessId,
      clientId,
      anamneseRecordId: record.id,
      appointmentId,
      kind: kindValue,
      blobPathname: blob.pathname,
      uploadedByUserId: userId,
    },
  })

  revalidatePath(`/clientes/${clientId}/prontuario`)
  redirect(`/clientes/${clientId}/prontuario`)
}
