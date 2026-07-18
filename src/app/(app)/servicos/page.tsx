import { prisma } from "@/lib/prisma"
import { requireBusinessId } from "@/lib/session"
import { toggleServiceActive } from "./actions"
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
import { formatDecimalToBRL } from "@/lib/masks"

export default async function ServicosPage() {
  const businessId = await requireBusinessId()

  const services = await prisma.service.findMany({
    where: { businessId },
    orderBy: { name: "asc" },
  })

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h2 font-medium text-foreground">Serviços</h1>
          <p className="text-body-sm text-foreground-secondary">
            Catálogo de serviços oferecidos.
          </p>
        </div>
        <LinkButton href="/servicos/novo" variant="default">
          Novo serviço
        </LinkButton>
      </div>

      {services.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-body-sm text-muted-foreground">
            Nenhum serviço cadastrado ainda.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <Card key={service.id}>
              <CardHeader>
                <CardTitle>{service.name}</CardTitle>
                <CardDescription>
                  {service.durationMinutes} min ·{" "}
                  {formatDecimalToBRL(service.price.toString())}
                </CardDescription>
                <CardAction>
                  <Badge variant={service.active ? "confirmado" : "cancelado"}>
                    {service.active ? "Ativo" : "Inativo"}
                  </Badge>
                </CardAction>
              </CardHeader>
              <CardContent className="flex items-center justify-end gap-2">
                <LinkButton
                  href={`/servicos/${service.id}/editar`}
                  variant="outline"
                  size="sm"
                >
                  Editar
                </LinkButton>
                <form
                  action={toggleServiceActive.bind(
                    null,
                    service.id,
                    !service.active
                  )}
                >
                  <Button type="submit" variant="outline" size="sm">
                    {service.active ? "Desativar" : "Ativar"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
