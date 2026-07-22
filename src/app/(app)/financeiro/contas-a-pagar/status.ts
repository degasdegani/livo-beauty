import type { badgeVariants } from "@/components/ui/badge"
import type { PayableKind, PayableStatus } from "@/generated/prisma/client"
import type { VariantProps } from "class-variance-authority"

export const PAYABLE_KIND_LABEL: Record<PayableKind, string> = {
  COMISSAO: "Comissão",
  FORNECEDOR: "Fornecedor",
  DESPESA_MANUAL: "Despesa manual",
  OUTRO: "Outro",
}

export const PAYABLE_STATUS_LABEL: Record<PayableStatus, string> = {
  PENDENTE: "Pendente",
  PARCIAL: "Parcial",
  PAGO: "Pago",
  VENCIDO: "Vencido",
  CANCELADO: "Cancelado",
}

export const PAYABLE_STATUS_BADGE_VARIANT: Record<
  PayableStatus,
  NonNullable<VariantProps<typeof badgeVariants>["variant"]>
> = {
  PENDENTE: "outline",
  PARCIAL: "em-atendimento",
  PAGO: "confirmado",
  VENCIDO: "cancelado",
  CANCELADO: "concluido",
}

/** Status que ainda aceitam registro de pagamento — os demais ja estao resolvidos. */
export const PAYABLE_OPEN_STATUSES: PayableStatus[] = [
  "PENDENTE",
  "PARCIAL",
  "VENCIDO",
]
