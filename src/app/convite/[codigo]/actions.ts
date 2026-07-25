"use server"

import bcrypt from "bcryptjs"
import { redirect } from "next/navigation"

import { prisma } from "@/lib/prisma"

export type SignupFormState = { error?: string }

export async function signupProfessional(
  codigo: string,
  _prevState: SignupFormState,
  formData: FormData
): Promise<SignupFormState> {
  const business = await prisma.business.findUnique({
    where: { inviteCode: codigo },
  })

  if (!business) {
    return { error: "Link de convite inválido ou expirado." }
  }

  const name = String(formData.get("name") ?? "").trim()
  const email = String(formData.get("email") ?? "").trim()
  const phone = String(formData.get("phone") ?? "").trim()
  const password = String(formData.get("password") ?? "")

  if (!name) {
    return { error: "Informe seu nome." }
  }

  if (!/\S+@\S+\.\S+/.test(email)) {
    return { error: "Informe um e-mail válido." }
  }

  if (password.length < 8) {
    return { error: "A senha deve ter no mínimo 8 caracteres." }
  }

  const existingUser = await prisma.user.findUnique({ where: { email } })

  if (existingUser) {
    return {
      error: "Este e-mail já está em uso. Tente outro ou faça login.",
    }
  }

  const passwordHash = await bcrypt.hash(password, 10)

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        password: passwordHash,
        role: "PROFESSIONAL",
        businessId: business.id,
      },
    })

    await tx.professional.create({
      data: {
        businessId: business.id,
        userId: user.id,
        name,
        phone: phone || null,
        category: "SERVICE_PROVIDER",
        active: true,
      },
    })
  })

  redirect("/login?cadastro=sucesso")
}
