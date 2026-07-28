import { getPublicAppointmentByToken, getPublicBusinessBySlug } from "../../actions"
import { ManageAppointmentPanel } from "./manage-appointment-panel"
import { todaySaoPauloDateString, shiftDateString } from "@/lib/datetime"
import { PUBLIC_BOOKING_MAX_WINDOW_DAYS } from "@/lib/public-booking/constants"

export default async function PublicBookingManagePage({
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

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
        <div className="text-center">
          <h1 className="text-h2 font-medium text-foreground">Gerenciar agendamento</h1>
        </div>
        <ManageAppointmentPanel
          slug={slug}
          token={token}
          businessId={business.id}
          businessName={business.name}
          appointment={appointment}
          minDate={todaySaoPauloDateString()}
          maxDate={shiftDateString(todaySaoPauloDateString(), PUBLIC_BOOKING_MAX_WINDOW_DAYS)}
        />
      </div>
    </div>
  )
}
