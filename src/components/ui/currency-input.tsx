"use client"

import * as React from "react"

import { Input } from "@/components/ui/input"
import {
  centsToBRLDisplay,
  centsToDecimalString,
  decimalToCents,
} from "@/lib/masks"

function CurrencyInput({
  id,
  name,
  defaultValue,
  placeholder,
  required,
}: {
  id?: string
  name: string
  defaultValue?: string | number | null
  placeholder?: string
  required?: boolean
}) {
  const [digits, setDigits] = React.useState(() => {
    const initialCents = decimalToCents(defaultValue)
    return initialCents > 0 ? String(initialCents) : ""
  })

  const cents = digits === "" ? 0 : parseInt(digits, 10)

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    setDigits(event.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, ""))
  }

  return (
    <>
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        placeholder={placeholder}
        required={required}
        value={digits === "" ? "" : centsToBRLDisplay(cents)}
        onChange={handleChange}
      />
      {/* O valor de fato submetido é este campo oculto — string decimal
       * exata (ex: "159.90"), evitando qualquer parsing de "R$ 159,90" no
       * servidor. */}
      <input type="hidden" name={name} value={centsToDecimalString(cents)} />
    </>
  )
}

export { CurrencyInput }
