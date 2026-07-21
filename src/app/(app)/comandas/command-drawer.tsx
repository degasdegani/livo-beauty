"use client"

import * as React from "react"

import { SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { formatTimeBR } from "@/lib/datetime"
import { formatDecimalToBRL } from "@/lib/masks"
import { getCommandDetail, type CommandDetail } from "./actions"
import { CommandItemForm } from "./command-item-form"
import { CommandPaymentSection } from "./command-payment-section"
import { COMMAND_STATUS_LABEL, COMMAND_STATUS_BADGE_VARIANT, PAYMENT_METHOD_LABEL } from "./status"

export type CommandDrawerState = { mode: "closed" } | { mode: "open"; commandId: string }

/**
 * Compartilhado entre o badge da Agenda e a lista /comandas — as duas telas
 * so precisam passar o commandId, o resto (permissoes, itens, opcoes de
 * formulario) e carregado aqui via getCommandDetail.
 */
export function CommandDrawer({
  state,
  onOpenChange,
  onChanged,
}: {
  state: CommandDrawerState
  onOpenChange: (open: boolean) => void
  onChanged: () => void
}) {
  const commandId = state.mode === "open" ? state.commandId : null

  const [detail, setDetail] = React.useState<CommandDetail | null>(null)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [, startLoad] = React.useTransition()

  const loadDetail = React.useCallback((id: string) => {
    startLoad(async () => {
      const result = await getCommandDetail(id)
      if (result.detail) {
        setLoadError(null)
        setDetail(result.detail)
      } else {
        setLoadError(result.error ?? "Erro ao carregar comanda.")
        setDetail(null)
      }
    })
  }, [])

  React.useEffect(() => {
    setDetail(null)
    setLoadError(null)
    if (commandId) loadDetail(commandId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commandId])

  function handleItemAdded() {
    if (commandId) loadDetail(commandId)
    onChanged()
  }

  function handleClosed() {
    if (commandId) loadDetail(commandId)
    onChanged()
  }

  function renderBody() {
    if (state.mode === "closed") return null

    if (loadError) {
      return <p className="py-6 text-body-sm text-error">{loadError}</p>
    }

    if (!detail) {
      return (
        <p className="py-6 text-body-sm text-muted-foreground">Carregando...</p>
      )
    }

    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1 border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <span className="text-body-sm font-medium text-foreground">
              {detail.clientName}
            </span>
            <Badge variant={COMMAND_STATUS_BADGE_VARIANT[detail.status]}>
              {COMMAND_STATUS_LABEL[detail.status]}
            </Badge>
          </div>
          <span className="text-body-sm text-foreground-secondary">
            Aberta às {formatTimeBR(detail.openedAt)}
          </span>
          <span className="text-body-sm text-foreground-secondary">
            {detail.professionalNames.join(", ")}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-body-sm font-medium text-foreground">Itens</span>
          {detail.items.length === 0 ? (
            <p className="text-body-sm text-muted-foreground">
              Nenhum item lançado ainda.
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
              {detail.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 px-3 py-2"
                >
                  <div className="flex flex-col">
                    <span className="text-body-sm text-foreground">
                      {item.quantity > 1 ? `${item.quantity}x ` : ""}
                      {item.label}
                    </span>
                    <span className="text-micro text-muted-foreground">
                      {item.professionalName}
                    </span>
                  </div>
                  <span className="text-body-sm font-medium text-foreground">
                    {formatDecimalToBRL(item.lineTotal)}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between px-1">
            <span className="text-body-sm font-medium text-foreground">Total</span>
            <span className="text-body-sm font-medium text-foreground">
              {formatDecimalToBRL(detail.itemsTotal)}
            </span>
          </div>
        </div>

        {detail.status === "ABERTA" ? (
          <CommandItemForm
            commandId={detail.id}
            services={detail.services}
            products={detail.products}
            professionals={detail.professionals}
            canAssignOtherProfessional={detail.canAssignOtherProfessional}
            onAdded={handleItemAdded}
          />
        ) : null}

        {detail.status === "ABERTA" ? (
          <CommandPaymentSection
            commandId={detail.id}
            itemsTotal={detail.itemsTotal}
            canClose={detail.canClose}
            closeBlockedReason={detail.closeBlockedReason}
            onClosed={handleClosed}
          />
        ) : (
          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <span className="text-body-sm font-medium text-foreground">
              Pagamentos
            </span>
            {detail.payments.length === 0 ? (
              <p className="text-body-sm text-muted-foreground">
                Nenhum pagamento registrado.
              </p>
            ) : (
              <div className="flex flex-col gap-1">
                {detail.payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between text-body-sm"
                  >
                    <span className="text-foreground-secondary">
                      {PAYMENT_METHOD_LABEL[payment.method]}
                    </span>
                    <span className="text-foreground">
                      {formatDecimalToBRL(payment.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <SheetContent
      isOpen={state.mode !== "closed"}
      onOpenChange={onOpenChange}
      className="data-[side=right]:sm:max-w-120"
    >
      <SheetHeader className="border-b border-border">
        <SheetTitle>Comanda</SheetTitle>
      </SheetHeader>
      <div className="flex-1 overflow-y-auto px-4 pb-4">{renderBody()}</div>
    </SheetContent>
  )
}
