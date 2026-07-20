import { prisma } from "@/lib/prisma"
import { requireBusinessId } from "@/lib/session"
import { getClientsVisibleToUser } from "@/lib/access"
import { LinkButton } from "@/components/ui/button"
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

export default async function ClientesPage() {
  await requireBusinessId()

  const clients = await prisma.client.findMany({
    where: await getClientsVisibleToUser(),
    orderBy: { name: "asc" },
  })

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h2 font-medium text-foreground">Clientes</h1>
          <p className="text-body-sm text-foreground-secondary">
            Cadastro e histórico de clientes do salão.
          </p>
        </div>
        <LinkButton href="/clientes/novo" variant="default">
          Novo cliente
        </LinkButton>
      </div>

      {clients.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-body-sm text-muted-foreground">
            Nenhum cliente cadastrado ainda.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <Card key={client.id}>
              <CardHeader>
                <CardTitle>{client.name}</CardTitle>
                <CardDescription>
                  {formatMaskValue("phone", client.phone)}
                </CardDescription>
                {!client.fullProfileCompleted ? (
                  <CardAction>
                    <Badge variant="ausente">Perfil incompleto</Badge>
                  </CardAction>
                ) : null}
              </CardHeader>
              <CardContent className="flex items-center justify-end">
                <LinkButton
                  href={`/clientes/${client.id}/editar`}
                  variant="outline"
                  size="sm"
                >
                  {client.fullProfileCompleted ? "Editar" : "Completar cadastro"}
                </LinkButton>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
