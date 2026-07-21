import type { Prisma } from "@/generated/prisma/client"

/**
 * Nucleo do ajuste de estoque, compartilhado entre o ajuste manual
 * (produtos/actions.ts) e a baixa automatica no fechamento de comanda.
 * delta positivo ou negativo. O resultado nunca fica negativo (clamp em 0) —
 * divergencia de contagem manual nao deve travar o usuario, mesma regra que
 * ja existia no ajuste manual.
 */
export async function applyStockDelta(
  db: Prisma.TransactionClient,
  productId: string,
  delta: number
): Promise<void> {
  const product = await db.product.findUnique({
    where: { id: productId },
    select: { currentStock: true },
  })
  if (!product) {
    throw new Error("Produto não encontrado.")
  }

  const nextStock = Math.max(0, Math.trunc(product.currentStock + delta))

  await db.product.update({
    where: { id: productId },
    data: { currentStock: nextStock },
  })
}
