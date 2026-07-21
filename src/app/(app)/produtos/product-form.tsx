"use client"

import * as React from "react"

import { Button, LinkButton } from "@/components/ui/button"
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
import type { ProductSaleType } from "@/generated/prisma/client"

type ProductFormValues = {
  name: string
  sku: string
  unit: string
  saleType: ProductSaleType
  salePrice: string
  currentStock: number
  lowStockThreshold: number
}

function ProductForm({
  action,
  submitLabel,
  cancelHref,
  defaultValues,
  stockLabel = "Estoque inicial",
}: {
  action: (formData: FormData) => void | Promise<void>
  submitLabel: string
  cancelHref: string
  defaultValues?: Partial<ProductFormValues>
  stockLabel?: string
}) {
  const [saleType, setSaleType] = React.useState<ProductSaleType>(
    defaultValues?.saleType ?? "VENDA"
  )

  return (
    <form action={action} className="flex max-w-lg flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Dados do produto</CardTitle>
          <CardDescription>
            Campos obrigatórios marcados com *
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="name"
              className="text-body-sm font-medium text-foreground"
            >
              Nome *
            </label>
            <Input
              id="name"
              name="name"
              defaultValue={defaultValues?.name}
              placeholder="Ex: Shampoo hidratante 300ml"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="sku"
              className="text-body-sm font-medium text-foreground"
            >
              SKU
            </label>
            <Input
              id="sku"
              name="sku"
              defaultValue={defaultValues?.sku}
              placeholder="Código interno (opcional)"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="unit"
                className="text-body-sm font-medium text-foreground"
              >
                Unidade *
              </label>
              <Input
                id="unit"
                name="unit"
                defaultValue={defaultValues?.unit}
                placeholder="Ex: un, ml, kg"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="saleType"
                className="text-body-sm font-medium text-foreground"
              >
                Tipo *
              </label>
              {/* Select nativo por enquanto — sem componente customizado ainda */}
              <select
                id="saleType"
                name="saleType"
                required
                value={saleType}
                onChange={(event) =>
                  setSaleType(event.target.value as ProductSaleType)
                }
                className="h-8 w-full rounded-lg border border-input bg-surface px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="VENDA">Venda</option>
                <option value="CONSUMO_INTERNO">Consumo interno</option>
                <option value="AMBOS">Venda e consumo</option>
              </select>
            </div>
          </div>

          {saleType !== "CONSUMO_INTERNO" ? (
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="salePrice"
                className="text-body-sm font-medium text-foreground"
              >
                Preço de venda (R$) *
              </label>
              <CurrencyInput
                id="salePrice"
                name="salePrice"
                defaultValue={defaultValues?.salePrice}
                placeholder="R$ 0,00"
                required
              />
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="currentStock"
                className="text-body-sm font-medium text-foreground"
              >
                {stockLabel} *
              </label>
              <Input
                id="currentStock"
                name="currentStock"
                type="number"
                min={0}
                step={1}
                defaultValue={defaultValues?.currentStock ?? 0}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="lowStockThreshold"
                className="text-body-sm font-medium text-foreground"
              >
                Limite de estoque baixo *
              </label>
              <Input
                id="lowStockThreshold"
                name="lowStockThreshold"
                type="number"
                min={0}
                step={1}
                defaultValue={defaultValues?.lowStockThreshold ?? 5}
                required
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-3">
          <LinkButton href={cancelHref} variant="outline">
            Cancelar
          </LinkButton>
          <Button type="submit" variant="default">
            {submitLabel}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}

export { ProductForm }
export type { ProductFormValues }
