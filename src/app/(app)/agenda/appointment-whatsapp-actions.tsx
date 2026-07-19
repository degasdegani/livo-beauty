"use client"

import { MessageCircle, Send, UserX } from "lucide-react"

import { LinkButton } from "@/components/ui/button"
import type { WhatsappActionUrls } from "./actions"

/**
 * Etapa A do WhatsApp automatizado: so links wa.me com mensagem pronta,
 * sem automacao real — o usuario ainda clica manualmente pra enviar.
 */
export function AppointmentWhatsappActions({
  urls,
}: {
  urls: WhatsappActionUrls
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-border pb-4">
      <span className="text-body-sm font-medium text-foreground">
        WhatsApp
      </span>
      <div className="flex flex-wrap gap-2">
        <LinkButton
          href={urls.confirmationUrl}
          target="_blank"
          rel="noopener noreferrer"
          variant="outline"
          size="sm"
        >
          <MessageCircle strokeWidth={1.75} />
          Enviar confirmação
        </LinkButton>
        <LinkButton
          href={urls.reminderUrl}
          target="_blank"
          rel="noopener noreferrer"
          variant="outline"
          size="sm"
        >
          <Send strokeWidth={1.75} />
          Enviar lembrete
        </LinkButton>
        <LinkButton
          href={urls.noShowUrl}
          target="_blank"
          rel="noopener noreferrer"
          variant="outline"
          size="sm"
        >
          <UserX strokeWidth={1.75} />
          Avisar falta
        </LinkButton>
      </div>
    </div>
  )
}
