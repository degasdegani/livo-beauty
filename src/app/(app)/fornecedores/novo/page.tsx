import { notFound } from "next/navigation"

import { canAccessProducts, requireSessionUser } from "@/lib/access"
import { createSupplier } from "../actions"
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
import { MaskedInput } from "@/components/ui/masked-input"

export default async function NovoFornecedorPage() {
  const { role } = await requireSessionUser()
  if (!canAccessProducts(role)) {
    notFound()
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2 font-medium text-foreground">
          Novo fornecedor
        </h1>
        <p className="text-body-sm text-foreground-secondary">
          Cadastre um fornecedor de produtos.
        </p>
      </div>

      <form action={createSupplier} className="flex max-w-lg flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Dados do fornecedor</CardTitle>
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
                placeholder="Ex: Distribuidora Beleza Pura"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="phone"
                className="text-body-sm font-medium text-foreground"
              >
                WhatsApp
              </label>
              <MaskedInput
                id="phone"
                name="phone"
                mask="phone"
                placeholder="(11) 99999-9999"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="contactName"
                className="text-body-sm font-medium text-foreground"
              >
                Contato
              </label>
              <Input
                id="contactName"
                name="contactName"
                placeholder="Nome de quem atende"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="notes"
                className="text-body-sm font-medium text-foreground"
              >
                Observações
              </label>
              <Input id="notes" name="notes" placeholder="Observações gerais" />
            </div>
          </CardContent>
          <CardFooter className="justify-end gap-3">
            <LinkButton href="/fornecedores" variant="outline">
              Cancelar
            </LinkButton>
            <Button type="submit" variant="default">
              Salvar fornecedor
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}
