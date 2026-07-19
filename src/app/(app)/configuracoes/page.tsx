import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { PushNotificationToggle } from "@/components/pwa/push-notification-toggle"

export default function ConfiguracoesPage() {
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
    </div>
  )
}
