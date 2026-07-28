"use client"

import { Button } from "@/components/ui/button"
import { buildManageLinkMessage, buildWhatsappUrl, type WhatsappManageLinkData } from "@/lib/whatsapp"

export function ConfirmationWhatsappButton({
  clientPhone,
  data,
}: {
  clientPhone: string
  data: WhatsappManageLinkData
}) {
  const url = buildWhatsappUrl(clientPhone, buildManageLinkMessage(data))
  return (
    <Button variant="default" onPress={() => window.open(url, "_blank")}>
      Salvar no WhatsApp
    </Button>
  )
}
