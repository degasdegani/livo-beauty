import { format, type MaskOptions } from "@react-input/mask"

export const MASK_OPTIONS = {
  phone: { mask: "(__) _____-____", replacement: { _: /\d/ } },
  cpf: { mask: "___.___.___-__", replacement: { _: /\d/ } },
  cnpj: { mask: "__.___.___/____-__", replacement: { _: /\d/ } },
  cep: { mask: "_____-___", replacement: { _: /\d/ } },
} as const satisfies Record<string, MaskOptions>

export type MaskType = keyof typeof MASK_OPTIONS

export function formatMaskValue(
  mask: MaskType,
  value: string | null | undefined
) {
  if (!value) return ""
  return format(value, MASK_OPTIONS[mask])
}

// ---------- MOEDA (BRL) ----------
//
// Padrão "os dois últimos dígitos são sempre centavos": o usuário digita
// apenas números (ex: "15990") e o valor é tratado como centavos (159990 =>
// R$ 1.599,90). Implementado com aritmética de string sobre inteiros —
// nunca passa por divisão de ponto flutuante — para não arriscar erro de
// arredondamento na conversão pra Decimal(10,2) do Prisma.

/** Extrai os dígitos de um valor digitado e retorna o total em centavos. */
export function centsFromDigits(raw: string): number {
  const digits = raw.replace(/\D/g, "")
  return digits === "" ? 0 : parseInt(digits, 10)
}

/** Centavos (inteiro) -> string decimal segura para o Prisma (ex: 15990 -> "159.90"). */
export function centsToDecimalString(cents: number): string {
  const padded = String(Math.max(0, Math.trunc(cents))).padStart(3, "0")
  return `${padded.slice(0, -2)}.${padded.slice(-2)}`
}

/** Valor decimal (string "159.90"/"159.9" ou number, ex: vindo do Prisma) -> centavos. */
export function decimalToCents(
  value: string | number | null | undefined
): number {
  if (value === null || value === undefined || value === "") return 0

  const [integerPartRaw, fractionPartRaw = ""] = String(value).split(".")
  const integerPart = integerPartRaw.replace(/\D/g, "") || "0"
  const fractionPart = (fractionPartRaw.replace(/\D/g, "") + "00").slice(0, 2)

  return parseInt(integerPart + fractionPart, 10)
}

/** Formata um valor decimal (string ou number) como "R$ 159,90". */
export function formatDecimalToBRL(
  value: string | number | null | undefined
) {
  if (value === null || value === undefined || value === "") return ""
  // Intl usa NBSP (U+00A0) depois do "R$"; normaliza pra espaço comum
  // (mesma aparência, evita caractere invisível "estranho" em cópia/teste).
  return Number(value)
    .toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
    .replace(/ /g, " ")
}

/** Centavos (inteiro) -> "R$ 159,90", para exibir enquanto o usuário digita. */
export function centsToBRLDisplay(cents: number): string {
  return formatDecimalToBRL(centsToDecimalString(cents))
}
