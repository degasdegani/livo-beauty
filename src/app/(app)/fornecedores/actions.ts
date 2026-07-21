"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { prisma } from "@/lib/prisma"
import { canAccessProducts, requireSessionUser } from "@/lib/access"

function optionalText(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim()
  return value || null
}

function parseSupplierFormData(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim()
  const phone = String(formData.get("phone") ?? "").replace(/\D/g, "")

  if (!name) {
    throw new Error("Nome é obrigatório.")
  }

  return {
    name,
    phone: phone || null,
    contactName: optionalText(formData, "contactName"),
    notes: optionalText(formData, "notes"),
  }
}

export async function createSupplier(formData: FormData) {
  const { businessId, role } = await requireSessionUser()
  if (!canAccessProducts(role)) {
    throw new Error("Sem permissão para acessar fornecedores.")
  }

  const data = parseSupplierFormData(formData)

  await prisma.supplier.create({ data: { businessId, ...data } })

  revalidatePath("/fornecedores")
  redirect("/fornecedores")
}

export async function updateSupplier(id: string, formData: FormData) {
  const { businessId, role } = await requireSessionUser()
  if (!canAccessProducts(role)) {
    throw new Error("Sem permissão para acessar fornecedores.")
  }

  const data = parseSupplierFormData(formData)

  const result = await prisma.supplier.updateMany({
    where: { id, businessId },
    data,
  })

  if (result.count === 0) {
    throw new Error("Fornecedor não encontrado ou sem permissão de acesso.")
  }

  revalidatePath("/fornecedores")
  redirect("/fornecedores")
}

export async function toggleSupplierActive(id: string, active: boolean) {
  const { businessId, role } = await requireSessionUser()
  if (!canAccessProducts(role)) {
    throw new Error("Sem permissão para acessar fornecedores.")
  }

  await prisma.supplier.updateMany({
    where: { id, businessId },
    data: { active },
  })

  revalidatePath("/fornecedores")
}
