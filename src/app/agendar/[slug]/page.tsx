import { getPublicBusinessBySlug, getPublicServices } from "./actions"
import { PublicBookingWizard } from "./public-booking-wizard"
import { todaySaoPauloDateString, shiftDateString } from "@/lib/datetime"
import { PUBLIC_BOOKING_MAX_WINDOW_DAYS } from "@/lib/public-booking/constants"

export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const business = await getPublicBusinessBySlug(slug)

  if (!business) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <p className="text-body text-foreground-secondary">
          Link de agendamento invalido ou inexistente.
        </p>
      </div>
    )
  }

  const services = await getPublicServices(business.id)
  const minDate = todaySaoPauloDateString()
  const maxDate = shiftDateString(minDate, PUBLIC_BOOKING_MAX_WINDOW_DAYS)

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
        <div className="text-center">
          <h1 className="text-h2 font-medium text-foreground">{business.name}</h1>
          <p className="text-body-sm text-foreground-secondary">Agende seu horario</p>
        </div>
        <PublicBookingWizard
          businessId={business.id}
          slug={slug}
          services={services}
          minDate={minDate}
          maxDate={maxDate}
        />
      </div>
    </div>
  )
}
