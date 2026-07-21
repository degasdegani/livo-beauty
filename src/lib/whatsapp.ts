import { formatDateBR, formatTimeBR } from "@/lib/datetime"

// Numeros de cliente sao salvos sem o codigo do pais (10 digitos p/ fixo, 11
// p/ celular — ver AppointmentForm/actions.ts, que so valida length >= 10).
// wa.me exige o "55" na frente; length > 11 e tratado como "ja tem codigo do
// pais" para nao quebrar caso o dado salvo mude no futuro.
const BRAZIL_COUNTRY_CODE = "55"
const LOCAL_PHONE_MAX_DIGITS = 11

export function sanitizePhoneForWhatsapp(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  return digits.length > LOCAL_PHONE_MAX_DIGITS
    ? digits
    : `${BRAZIL_COUNTRY_CODE}${digits}`
}

function joinServiceNames(names: string[]): string {
  if (names.length === 0) return ""
  if (names.length === 1) return names[0]
  return `${names.slice(0, -1).join(", ")} e ${names[names.length - 1]}`
}

export type WhatsappAppointmentData = {
  clientName: string
  clientPhone: string
  businessName: string
  professionalName: string
  serviceNames: string[]
  startAt: Date
}

export function buildConfirmationMessage(
  data: WhatsappAppointmentData
): string {
  const services = joinServiceNames(data.serviceNames)
  return `Olá ${data.clientName}! Seu horário na ${data.businessName} está confirmado para ${formatDateBR(data.startAt)} às ${formatTimeBR(data.startAt)} — ${services} com ${data.professionalName}. Qualquer imprevisto, nos avise por aqui!`
}

export function buildReminderMessage(data: WhatsappAppointmentData): string {
  const services = joinServiceNames(data.serviceNames)
  return `Olá ${data.clientName}! Passando para lembrar do seu horário hoje às ${formatTimeBR(data.startAt)} — ${services} com ${data.professionalName}. Te esperamos!`
}

export function buildNoShowMessage(data: WhatsappAppointmentData): string {
  return `Olá ${data.clientName}! Notamos que você não compareceu ao seu horário de ${formatDateBR(data.startAt)} às ${formatTimeBR(data.startAt)}. Gostaria de reagendar?`
}

export function buildWhatsappUrl(phone: string, message: string): string {
  return `https://wa.me/${sanitizePhoneForWhatsapp(phone)}?text=${encodeURIComponent(message)}`
}

export type WhatsappLowStockData = {
  productName: string
  currentStock: number
  unit: string
}

export function buildLowStockMessage(data: WhatsappLowStockData): string {
  return `Olá! Gostaria de fazer um pedido de reposição de ${data.productName}. Estoque atual: ${data.currentStock} ${data.unit}. Pode me passar disponibilidade e prazo?`
}
