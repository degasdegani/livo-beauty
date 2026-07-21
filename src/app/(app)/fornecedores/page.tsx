import { notFound } from "next/navigation"

import { prisma } from "@/lib/prisma"
import { canAccessProducts, requireSessionUser } from "@/lib/access"
import { toggleSupplierActive } from "./actions"
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
import { formatMaskValue } from "@/lib/masks"

export default async function FornecedoresPage() {
  const { businessId, role } = await requireSessionUser()
  if (!canAccessProducts(role)) {
    notFound()
  }

  const suppliers = await prisma.supplier.findMany({
    where: { businessId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      phone: true,
      contactName: true,
      active: true,
      _count: { select: { products: true } },
    },
  })

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h2 font-medium text-foreground">
            Fornecedores
          </h1>
          <p className="text-body-sm text-foreground-secondary">
            Cadastro de fornecedores de produtos.
          </p>
        </div>
        <LinkButton href="/fornecedores/novo" variant="default">
          Novo fornecedor
        </LinkButton>
      </div>

      {suppliers.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-body-sm text-muted-foreground">
            Nenhum fornecedor cadastrado ainda.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {suppliers.map((supplier) => (
            <Card key={supplier.id}>
              <CardHeader>
                <CardTitle>{supplier.name}</CardTitle>
                <CardDescription>
                  {supplier.phone
                    ? formatMaskValue("phone", supplier.phone)
                    : "Sem telefone"}
                  {supplier.contactName ? ` · ${supplier.contactName}` : ""}
                </CardDescription>
                <CardAction>
                  <Badge variant={supplier.active ? "confirmado" : "cancelado"}>
                    {supplier.active ? "Ativo" : "Inativo"}
                  </Badge>
                </CardAction>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="text-body-sm text-foreground-secondary">
                  {supplier._count.products}{" "}
                  {supplier._count.products === 1
                    ? "produto vinculado"
                    : "produtos vinculados"}
                </p>
                <div className="flex items-center justify-end gap-2">
                  <LinkButton
                    href={`/fornecedores/${supplier.id}/editar`}
                    variant="outline"
                    size="sm"
                  >
                    Editar
                  </LinkButton>
                  <form
                    action={toggleSupplierActive.bind(
                      null,
                      supplier.id,
                      !supplier.active
                    )}
                  >
                    <Button type="submit" variant="outline" size="sm">
                      {supplier.active ? "Desativar" : "Ativar"}
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
