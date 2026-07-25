"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { signupProfessional, type SignupFormState } from "./actions"

const EMPTY_FORM_STATE: SignupFormState = {}

export function SignupForm({ codigo }: { codigo: string }) {
  const [state, formAction, isPending] = React.useActionState(
    signupProfessional.bind(null, codigo),
    EMPTY_FORM_STATE
  )

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="name"
          className="text-body-sm font-medium text-foreground"
        >
          Nome *
        </label>
        <Input id="name" name="name" required />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="email"
          className="text-body-sm font-medium text-foreground"
        >
          Email *
        </label>
        <Input id="email" name="email" type="email" required />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="phone"
          className="text-body-sm font-medium text-foreground"
        >
          Telefone
        </label>
        <Input id="phone" name="phone" type="tel" />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="password"
          className="text-body-sm font-medium text-foreground"
        >
          Senha *
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
        />
        <p className="text-micro text-muted-foreground">
          Mínimo de 8 caracteres.
        </p>
      </div>

      {state.error ? (
        <p className="w-full rounded-lg bg-error-light px-3 py-2 text-body-sm text-error">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" variant="default" isDisabled={isPending}>
        {isPending ? "Criando conta..." : "Criar conta"}
      </Button>
    </form>
  )
}
