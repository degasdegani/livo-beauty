"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createCommandItem, type CommandItemFormState } from "./actions"

const EMPTY_STATE: CommandItemFormState = {}

export function CommandItemForm({
  commandId,
  services,
  products,
  professionals,
  canAssignOtherProfessional,
  onAdded,
}: {
  commandId: string
  services: { id: string; name: string; price: number }[]
  products: { id: string; name: string; salePrice: number }[]
  professionals: { id: string; name: string }[]
  canAssignOtherProfessional: boolean
  onAdded: () => void
}) {
  const action = createCommandItem.bind(null, commandId)
  const [state, formAction, isPending] = React.useActionState(action, EMPTY_STATE)
  const formRef = React.useRef<HTMLFormElement>(null)

  React.useEffect(() => {
    if (!isPending && state !== EMPTY_STATE && !state.error) {
      formRef.current?.reset()
      onAdded()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, isPending])

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-3 border-t border-border pt-4"
    >
      <span className="text-body-sm font-medium text-foreground">
        Adicionar item
      </span>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="item" className="text-body-sm font-medium text-foreground">
          Serviço ou produto *
        </label>
        <select
          id="item"
          name="item"
          required
          defaultValue=""
          className="h-8 w-full rounded-lg border border-input bg-surface px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="" disabled>
            Selecione...
          </option>
          {services.length > 0 ? (
            <optgroup label="Serviços">
              {services.map((service) => (
                <option key={service.id} value={`svc:${service.id}`}>
                  {service.name}
                </option>
              ))}
            </optgroup>
          ) : null}
          {products.length > 0 ? (
            <optgroup label="Produtos">
              {products.map((product) => (
                <option key={product.id} value={`prd:${product.id}`}>
                  {product.name}
                </option>
              ))}
            </optgroup>
          ) : null}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="quantity"
            className="text-body-sm font-medium text-foreground"
          >
            Quantidade *
          </label>
          <Input
            id="quantity"
            name="quantity"
            type="number"
            min={1}
            step={1}
            defaultValue={1}
            required
          />
        </div>

        {canAssignOtherProfessional ? (
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="professionalId"
              className="text-body-sm font-medium text-foreground"
            >
              Profissional *
            </label>
            <select
              id="professionalId"
              name="professionalId"
              required
              defaultValue=""
              className="h-8 w-full rounded-lg border border-input bg-surface px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="" disabled>
                Selecione...
              </option>
              {professionals.map((professional) => (
                <option key={professional.id} value={professional.id}>
                  {professional.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      {state.error ? (
        <p className="rounded-lg bg-error-light px-3 py-2 text-body-sm text-error">
          {state.error}
        </p>
      ) : null}

      <Button
        type="submit"
        variant="outline"
        size="sm"
        isDisabled={isPending}
        className="self-start"
      >
        {isPending ? "Adicionando..." : "Adicionar item"}
      </Button>
    </form>
  )
}
