import { headers } from "next/headers"

import { getPublicAppointmentByToken, getPublicBusinessBySlug } from "../../actions"
import { ConfirmationWhatsappButton } from "./confirmation-whatsapp-button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { formatDateBR, formatTimeBR } from "@/lib/datetime"

export default async function PublicBookingConfirmedPage({
  params,
}: {
  params: Promise<{ slug: string; token: string }>
}) {
  const { slug, token } = await params
  const business = await getPublicBusinessBySlug(slug)
  const appointment = business
    ? await getPublicAppointmentByToken(business.id, token)
    : null

  if (!business || !appointment) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <p className="text-body text-foreground-secondary">
          Agendamento nao encontrado.
        </p>
      </div>
    )
  }

  const startAtDate = new Date(appointment.startAt)

  // Sem NEXT_PUBLIC_APP_URL configurada no projeto — monta URL absoluta a
  // partir do host da requisicao (funciona em qualquer dominio de producao
  // sem precisar de nova env var).
  const headerList = await headers()
  const host = headerList.get("host") ?? ""
  const protocol = host.startsWith("localhost") ? "http" : "https"
  const manageUrl = `${protocol}://${host}/agendar/${slug}/gerenciar/${token}`

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
        <div className="text-center">
          <h1 className="text-h2 font-medium text-foreground">Agendamento confirmado!</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{business.name}</CardTitle>
            <CardDescription>
              {appointment.serviceNames.join(", ")} com {appointment.professionalName}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-body-sm font-medium text-foreground">
              {formatDateBR(startAtDate)} as {formatTimeBR(startAtDate)}
            </p>
          </CardContent>
        </Card>
        <ConfirmationWhatsappButton
          clientPhone={appointment.clientPhone}
          data={{
            clientName: appointment.clientName,
            clientPhone: appointment.clientPhone,
            businessName: business.name,
            professionalName: appointment.professionalName,
            serviceNames: appointment.serviceNames,
            startAt: startAtDate,
            manageUrl,
          }}
        />
      </div>
    </div>
  )
}
