import { notFound } from "next/navigation"

import { canAccessProducts, requireSessionUser } from "@/lib/access"
import { createProduct } from "../actions"
import { ProductForm } from "../product-form"

export default async function NovoProdutoPage() {
  const { role } = await requireSessionUser()
  if (!canAccessProducts(role)) {
    notFound()
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2 font-medium text-foreground">Novo produto</h1>
        <p className="text-body-sm text-foreground-secondary">
          Cadastre um produto do estoque.
        </p>
      </div>

      <ProductForm
        action={createProduct}
        submitLabel="Salvar produto"
        cancelHref="/produtos"
      />
    </div>
  )
}
