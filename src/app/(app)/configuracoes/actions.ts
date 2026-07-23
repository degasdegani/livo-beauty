"use server"

import { revalidatePath } from "next/cache"
import { unstable_rethrow } from "next/navigation"

import { prisma } from "@/lib/prisma"
import { canManageAnamneseSettings, requireSessionUser } from "@/lib/access"

export type UpdateProntuarioEnabledResult = { success: boolean; error?: string }

export async function updateProntuarioEnabled(
  enabled: boolean
): Promise<UpdateProntuarioEnabledResult> {
  try {
    const { businessId, role } = await requireSessionUser()

    if (!canManageAnamneseSettings(role)) {
      return {
        success: false,
        error: "Você não tem permissão para alterar essa configuração.",
      }
    }

    await prisma.business.update({
      where: { id: businessId },
      data: { prontuarioEnabled: enabled },
    })

    revalidatePath("/configuracoes")
    revalidatePath("/servicos")

    return { success: true }
  } catch (error) {
    unstable_rethrow(error)
    const message =
      error instanceof Error ? error.message : "Erro ao atualizar configuração."
    return { success: false, error: message }
  }
}
