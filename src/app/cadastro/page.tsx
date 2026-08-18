import { redirect } from "next/navigation"

import { auth } from "@/lib/auth"
import { getRemainingFoundingSlots } from "@/lib/billing/founding-slots"
import { SignupForm } from "./signup-form"

export default async function CadastroPage() {
  const session = await auth()
  if (session?.user) {
    redirect("/dashboard")
  }

  const remainingFoundingSlots = await getRemainingFoundingSlots()

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="flex w-full max-w-md flex-col gap-6 rounded-2xl border border-border bg-surface p-8 shadow-md">
        <div>
          <h1 className="text-h4 font-medium text-foreground">
            Crie sua conta LIVO Beauty
          </h1>
          <p className="text-body-sm text-foreground-secondary">
            7 dias de trial grátis, sem cartão agora.
          </p>
        </div>

        <SignupForm remainingFoundingSlots={remainingFoundingSlots} />
      </div>
    </div>
  )
}
