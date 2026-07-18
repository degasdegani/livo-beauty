import { notFound } from "next/navigation"

import { prisma } from "@/lib/prisma"
import { requireBusinessId } from "@/lib/session"
import { updateProfessional } from "../../actions"
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
    </div>
  )
}
