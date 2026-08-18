import { redirect } from "next/navigation"

import { LinkButton } from "@/components/ui/button"
import { formatDateBR } from "@/lib/datetime"
import { canManageSubscription, requireSessionUser } from "@/lib/access"
import { prisma } from "@/lib/prisma"

export default async function CadastroConfirmacaoPage() {
  const { businessId, role } = await requireSessionUser()

  // checkoutUrl e dado financeiro do negocio — mesma regra de
  // canManagePayables/canViewDashboardFinancials, so o OWNER ve. STAFF/
  // PROFESSIONAL que abrirem esta URL diretamente vao pro dashboard deles.
  if (!canManageSubscription(role)) {
    redirect("/dashboard")
  }

  const subscription = await prisma.subscription.findUnique({
    where: { businessId },
    include: { business: { select: { name: true } } },
  })

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="flex w-full max-w-md flex-col gap-5 rounded-2xl border border-border bg-surface p-8 text-center shadow-md">
        <div className="flex flex-col gap-2">
          <h1 className="text-h4 font-medium text-foreground">
            Conta criada com sucesso!
          </h1>
          {subscription ? (
            <p className="text-body-sm text-foreground-secondary">
              O trial de 7 dias de {subscription.business.name} começou e
              termina em {formatDateBR(subscription.trialEndsAt)}.
            </p>
          ) : null}
        </div>

        {subscription?.checkoutUrl ? (
          <div className="flex flex-col gap-2">
            <p className="text-body-sm text-foreground-secondary">
              Complete o cadastro de pagamento agora ou a qualquer momento
              durante o trial — sem cobrança até lá.
            </p>
            <LinkButton
              href={subscription.checkoutUrl}
              target="_blank"
              size="lg"
            >
              Completar cadastro de pagamento
            </LinkButton>
          </div>
        ) : (
          <p className="text-body-sm text-foreground-secondary">
            Você poderá completar o cadastro de pagamento pelo painel a
            qualquer momento durante o trial.
          </p>
        )}

        <LinkButton href="/dashboard" variant="outline" size="lg">
          Ir para o painel
        </LinkButton>
      </div>
    </div>
  )
}
