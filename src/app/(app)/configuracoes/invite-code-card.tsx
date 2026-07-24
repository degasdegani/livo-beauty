"use client"

import * as React from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { generateInviteCode } from "./invite-actions"

export function InviteCodeCard() {
  const [code, setCode] = React.useState<string | null>(null)
  const [origin, setOrigin] = React.useState("")
  const [isPending, startTransition] = React.useTransition()

  React.useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  const link = code ? `${origin}/convite/${code}` : ""

  function handleGenerate() {
    if (
      code &&
      !window.confirm(
        "Gerar um novo link invalida o link de convite atual — quem ainda não usou o link antigo não vai mais conseguir se cadastrar com ele. Continuar?"
      )
    ) {
      return
    }

    startTransition(async () => {
      try {
        const newCode = await generateInviteCode()
        setCode(newCode)
        toast.success("Novo link de convite gerado.")
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Erro ao gerar link de convite."
        )
      }
    })
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(link)
    toast.success("Link copiado.")
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-micro text-muted-foreground">
        Compartilhe este link com profissionais para que criem a própria
        conta vinculada ao seu negócio.
      </p>

      {code ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Input value={link} readOnly />
            <Button type="button" variant="outline" onPress={handleCopy}>
              Copiar
            </Button>
          </div>
          <Button
            type="button"
            variant="outline"
            onPress={handleGenerate}
            isDisabled={isPending}
            className="self-start"
          >
            Gerar novo link
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          onPress={handleGenerate}
          isDisabled={isPending}
          className="self-start"
        >
          Gerar link de convite
        </Button>
      )}
    </div>
  )
}
