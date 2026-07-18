import { notFound } from "next/navigation"

import { prisma } from "@/lib/prisma"
import { requireBusinessId } from "@/lib/session"
import { updateService } from "../../actions"
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

export default async function EditarServicoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const businessId = await requireBusinessId()

  const service = await prisma.service.findFirst({
    where: { id, businessId },
  })

  if (!service) {
    notFound()
  }

  const updateServiceWithId = updateService.bind(null, service.id)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2 font-medium text-foreground">
          Editar serviço
        </h1>
        <p className="text-body-sm text-foreground-secondary">
          Atualize os dados de {service.name}.
        </p>
      </div>

      <form action={updateServiceWithId} className="flex max-w-lg flex-col">
        <Card>
          <CardHeader>
            <CardTitle>Dados do serviço</CardTitle>
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
                defaultValue={service.name}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="description"
                className="text-body-sm font-medium text-foreground"
              >
                Descrição
              </label>
              <Input
                id="description"
                name="description"
                defaultValue={service.description ?? ""}
                placeholder="Ex: Corte + escova"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="durationMinutes"
                  className="text-body-sm font-medium text-foreground"
                >
                  Duração (min) *
                </label>
                <Input
                  id="durationMinutes"
                  name="durationMinutes"
                  type="number"
                  min={1}
                  step={1}
                  defaultValue={service.durationMinutes}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="price"
                  className="text-body-sm font-medium text-foreground"
                >
                  Preço (R$) *
                </label>
                <CurrencyInput
                  id="price"
                  name="price"
                  defaultValue={service.price.toString()}
                  placeholder="R$ 0,00"
                  required
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="justify-end gap-3">
            <LinkButton href="/servicos" variant="outline">
              Cancelar
            </LinkButton>
            <Button type="submit" variant="default">
              Salvar alterações
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}
