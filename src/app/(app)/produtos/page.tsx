import { notFound } from "next/navigation"

import { prisma } from "@/lib/prisma"
import { canAccessProducts, canViewCostPrice, requireSessionUser } from "@/lib/access"
import { buildLowStockMessage, buildWhatsappUrl } from "@/lib/whatsapp"
import { toggleProductActive } from "./actions"
import { LowStockWhatsappButton } from "./low-stock-whatsapp-button"
import { LinkButton, Button } from "@/components/ui/button"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardAction,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDecimalToBRL } from "@/lib/masks"

const SALE_TYPE_LABEL = {
  VENDA: "Venda",
  CONSUMO_INTERNO: "Consumo interno",
  AMBOS: "Venda e consumo",
} as const

export default async function ProdutosPage() {
  const { businessId, role } = await requireSessionUser()
  if (!canAccessProducts(role)) {
    notFound()
  }

  const showCostPrice = canViewCostPrice(role)

  const products = await prisma.product.findMany({
    where: { businessId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      unit: true,
      saleType: true,
      salePrice: true,
      currentStock: true,
      lowStockThreshold: true,
      active: true,
      suppliers: {
        select: {
          id: true,
          isPrimary: true,
          ...(showCostPrice ? { costPrice: true } : {}),
          supplier: { select: { id: true, name: true, phone: true } },
        },
      },
    },
  })

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h2 font-medium text-foreground">Produtos</h1>
          <p className="text-body-sm text-foreground-secondary">
            Catálogo de produtos e controle de estoque.
          </p>
        </div>
        <LinkButton href="/produtos/novo" variant="default">
          Novo produto
        </LinkButton>
      </div>

      {products.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-body-sm text-muted-foreground">
            Nenhum produto cadastrado ainda.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => {
            const isLowStock = product.currentStock <= product.lowStockThreshold

            const message = buildLowStockMessage({
              productName: product.name,
              currentStock: product.currentStock,
              unit: product.unit,
            })

            const linksWithPhone = product.suppliers.filter(
              (link) => link.supplier.phone
            )
            const primaryLink = linksWithPhone.find((link) => link.isPrimary)
            const primaryUrl = primaryLink
              ? buildWhatsappUrl(primaryLink.supplier.phone as string, message)
              : null
            const options = linksWithPhone.map((link) => ({
              id: link.id,
              name: link.supplier.name,
              url: buildWhatsappUrl(link.supplier.phone as string, message),
            }))

            const costLink =
              product.suppliers.find((link) => link.isPrimary) ??
              product.suppliers[0]

            return (
              <Card key={product.id}>
                <CardHeader>
                  <CardTitle>{product.name}</CardTitle>
                  <CardDescription>
                    {product.unit} · {SALE_TYPE_LABEL[product.saleType]}
                    {product.salePrice
                      ? ` · ${formatDecimalToBRL(product.salePrice.toString())}`
                      : ""}
                    {showCostPrice && costLink && "costPrice" in costLink
                      ? ` · Custo: ${formatDecimalToBRL(costLink.costPrice.toString())}`
                      : ""}
                  </CardDescription>
                  <CardAction className="flex flex-col items-end gap-1">
                    <Badge variant={product.active ? "confirmado" : "cancelado"}>
                      {product.active ? "Ativo" : "Inativo"}
                    </Badge>
                    {isLowStock ? (
                      <Badge variant="ausente">Estoque baixo</Badge>
                    ) : null}
                  </CardAction>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <p className="text-body-sm text-foreground-secondary">
                    Estoque atual: {product.currentStock} {product.unit}
                  </p>
                  {isLowStock ? (
                    <LowStockWhatsappButton
                      primaryUrl={primaryUrl}
                      options={options}
                    />
                  ) : null}
                  <div className="flex items-center justify-end gap-2">
                    <LinkButton
                      href={`/produtos/${product.id}/editar`}
                      variant="outline"
                      size="sm"
                    >
                      Editar
                    </LinkButton>
                    <form
                      action={toggleProductActive.bind(
                        null,
                        product.id,
                        !product.active
                      )}
                    >
                      <Button type="submit" variant="outline" size="sm">
                        {product.active ? "Desativar" : "Ativar"}
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
