import { requireBusinessId } from "@/lib/session"
import { createAppointment } from "../actions"
import { AppointmentForm } from "../appointment-form"
import { getProfessionalOptions } from "../professional-options"

const STARTAT_PARAM_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/

export default async function NovoAgendamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ professionalId?: string; startAt?: string }>
}) {
  const businessId = await requireBusinessId()
  const { professionalId: professionalIdParam, startAt: startAtParam } =
    await searchParams

  const professionalOptions = await getProfessionalOptions(businessId)

  // Prefill vindo de um clique na grade do calendario (/agenda) — ignora
  // silenciosamente se os parametros vierem invalidos, sem quebrar o fluxo
  // manual normal de preenchimento do formulario.
  const prefillProfessionalId = professionalOptions.some(
    (professional) => professional.id === professionalIdParam
  )
    ? professionalIdParam
    : undefined
  const prefillStartAt =
    startAtParam && STARTAT_PARAM_PATTERN.test(startAtParam)
      ? startAtParam
      : undefined

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2 font-medium text-foreground">
          Novo agendamento
        </h1>
        <p className="text-body-sm text-foreground-secondary">
          Marque um atendimento na agenda.
        </p>
      </div>

      <AppointmentForm
        professionals={professionalOptions}
        action={createAppointment.bind(null, "/agenda")}
        submitLabel="Criar agendamento"
        cancelHref="/agenda"
        defaultValues={
          prefillProfessionalId || prefillStartAt
            ? { professionalId: prefillProfessionalId, startAt: prefillStartAt }
            : undefined
        }
      />
    </div>
  )
}
