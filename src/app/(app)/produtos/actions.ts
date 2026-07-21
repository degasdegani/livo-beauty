"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { prisma } from "@/lib/prisma"
import { canAccessProducts, canViewCostPrice, requireSessionUser } from "@/lib/access"
import type { ProductSaleType } from "@/generated/prisma/client"

const VALID_SALE_TYPES: ProductSaleType[] = ["VENDA", "CONSUMO_INTERNO", "AMBOS"]

function parseProductFormData(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim()
  const sku = String(formData.get("sku") ?? "").trim()
  const unit = String(formData.get("unit") ?? "").trim()
  const saleTypeRaw = String(formData.get("saleType") ?? "").trim()
  const salePriceRaw = String(formData.get("salePrice") ?? "").trim()
  const currentStockRaw = String(formData.get("currentStock") ?? "").trim()
  const lowStockThresholdRaw = String(
    formData.get("lowStockThreshold") ?? ""
  ).trim()

  if (!name) {
    throw new Error("Nome é obrigatório.")
  }
  if (!unit) {
    throw new Error("Unidade é obrigatória.")
  }
  if (!VALID_SALE_TYPES.includes(saleTypeRaw as ProductSaleType)) {
    throw new Error("Tipo de venda inválido.")
  }

  const saleType = saleTypeRaw as ProductSaleType

  let salePrice: string | null = null
  if (saleType !== "CONSUMO_INTERNO") {
    if (!/^\d+\.\d{2}$/.test(salePriceRaw) || Number(salePriceRaw) <= 0) {
      throw new Error("Preço de venda inválido.")
    }
    salePrice = salePriceRaw
  }

  const currentStock = Number(currentStockRaw)
  if (!Number.isFinite(currentStock) || currentStock < 0) {
    throw new Error("Estoque inválido.")
  }

  const lowStockThreshold = Number(lowStockThresholdRaw)
  if (!Number.isFinite(lowStockThreshold) || lowStockThreshold < 0) {
    throw new Error("Limite de estoque baixo inválido.")
  }

  return {
    name,
    sku: sku || null,
    unit,
    saleType,
    salePrice,
    currentStock: Math.trunc(currentStock),
    lowStockThreshold: Math.trunc(lowStockThreshold),
  }
}

export async function createProduct(formData: FormData) {
  const { businessId, role } = await requireSessionUser()
  if (!canAccessProducts(role)) {
    throw new Error("Sem permissão para acessar produtos.")
  }

  const data = parseProductFormData(formData)

  await prisma.product.create({ data: { businessId, ...data } })

  revalidatePath("/produtos")
  redirect("/produtos")
}

export async function updateProduct(id: string, formData: FormData) {
  const { businessId, role } = await requireSessionUser()
  if (!canAccessProducts(role)) {
    throw new Error("Sem permissão para acessar produtos.")
  }

  const data = parseProductFormData(formData)

  const result = await prisma.product.updateMany({
    where: { id, businessId },
    data,
  })

  if (result.count === 0) {
    throw new Error("Produto não encontrado ou sem permissão de acesso.")
  }

  revalidatePath("/produtos")
  redirect("/produtos")
}

export async function toggleProductActive(id: string, active: boolean) {
  const { businessId, role } = await requireSessionUser()
  if (!canAccessProducts(role)) {
    throw new Error("Sem permissão para acessar produtos.")
  }

  await prisma.product.updateMany({
    where: { id, businessId },
    data: { active },
  })

  revalidatePath("/produtos")
}

/**
 * delta positivo ou negativo. O resultado nunca fica negativo (clamp em 0) —
 * divergencia de contagem manual nao deve travar o usuario. reason e
 * recebido so para o formulario fazer sentido pro usuario que esta ajustando;
 * nao ha tabela de historico nesta fase (fora do escopo do MVP), entao o
 * valor nao e persistido.
 */
export async function adjustStock(productId: string, formData: FormData) {
  const { businessId, role } = await requireSessionUser()
  if (!canAccessProducts(role)) {
    throw new Error("Sem permissão para acessar produtos.")
  }

  const deltaRaw = String(formData.get("delta") ?? "").trim()
  const delta = Number(deltaRaw)

  if (!Number.isFinite(delta) || delta === 0) {
    throw new Error("Informe uma quantidade de ajuste diferente de zero.")
  }

  const product = await prisma.product.findFirst({
    where: { id: productId, businessId },
    select: { currentStock: true },
  })
  if (!product) {
    throw new Error("Produto não encontrado.")
  }

  const nextStock = Math.max(0, Math.trunc(product.currentStock + delta))

  await prisma.product.update({
    where: { id: productId },
    data: { currentStock: nextStock },
  })

  revalidatePath("/produtos")
  revalidatePath(`/produtos/${productId}/editar`)
}

export async function linkProductSupplier(productId: string, formData: FormData) {
  const { businessId, role } = await requireSessionUser()
  if (!canAccessProducts(role) || !canViewCostPrice(role)) {
    throw new Error("Sem permissão para gerenciar fornecedores do produto.")
  }

  const supplierId = String(formData.get("supplierId") ?? "").trim()
  const costPriceRaw = String(formData.get("costPrice") ?? "").trim()
  const isPrimary = formData.get("isPrimary") === "on"

  if (!supplierId) {
    throw new Error("Selecione um fornecedor.")
  }
  if (!/^\d+\.\d{2}$/.test(costPriceRaw) || Number(costPriceRaw) <= 0) {
    throw new Error("Preço de custo inválido.")
  }

  const product = await prisma.product.findFirst({
    where: { id: productId, businessId },
    select: { id: true },
  })
  if (!product) {
    throw new Error("Produto não encontrado.")
  }

  const supplier = await prisma.supplier.findFirst({
    where: { id: supplierId, businessId },
    select: { id: true },
  })
  if (!supplier) {
    throw new Error("Fornecedor inválido.")
  }

  await prisma.$transaction(async (tx) => {
    if (isPrimary) {
      await tx.productSupplier.updateMany({
        where: { productId },
        data: { isPrimary: false },
      })
    }

    await tx.productSupplier.upsert({
      where: { productId_supplierId: { productId, supplierId } },
      create: { productId, supplierId, costPrice: costPriceRaw, isPrimary },
      update: { costPrice: costPriceRaw, isPrimary },
    })
  })

  revalidatePath(`/produtos/${productId}/editar`)
  revalidatePath("/produtos")
}

export async function unlinkProductSupplier(productSupplierId: string) {
  const { businessId, role } = await requireSessionUser()
  if (!canAccessProducts(role) || !canViewCostPrice(role)) {
    throw new Error("Sem permissão para gerenciar fornecedores do produto.")
  }

  const link = await prisma.productSupplier.findFirst({
    where: { id: productSupplierId, product: { businessId } },
    select: { id: true, productId: true },
  })
  if (!link) {
    throw new Error("Vínculo não encontrado.")
  }

  await prisma.productSupplier.delete({ where: { id: link.id } })

  revalidatePath(`/produtos/${link.productId}/editar`)
  revalidatePath("/produtos")
}
