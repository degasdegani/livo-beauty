import { notFound } from "next/navigation"

import { prisma } from "@/lib/prisma"
import { requireBusinessId } from "@/lib/session"
import {
  updateProfessional,
  addProfessionalService,
  updateProfessionalServiceCommission,
  removeProfessionalService,
} from "../../actions"
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
import { formatMaskValue } from "@/lib/masks"

export default async function EditarProfissionalPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const businessId = await requireBusinessId()

  const professional = await prisma.professional.findFirst({
    where: { id, businessId },
  })

  if (!professional) {
    notFound()
  }

  const updateProfessionalWithId = updateProfessional.bind(
    null,
    professional.id
  )
  const addProfessionalServiceWithId = addProfessionalService.bind(
    null,
    professional.id
  )

  const isServiceProvider = professional.category === "SERVICE_PROVIDER"

  const [professionalServices, availableServices] = isServiceProvider
    ? await Promise.all([
        prisma.professionalService.findMany({
          where: { professionalId: professional.id },
          include: { service: true },
          orderBy: { service: { name: "asc" } },
        }),
        prisma.service.findMany({
          where: {
            businessId,
            active: true,
            NOT: { professionals: { some: { professionalId: professional.id } } },
          },
          orderBy: { name: "asc" },
        }),
      ])
    : [[], []]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2 font-medium text-foreground">
          Editar profissional
        </h1>
        <p className="text-body-sm text-foreground-secondary">
          Atualize os dados de {professional.name}.
        </p>
      </div>

      <form
        action={updateProfessionalWithId}
        className="flex max-w-lg flex-col"
      >
        <Card>
          <CardHeader>
            <CardTitle>Dados do profissional</CardTitle>
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
                defaultValue={professional.name}
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
                defaultValue={formatMaskValue("phone", professional.phone)}
                placeholder="(11) 99999-9999"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="category"
                className="text-body-sm font-medium text-foreground"
              >
                Categoria *
              </label>
              {/* Select nativo por enquanto — sem componente customizado ainda */}
              <select
                id="category"
                name="category"
                defaultValue={professional.category}
                required
                className="h-8 w-full rounded-lg border border-input bg-surface px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="SERVICE_PROVIDER">Prestador de serviço</option>
                <option value="RECEPTION">Recepção</option>
              </select>
            </div>
          </CardContent>
          <CardFooter className="justify-end gap-3">
            <LinkButton href="/profissionais" variant="outline">
              Cancelar
            </LinkButton>
            <Button type="submit" variant="default">
              Salvar alterações
            </Button>
          </CardFooter>
        </Card>
      </form>

      {isServiceProvider ? (
        <div className="flex max-w-lg flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Serviços vinculados</CardTitle>
              <CardDescription>
                Comissão aplicada a cada serviço que {professional.name}{" "}
                atende.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {professionalServices.length === 0 ? (
                <p className="text-body-sm text-muted-foreground">
                  Nenhum serviço vinculado ainda.
                </p>
              ) : (
                professionalServices.map((professionalService) => (
                  <div
                    key={professionalService.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                  >
                    <span className="text-body-sm font-medium text-foreground">
                      {professionalService.service.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <form
                        action={updateProfessionalServiceCommission.bind(
                          null,
                          professional.id,
                          professionalService.id
                        )}
                        className="flex items-center gap-1.5"
                      >
                        <Input
                          type="number"
                          name="commissionPercent"
                          defaultValue={Number(
                            professionalService.commissionPercent
                          )}
                          min={0}
                          max={100}
                          step="0.01"
                          required
                          className="h-8 w-20"
                          aria-label={`Comissão de ${professionalService.service.name}`}
                        />
                        <span className="text-body-sm text-muted-foreground">
                          %
                        </span>
                        <Button type="submit" variant="outline" size="sm">
                          Salvar
                        </Button>
                      </form>
                      <form
                        action={removeProfessionalService.bind(
                          null,
                          professional.id,
                          professionalService.id
                        )}
                      >
                        <Button type="submit" variant="destructive" size="sm">
                          Remover
                        </Button>
                      </form>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <form action={addProfessionalServiceWithId}>
            <Card>
              <CardHeader>
                <CardTitle>Adicionar serviço</CardTitle>
                <CardDescription>
                  Vincule um novo serviço com a comissão correspondente.
                </CardDescription>
              </CardHeader>
              {availableServices.length === 0 ? (
                <CardContent>
                  <p className="text-body-sm text-muted-foreground">
                    Nenhum serviço disponível para vincular — cadastre
                    serviços em Serviços ou todos já estão vinculados a este
                    profissional.
                  </p>
                </CardContent>
              ) : (
                <>
                  <CardContent className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="serviceId"
                        className="text-body-sm font-medium text-foreground"
                      >
                        Serviço *
                      </label>
                      <select
                        id="serviceId"
                        name="serviceId"
                        required
                        defaultValue=""
                        className="h-8 w-full rounded-lg border border-input bg-surface px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        <option value="" disabled>
                          Selecione...
                        </option>
                        {availableServices.map((service) => (
                          <option key={service.id} value={service.id}>
                            {service.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="commissionPercent"
                        className="text-body-sm font-medium text-foreground"
                      >
                        Comissão (%) *
                      </label>
                      <Input
                        id="commissionPercent"
                        name="commissionPercent"
                        type="number"
                        min={0}
                        max={100}
                        step="0.01"
                        placeholder="Ex: 40"
                        required
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="justify-end">
                    <Button type="submit" variant="default">
                      Vincular serviço
                    </Button>
                  </CardFooter>
                </>
              )}
            </Card>
          </form>
        </div>
      ) : (
        <Card className="max-w-lg">
          <CardContent className="py-6 text-body-sm text-muted-foreground">
            Profissionais da categoria Recepção não vinculam serviços.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
