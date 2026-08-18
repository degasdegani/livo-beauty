"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MaskedInput } from "@/components/ui/masked-input"
import { PRICING } from "@/lib/billing/pricing"
import { formatDecimalToBRL } from "@/lib/masks"
import { cn } from "@/lib/utils"
import { signupBusiness, type SignupFormState } from "./actions"

const EMPTY_FORM_STATE: SignupFormState = {}

const BUSINESS_TYPE_OPTIONS = [
  { value: "SALON", label: "Salão" },
  { value: "CLINIC", label: "Clínica de estética" },
] as const

const CYCLE_OPTIONS = [
  { value: "MONTHLY", label: "Mensal" },
  { value: "YEARLY", label: "Anual" },
] as const

type Cycle = (typeof CYCLE_OPTIONS)[number]["value"]

export function SignupForm({
  remainingFoundingSlots,
}: {
  remainingFoundingSlots: number
}) {
  const [state, formAction, isPending] = React.useActionState(
    signupBusiness,
    EMPTY_FORM_STATE
  )
  const [cycle, setCycle] = React.useState<Cycle>("MONTHLY")
  const [documentDigitCount, setDocumentDigitCount] = React.useState(0)

  const isFoundingAvailable = remainingFoundingSlots > 0
  const priceTier = isFoundingAvailable ? PRICING.founding : PRICING.standard
  const price = cycle === "MONTHLY" ? priceTier.monthly : priceTier.yearly
  const priceSuffix = cycle === "MONTHLY" ? "/mês" : "/ano"
  // Documento sem mascara ate o usuario digitar o suficiente pra saber se e
  // CPF (11) ou CNPJ (14) — key remonta o hook de mascara ao trocar de tipo.
  const documentMask = documentDigitCount > 11 ? "cnpj" : "cpf"

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {isFoundingAvailable ? (
        <p className="rounded-lg bg-primary-light px-3 py-2 text-body-sm font-medium text-primary">
          Faltam {remainingFoundingSlots} de 25 vagas fundadoras — preço
          especial vitalício.
        </p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="businessName"
          className="text-body-sm font-medium text-foreground"
        >
          Nome do negócio *
        </label>
        <Input id="businessName" name="businessName" required />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="businessType"
          className="text-body-sm font-medium text-foreground"
        >
          Tipo de negócio *
        </label>
        <select
          id="businessType"
          name="businessType"
          required
          defaultValue=""
          className="h-8 w-full rounded-lg border border-input bg-surface px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="" disabled>
            Selecione...
          </option>
          {BUSINESS_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="responsibleName"
          className="text-body-sm font-medium text-foreground"
        >
          Seu nome (responsável) *
        </label>
        <Input id="responsibleName" name="responsibleName" required />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="email"
          className="text-body-sm font-medium text-foreground"
        >
          E-mail *
        </label>
        <Input id="email" name="email" type="email" required />
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

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="document"
          className="text-body-sm font-medium text-foreground"
        >
          CPF ou CNPJ *
        </label>
        <MaskedInput
          key={documentMask}
          id="document"
          name="document"
          mask={documentMask}
          required
          onChange={(event) =>
            setDocumentDigitCount(event.target.value.replace(/\D/g, "").length)
          }
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="phone"
          className="text-body-sm font-medium text-foreground"
        >
          WhatsApp *
        </label>
        <MaskedInput id="phone" name="phone" mask="phone" required />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-body-sm font-medium text-foreground">
          Ciclo de cobrança *
        </span>
        <div className="grid grid-cols-2 gap-2">
          {CYCLE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={cn(
                "flex cursor-pointer flex-col items-center gap-0.5 rounded-lg border px-3 py-2 text-center transition-colors",
                cycle === option.value
                  ? "border-primary bg-primary-light"
                  : "border-border bg-surface hover:border-foreground-secondary/30"
              )}
            >
              <input
                type="radio"
                name="cycle"
                value={option.value}
                checked={cycle === option.value}
                onChange={() => setCycle(option.value)}
                className="sr-only"
              />
              <span className="text-body-sm font-medium text-foreground">
                {option.label}
              </span>
            </label>
          ))}
        </div>
        <p className="text-body-sm text-foreground-secondary">
          {formatDecimalToBRL(price)}
          {priceSuffix}
          {isFoundingAvailable ? (
            <span className="text-primary"> · preço fundador</span>
          ) : null}
        </p>
      </div>

      {state.error ? (
        <p className="w-full rounded-lg bg-error-light px-3 py-2 text-body-sm text-error">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" size="lg" isDisabled={isPending}>
        {isPending ? "Criando conta..." : "Criar conta"}
      </Button>
    </form>
  )
}
