import type { badgeVariants } from "@/components/ui/badge"
import type { CommandStatus, PaymentMethod } from "@/generated/prisma/client"
import type { VariantProps } from "class-variance-authority"

export const COMMAND_STATUS_LABEL: Record<CommandStatus, string> = {
  ABERTA: "Aberta",
  FECHADA: "Fechada",
  CANCELADA: "Cancelada",
}

export const COMMAND_STATUS_BADGE_VARIANT: Record<
  CommandStatus,
  NonNullable<VariantProps<typeof badgeVariants>["variant"]>
> = {
  ABERTA: "reagendado",
  FECHADA: "concluido",
  CANCELADA: "cancelado",
}

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  DINHEIRO: "Dinheiro",
  PIX: "Pix",
  CARTAO_DEBITO: "Cartão débito",
  CARTAO_CREDITO: "Cartão crédito",
}
