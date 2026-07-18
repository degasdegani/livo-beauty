"use client"

import * as React from "react"
import { useMask } from "@react-input/mask"

import { Input } from "@/components/ui/input"
import { MASK_OPTIONS, type MaskType } from "@/lib/masks"

function MaskedInput({
  mask,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "type"> & { mask: MaskType }) {
  const inputRef = useMask(MASK_OPTIONS[mask])

  return <Input ref={inputRef} type="text" inputMode="numeric" {...props} />
}

export { MaskedInput }
