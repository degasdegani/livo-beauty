import { prisma } from "@/lib/prisma"
import { requireBusinessId } from "@/lib/session"
import { toggleProfessionalActive } from "./actions"
import { Button, LinkButton } from "@/components/ui/button"
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

const categoryLabel: Record<string, string> = {
  RECEPTION: "Recepção",
  SERVICE_PROVIDER: "Prestador de serviço",
}

export default async function ProfissionaisPage() {
  const businessId = await requireBusinessId()

  const professionals = await prisma.professional.findMany({
    where: { businessId },
    orderBy: { name: "asc" },
  })

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h2 font-medium text-foreground">
            Profissionais
          </h1>
          <p className="text-body-sm text-foreground-secondary">
            Equipe do salão — parceiras e recepção.
          </p>
        </div>
        <LinkButton href="/profissionais/novo" variant="default">
          Novo profissional
        </LinkButton>
      </div>

      {/* TODO: tela de vínculo profissional-serviço (ProfessionalService),
       * com definição de commissionPercent por serviço — próxima iteração
       * deste módulo. */}

      {professionals.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-body-sm text-muted-foreground">
            Nenhum profissional cadastrado ainda.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {professionals.map((professional) => (
            <Card key={professional.id}>
              <CardHeader>
                <CardTitle>{professional.name}</CardTitle>
                <CardDescription>
                  {professional.phone
                    ? formatMaskValue("phone", professional.phone)
                    : "Sem telefone cadastrado"}
                </CardDescription>
                <CardAction>
                  <Badge variant={professional.active ? "confirmado" : "cancelado"}>
                    {professional.active ? "Ativo" : "Inativo"}
                  </Badge>
                </CardAction>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <Badge variant="outline">
                  {categoryLabel[professional.category]}
                </Badge>
                <div className="flex items-center gap-2">
                  <LinkButton
                    href={`/profissionais/${professional.id}/editar`}
                    variant="outline"
                    size="sm"
                  >
                    Editar
                  </LinkButton>
                  <form
                    action={toggleProfessionalActive.bind(
                      null,
                      professional.id,
                      !professional.active
                    )}
                  >
                    <Button type="submit" variant="outline" size="sm">
                      {professional.active ? "Desativar" : "Ativar"}
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
