"use client"

import * as React from "react"
import { MessageCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { LinkButton } from "@/components/ui/button"

type SupplierOption = { id: string; name: string; url: string }

/**
 * Etapa A do WhatsApp automatizado (mesmo padrao da Agenda): so link wa.me
 * com mensagem pronta, clique manual do usuario.
 */
function LowStockWhatsappButton({
  primaryUrl,
  options,
}: {
  primaryUrl: string | null
  options: SupplierOption[]
}) {
  const [selectedId, setSelectedId] = React.useState(options[0]?.id ?? "")

  if (primaryUrl) {
    return (
      <LinkButton
        href={primaryUrl}
        target="_blank"
        rel="noopener noreferrer"
        variant="outline"
        size="sm"
      >
        <MessageCircle strokeWidth={1.75} />
        Avisar fornecedor
      </LinkButton>
    )
  }

  if (options.length === 0) {
    return (
      <span title="Nenhum fornecedor vinculado">
        <Button type="button" variant="outline" size="sm" isDisabled>
          <MessageCircle strokeWidth={1.75} />
          Avisar fornecedor
        </Button>
      </span>
    )
  }

  const selected = options.find((option) => option.id === selectedId) ?? options[0]

  return (
    <div className="flex items-center gap-2">
      <select
        value={selectedId}
        onChange={(event) => setSelectedId(event.target.value)}
        className="h-7 rounded-lg border border-input bg-surface px-2 text-xs text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
      <LinkButton
        href={selected.url}
        target="_blank"
        rel="noopener noreferrer"
        variant="outline"
        size="sm"
      >
        <MessageCircle strokeWidth={1.75} />
        Avisar
      </LinkButton>
    </div>
  )
}

export { LowStockWhatsappButton }
