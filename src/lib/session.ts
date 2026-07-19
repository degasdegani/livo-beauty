import { redirect } from "next/navigation"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function requireBusinessId(): Promise<string> {
  const session = await auth()
  const businessId = session?.user?.businessId

  if (!businessId) {
    redirect("/login")
  }

  return businessId
}

export async function requireProfessionalId(): Promise<string> {
  const session = await auth()
  const userId = session?.user?.id
  const businessId = session?.user?.businessId

  if (!userId || !businessId) {
    redirect("/login")
  }

  const professional = await prisma.professional.findFirst({
    where: { userId, businessId },
    select: { id: true },
  })

  if (!professional) {
    throw new Error(
      "Sua conta de usuário não está vinculada a um profissional cadastrado."
    )
  }

  return professional.id
}
