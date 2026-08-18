import { redirect } from "next/navigation"

import { LinkButton } from "@/components/ui/button"
import { getBusinessAccessStatus, requireSessionUser } from "@/lib/access"

export default async function AssinaturaBloqueadaPage() {
  const { businessId } = await requireSessionUser()

  const { blocked, subscription } = await getBusinessAccessStatus(businessId)

  // Quem nao esta bloqueado nao tem motivo pra ver esta pagina — manda de
  // volta pro dashboard (que vai deixar passar normalmente).
  if (!blocked) {
    redirect("/dashboard")
  }

  const reason =
    subscription?.pastDueSince != null
      ? "Identificamos um pagamento em atraso há mais de 3 dias."
      : "Seu trial terminou sem confirmação de pagamento."

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="flex w-full max-w-md flex-col gap-5 rounded-2xl border border-border bg-surface p-8 text-center shadow-md">
        <div className="flex flex-col gap-2">
          <h1 className="text-h4 font-medium text-foreground">
            Sua conta está bloqueada
          </h1>
          <p className="text-body-sm text-foreground-secondary">{reason}</p>
        </div>

        {subscription?.checkoutUrl ? (
          <LinkButton href={subscription.checkoutUrl} target="_blank" size="lg">
            Resolver pagamento
          </LinkButton>
        ) : (
          <p className="text-body-sm text-foreground-secondary">
            Fale com a gente pelo WhatsApp para regularizar sua assinatura.
          </p>
        )}
      </div>
    </div>
  )
}
