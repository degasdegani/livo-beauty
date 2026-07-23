"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"

export function ProntuarioSavedToast() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  React.useEffect(() => {
    if (searchParams.get("prontuario") !== "salvo") {
      return
    }

    toast.success("Ficha de anamnese salva com sucesso.")
    router.replace(pathname)
  }, [searchParams, router, pathname])

  return null
}
