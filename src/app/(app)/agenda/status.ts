import type { badgeVariants } from "@/components/ui/badge"
import type { AppointmentStatus } from "@/generated/prisma/client"
import type { VariantProps } from "class-variance-authority"

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  CONFIRMADO: "Confirmado",
  EM_ATENDIMENTO: "Em atendimento",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
  AUSENTE: "Ausente",
  REAGENDADO: "Reagendado",
}

export const STATUS_BADGE_VARIANT: Record<
  AppointmentStatus,
  NonNullable<VariantProps<typeof badgeVariants>["variant"]>
> = {
  CONFIRMADO: "confirmado",
  EM_ATENDIMENTO: "em-atendimento",
  CONCLUIDO: "concluido",
  CANCELADO: "cancelado",
  AUSENTE: "ausente",
  REAGENDADO: "reagendado",
}

/** Fundo + borda esquerda do bloco de agendamento na grade do calendario, por status. */
export const STATUS_BLOCK_CLASSES: Record<AppointmentStatus, string> = {
  CONFIRMADO: "bg-success-light border-l-success",
  EM_ATENDIMENTO: "bg-info-light border-l-info",
  CONCLUIDO: "bg-muted border-l-muted-foreground/40",
  CANCELADO: "bg-error-light border-l-error",
  AUSENTE: "bg-warning-light border-l-warning",
  REAGENDADO: "bg-primary-light border-l-primary",
}
