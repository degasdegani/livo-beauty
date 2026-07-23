import { NextResponse } from "next/server"
import { get } from "@vercel/blob"

import { prisma } from "@/lib/prisma"
import { resolveAnamneseAccess } from "@/app/(app)/clientes/[id]/prontuario/actions"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ photoId: string }> }
) {
  const { photoId } = await params

  const notFound = () =>
    NextResponse.json({ error: "Foto não encontrada." }, { status: 404 })

  const photo = await prisma.anamnesePhoto.findUnique({
    where: { id: photoId },
  })

  if (!photo) {
    return notFound()
  }

  let userId: string
  try {
    // resolveAnamneseAccess redireciona para /login quando nao ha sessao; aqui
    // qualquer falha (sessao ausente, modulo desligado, sem permissao) cai no
    // mesmo 404 generico de "nao existe", em vez de deixar o redirect vazar
    // pra uma rota de imagem. Mesmo status e mesma mensagem do caso "foto nao
    // existe no banco" de proposito: nao da pra um cliente distinguir "nunca
    // existiu" de "existe, mas nao e seu" (oraculo de enumeracao cross-tenant).
    ;({ userId } = await resolveAnamneseAccess(photo.clientId))
  } catch (error) {
    console.error("Erro ao resolver acesso a foto de anamnese:", error)
    return notFound()
  }

  await prisma.anamneseAccessLog.create({
    data: {
      businessId: photo.businessId,
      clientId: photo.clientId,
      photoId: photo.id,
      userId,
    },
  })

  const result = await get(photo.blobPathname, {
    access: "private",
    token: process.env.ANAMNESE_BLOB_READ_WRITE_TOKEN,
    storeId: process.env.ANAMNESE_BLOB_STORE_ID,
  })

  if (!result || result.statusCode !== 200) {
    return notFound()
  }

  return new Response(result.stream, {
    headers: {
      "content-type": result.blob.contentType,
      "cache-control": "private, no-store",
    },
  })
}
