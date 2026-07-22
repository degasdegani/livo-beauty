"use client"

import * as React from "react"

import { SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatDateBR, formatDateTimeBR } from "@/lib/datetime"
import { formatDecimalToBRL } from "@/lib/masks"
import { getPayableDetail, type PayableDetail } from "../actions"
import { PayablePaymentForm } from "./payable-payment-form"
import { PayableEditForm } from "./payable-edit-form"
import {
  PAYABLE_KIND_LABEL,
  PAYABLE_STATUS_LABEL,
  PAYABLE_STATUS_BADGE_VARIANT,
  PAYABLE_OPEN_STATUSES,
} from "./status"

export type PayableDrawerState =
  | { mode: "closed" }
  | { mode: "open"; payableId: string }

/**
 * Mesmo padrao do CommandDrawer: recebe so o payableId, carrega o resto
 * (detalhe + historico de pagamentos) via getPayableDetail em useEffect +
 * useTransition.
 */
export function PayableDrawer({
  state,
  onOpenChange,
  onChanged,
}: {
  state: PayableDrawerState
  onOpenChange: (open: boolean) => void
  onChanged: () => void
}) {
  const payableId = state.mode === "open" ? state.payableId : null

  const [detail, setDetail] = React.useState<PayableDetail | null>(null)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [isEditing, setIsEditing] = React.useState(false)
  const [, startLoad] = React.useTransition()

  const loadDetail = React.useCallback((id: string) => {
    startLoad(async () => {
      const result = await getPayableDetail(id)
      if (result.detail) {
        setLoadError(null)
        setDetail(result.detail)
      } else {
        setLoadError(result.error ?? "Erro ao carregar conta a pagar.")
        setDetail(null)
      }
    })
  }, [])

  React.useEffect(() => {
    setDetail(null)
    setLoadError(null)
    setIsEditing(false)
    if (payableId) loadDetail(payableId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payableId])

  function handlePaid() {
    onOpenChange(false)
    onChanged()
  }

  function handleSaved() {
    setIsEditing(false)
    if (payableId) loadDetail(payableId)
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

    const canPay = PAYABLE_OPEN_STATUSES.includes(detail.status)
    const canEdit = detail.payments.length === 0

    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1 border-b border-border pb-4">
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <span className="text-body-sm font-medium text-foreground">
                {detail.description}
              </span>
            ) : null}
            <Badge variant={PAYABLE_STATUS_BADGE_VARIANT[detail.status]}>
              {PAYABLE_STATUS_LABEL[detail.status]}
            </Badge>
            {canEdit && !isEditing ? (
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto"
                onPress={() => setIsEditing(true)}
              >
                Editar
              </Button>
            ) : null}
          </div>
          <span className="text-body-sm text-foreground-secondary">
            {PAYABLE_KIND_LABEL[detail.kind]}
            {detail.professionalName ? ` · ${detail.professionalName}` : ""}
            {detail.supplierName ? ` · ${detail.supplierName}` : ""}
          </span>
          {detail.dueDate ? (
            <span className="text-body-sm text-foreground-secondary">
              Vencimento: {formatDateBR(detail.dueDate)}
            </span>
          ) : null}
        </div>

        {isEditing ? (
          <PayableEditForm
            payableId={detail.id}
            initialDescription={detail.description}
            initialAmount={detail.amount}
            onSaved={handleSaved}
            onCancel={() => setIsEditing(false)}
          />
        ) : (
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between px-1">
              <span className="text-body-sm text-foreground-secondary">
                Valor total
              </span>
              <span className="text-body-sm font-medium text-foreground">
                {formatDecimalToBRL(detail.amount)}
              </span>
            </div>
            <div className="flex items-center justify-between px-1">
              <span className="text-body-sm text-foreground-secondary">
                Pago
              </span>
              <span className="text-body-sm text-foreground">
                {formatDecimalToBRL(detail.paidAmount)}
              </span>
            </div>
            <div className="flex items-center justify-between px-1">
              <span className="text-body-sm font-medium text-foreground">
                Restante
              </span>
              <span className="text-body-sm font-medium text-foreground">
                {formatDecimalToBRL(detail.remainingAmount)}
              </span>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <span className="text-body-sm font-medium text-foreground">
            Pagamentos
          </span>
          {detail.payments.length === 0 ? (
            <p className="text-body-sm text-muted-foreground">
              Nenhum pagamento registrado ainda.
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {detail.payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between text-body-sm"
                >
                  <span className="text-foreground-secondary">
                    {formatDateTimeBR(payment.paidAt)}
                    {payment.createdByName ? ` · ${payment.createdByName}` : ""}
                  </span>
                  <span className="text-foreground">
                    {formatDecimalToBRL(payment.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {canPay && !isEditing ? (
          <PayablePaymentForm
            payableId={detail.id}
            remainingAmount={detail.remainingAmount}
            onPaid={handlePaid}
          />
        ) : null}
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
        <SheetTitle>Conta a pagar</SheetTitle>
      </SheetHeader>
      <div className="flex-1 overflow-y-auto px-4 pb-4">{renderBody()}</div>
    </SheetContent>
  )
}
