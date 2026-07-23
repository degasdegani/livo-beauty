import { createService } from "../actions"
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
import { canManageAnamneseSettings, requireSessionUser } from "@/lib/access"
import { prisma } from "@/lib/prisma"

export default async function NovoServicoPage() {
  const { businessId, role } = await requireSessionUser()

  const business = canManageAnamneseSettings(role)
    ? await prisma.business.findUnique({
        where: { id: businessId },
        select: { prontuarioEnabled: true },
      })
    : null

  const showRequiresAnamnese = Boolean(business?.prontuarioEnabled)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2 font-medium text-foreground">Novo serviço</h1>
        <p className="text-body-sm text-foreground-secondary">
          Cadastre um serviço do catálogo.
        </p>
      </div>

      <form action={createService} className="flex max-w-lg flex-col">
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
              <Input id="name" name="name" placeholder="Ex: Corte feminino" required />
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
                  placeholder="60"
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
                  placeholder="R$ 0,00"
                  required
                />
              </div>
            </div>

            {showRequiresAnamnese ? (
              <div className="flex items-start gap-2">
                <input
                  id="requiresAnamnese"
                  name="requiresAnamnese"
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
                />
                <div className="flex flex-col gap-0.5">
                  <label
                    htmlFor="requiresAnamnese"
                    className="text-body-sm font-medium text-foreground"
                  >
                    Exige anamnese
                  </label>
                  <p className="text-micro text-muted-foreground">
                    Clientes precisarão ter uma ficha de anamnese preenchida
                    antes de agendar este serviço.
                  </p>
                </div>
              </div>
            ) : null}
          </CardContent>
          <CardFooter className="justify-end gap-3">
            <LinkButton href="/servicos" variant="outline">
              Cancelar
            </LinkButton>
            <Button type="submit" variant="default">
              Salvar serviço
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}
