import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { PushNotificationToggle } from "@/components/pwa/push-notification-toggle"
import { ProntuarioToggle } from "./prontuario-toggle"
import { canManageAnamneseSettings, requireSessionUser } from "@/lib/access"
import { prisma } from "@/lib/prisma"

export default async function ConfiguracoesPage() {
  const { businessId, role } = await requireSessionUser()
  const canManageAnamnese = canManageAnamneseSettings(role)

  const business = canManageAnamnese
    ? await prisma.business.findUniqueOrThrow({
        where: { id: businessId },
        select: { prontuarioEnabled: true },
      })
    : null

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-h2 font-medium text-foreground">Configurações</h1>
        <p className="text-body-sm text-foreground-secondary">
          Preferências da sua conta e do sistema.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notificações</CardTitle>
          <CardDescription>
            Controle os avisos que você recebe no navegador.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PushNotificationToggle />
        </CardContent>
      </Card>

      {business ? (
        <Card>
          <CardHeader>
            <CardTitle>Prontuário/Anamnese</CardTitle>
            <CardDescription>
              Ficha clínica, consentimento e fotos de acompanhamento para
              clientes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProntuarioToggle initialEnabled={business.prontuarioEnabled} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
