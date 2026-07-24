"use server"

import { randomUUID } from "node:crypto"
import { revalidatePath } from "next/cache"

import { prisma } from "@/lib/prisma"
import { canManageInviteCode, requireSessionUser } from "@/lib/access"

export async function getInviteCode(): Promise<string | null> {
  const { businessId, role } = await requireSessionUser()

  if (!canManageInviteCode(role)) {
    throw new Error("Você não tem permissão para ver o código de convite.")
  }

  const business = await prisma.business.findUniqueOrThrow({
    where: { id: businessId },
    select: { inviteCode: true },
  })

  return business.inviteCode
}

export async function generateInviteCode(): Promise<string> {
  const { businessId, role } = await requireSessionUser()

  if (!canManageInviteCode(role)) {
    throw new Error("Você não tem permissão para gerar o código de convite.")
  }

  const inviteCode = randomUUID()

  await prisma.business.update({
    where: { id: businessId },
    data: { inviteCode },
  })

  revalidatePath("/configuracoes")

  return inviteCode
}
