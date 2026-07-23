"use client"

import * as React from "react"

import { Button, LinkButton } from "@/components/ui/button"

export function ConsentFooter({ cancelHref }: { cancelHref: string }) {
  const [checked, setChecked] = React.useState(false)

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-start gap-2">
        <input
          id="consent"
          name="consent"
          type="checkbox"
          checked={checked}
          onChange={(event) => setChecked(event.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
        />
        <label
          htmlFor="consent"
          className="text-body-sm font-medium text-foreground"
        >
          Li o texto acima e autorizo o registro desses dados de saúde.
        </label>
      </div>

      <div className="flex justify-end gap-3">
        <LinkButton href={cancelHref} variant="outline">
          Cancelar
        </LinkButton>
        <Button type="submit" variant="default" isDisabled={!checked}>
          Salvar ficha
        </Button>
      </div>
    </div>
  )
}
