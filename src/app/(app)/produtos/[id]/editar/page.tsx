import { notFound } from "next/navigation"

import { prisma } from "@/lib/prisma"
import {
  canAccessProducts,
  canViewCostPrice,
  requireSessionUser,
} from "@/lib/access"
import { formatDecimalToBRL } from "@/lib/masks"
import {
  adjustStock,
  linkProductSupplier,
  unlinkProductSupplier,
  updateProduct,
} from "../../actions"
import { ProductForm } from "../../product-form"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Badge } from "@/components/ui/badge"

export default async function EditarProdutoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { businessId, role } = await requireSessionUser()
  if (!canAccessProducts(role)) {
    notFound()
  }

  const showCostPrice = canViewCostPrice(role)

  const product = await prisma.product.findFirst({
    where: { id, businessId },
    select: {
      id: true,
      name: true,
      sku: true,
      unit: true,
      saleType: true,
      salePrice: true,
      currentStock: true,
      lowStockThreshold: true,
      suppliers: {
        select: {
          id: true,
          isPrimary: true,
          ...(showCostPrice ? { costPrice: true } : {}),
          supplier: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  })

  if (!product) {
    notFound()
  }

  const allSuppliers = showCostPrice
    ? await prisma.supplier.findMany({
        where: { businessId, active: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      })
    : []

  const updateProductWithId = updateProduct.bind(null, product.id)
  const adjustStockWithId = adjustStock.bind(null, product.id)
  const linkSupplierWithId = linkProductSupplier.bind(null, product.id)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2 font-medium text-foreground">
          Editar produto
        </h1>
        <p className="text-body-sm text-foreground-secondary">
          Atualize os dados de {product.name}.
        </p>
      </div>

      <ProductForm
        action={updateProductWithId}
        submitLabel="Salvar alterações"
        cancelHref="/produtos"
        stockLabel="Estoque atual"
        defaultValues={{
          name: product.name,
          sku: product.sku ?? "",
          unit: product.unit,
          saleType: product.saleType,
          salePrice: product.salePrice?.toString() ?? "",
          currentStock: product.currentStock,
          lowStockThreshold: product.lowStockThreshold,
        }}
      />

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Ajustar estoque</CardTitle>
          <CardDescription>
            Correção manual e pontual — não substitui o campo acima, soma ou
            subtrai do estoque atual.
          </CardDescription>
        </CardHeader>
        <form action={adjustStockWithId}>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="delta"
                className="text-body-sm font-medium text-foreground"
              >
                Quantidade (use negativo para dar baixa) *
              </label>
              <Input
                id="delta"
                name="delta"
                type="number"
                step={1}
                placeholder="Ex: -2 ou 10"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="reason"
                className="text-body-sm font-medium text-foreground"
              >
                Motivo
              </label>
              <Input
                id="reason"
                name="reason"
                placeholder="Ex: contagem de inventário"
              />
            </div>
          </CardContent>
          <CardFooter className="justify-end">
            <Button type="submit" variant="outline">
              Ajustar estoque
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Fornecedores vinculados</CardTitle>
          <CardDescription>
            {showCostPrice
              ? "Preço de custo e fornecedor principal usado no aviso de reposição."
              : "Fornecedores que atendem este produto."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {product.suppliers.length === 0 ? (
            <p className="text-body-sm text-muted-foreground">
              Nenhum fornecedor vinculado ainda.
            </p>
          ) : (
            product.suppliers.map((link) => (
              <div
                key={link.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border p-2.5"
              >
                <div className="flex flex-col">
                  <span className="text-body-sm font-medium text-foreground">
                    {link.supplier.name}
                  </span>
                  {showCostPrice && "costPrice" in link ? (
                    <span className="text-micro text-foreground-secondary">
                      Custo: {formatDecimalToBRL(link.costPrice.toString())}
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  {link.isPrimary ? (
                    <Badge variant="reagendado">Principal</Badge>
                  ) : null}
                  {showCostPrice ? (
                    <form action={unlinkProductSupplier.bind(null, link.id)}>
                      <Button type="submit" variant="outline" size="sm">
                        Remover
                      </Button>
                    </form>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </CardContent>

        {showCostPrice ? (
          <form action={linkSupplierWithId}>
            <CardContent className="flex flex-col gap-4 border-t border-border pt-4">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="supplierId"
                  className="text-body-sm font-medium text-foreground"
                >
                  Fornecedor *
                </label>
                {/* Select nativo por enquanto — sem componente customizado ainda */}
                <select
                  id="supplierId"
                  name="supplierId"
                  required
                  defaultValue=""
                  className="h-8 w-full rounded-lg border border-input bg-surface px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="" disabled>
                    Selecione...
                  </option>
                  {allSuppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="costPrice"
                  className="text-body-sm font-medium text-foreground"
                >
                  Preço de custo (R$) *
                </label>
                <CurrencyInput
                  id="costPrice"
                  name="costPrice"
                  placeholder="R$ 0,00"
                  required
                />
              </div>

              <label className="flex items-center gap-2 text-body-sm text-foreground">
                <input
                  type="checkbox"
                  name="isPrimary"
                  className="size-4 rounded border-input"
                />
                Fornecedor principal
              </label>
            </CardContent>
            <CardFooter className="justify-end">
              <Button type="submit" variant="outline">
                Vincular fornecedor
              </Button>
            </CardFooter>
          </form>
        ) : null}
      </Card>
    </div>
  )
}
