import { prisma } from "@/lib/prisma"
import { SignupForm } from "./signup-form"

export default async function ConvitePage({
  params,
}: {
  params: Promise<{ codigo: string }>
}) {
  const { codigo } = await params

  const business = await prisma.business.findUnique({
    where: { inviteCode: codigo },
    select: { name: true },
  })

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-border bg-surface p-6">
        {business ? (
          <>
            <div>
              <h1 className="text-h4 font-medium text-foreground">
                Você foi convidado para se juntar a {business.name}
              </h1>
              <p className="text-body-sm text-foreground-secondary">
                Crie sua conta para continuar.
              </p>
            </div>
            <SignupForm codigo={codigo} />
          </>
        ) : (
          <p className="text-body-sm text-foreground-secondary">
            Link de convite inválido ou expirado.
          </p>
        )}
      </div>
    </div>
  )
}
