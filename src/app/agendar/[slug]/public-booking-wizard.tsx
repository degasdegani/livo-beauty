"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { MaskedInput } from "@/components/ui/masked-input"
import { formatDecimalToBRL } from "@/lib/masks"
import { formatDateBR, parseDateOnlyInput } from "@/lib/datetime"
import {
  getPublicProfessionalsForService,
  getPublicAvailableSlots,
  createPublicAppointment,
  type PublicService,
  type PublicProfessional,
} from "./actions"

const ANY_PROFESSIONAL = "ANY"
const CLIENT_PHONE_MIN_DIGITS = 10

type Step = 1 | 2 | 3 | 4

function PublicBookingWizard({
  businessId,
  slug,
  services,
  minDate,
  maxDate,
}: {
  businessId: string
  slug: string
  services: PublicService[]
  minDate: string
  maxDate: string
}) {
  const router = useRouter()

  const [step, setStep] = React.useState<Step>(1)

  const [selectedServiceId, setSelectedServiceId] = React.useState("")
  const [selectedProfessionalId, setSelectedProfessionalId] = React.useState("")
  const [professionals, setProfessionals] = React.useState<PublicProfessional[]>([])
  const [isLoadingProfessionals, setIsLoadingProfessionals] = React.useState(false)

  const [selectedDate, setSelectedDate] = React.useState("")
  const [availableTimes, setAvailableTimes] = React.useState<string[]>([])
  const [isLoadingTimes, setIsLoadingTimes] = React.useState(false)
  const [selectedTime, setSelectedTime] = React.useState("")

  const [clientName, setClientName] = React.useState("")
  const [clientPhone, setClientPhone] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [submitError, setSubmitError] = React.useState<string | null>(null)

  const selectedService = services.find((s) => s.id === selectedServiceId) ?? null

  // Re-carrega horarios sempre que o step 3 estiver ativo com uma data
  // escolhida — cobre tanto a mudanca de data quanto o retorno do step 4
  // (apos um erro de conflito, por exemplo), quando a lista precisa refletir
  // o estado mais recente da agenda.
  React.useEffect(() => {
    if (step !== 3 || !selectedDate) return

    let cancelled = false
    setIsLoadingTimes(true)
    setSelectedTime("")

    getPublicAvailableSlots({
      businessId,
      serviceId: selectedServiceId,
      professionalId:
        selectedProfessionalId === ANY_PROFESSIONAL ? null : selectedProfessionalId,
      dateStr: selectedDate,
    })
      .then((slots) => {
        if (cancelled) return
        const uniqueTimes = Array.from(new Set(slots.map((slot) => slot.time))).sort()
        setAvailableTimes(uniqueTimes)
      })
      .finally(() => {
        if (!cancelled) setIsLoadingTimes(false)
      })

    return () => {
      cancelled = true
    }
  }, [step, selectedDate, selectedProfessionalId, selectedServiceId, businessId])

  async function handleSelectService(service: PublicService) {
    setSelectedServiceId(service.id)
    setStep(2)
    setIsLoadingProfessionals(true)
    try {
      const result = await getPublicProfessionalsForService(businessId, service.id)
      setProfessionals(result)
    } finally {
      setIsLoadingProfessionals(false)
    }
  }

  function handleSelectProfessional(professionalId: string) {
    setSelectedProfessionalId(professionalId)
    setSelectedDate("")
    setAvailableTimes([])
    setSelectedTime("")
    setStep(3)
  }

  function handleBackToStep1() {
    setSelectedProfessionalId("")
    setProfessionals([])
    setSelectedDate("")
    setAvailableTimes([])
    setSelectedTime("")
    setStep(1)
  }

  function handleBackToStep2() {
    setSelectedDate("")
    setAvailableTimes([])
    setSelectedTime("")
    setStep(2)
  }

  function handleSelectTime(time: string) {
    setSelectedTime(time)
    setStep(4)
  }

  function handleBackToStep3() {
    setSubmitError(null)
    setStep(3)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitError(null)

    const cleanName = clientName.trim()
    const cleanPhoneDigits = clientPhone.replace(/\D/g, "")

    if (!cleanName) {
      setSubmitError("Nome é obrigatório.")
      return
    }
    if (cleanPhoneDigits.length < CLIENT_PHONE_MIN_DIGITS) {
      setSubmitError("WhatsApp inválido.")
      return
    }

    setIsSubmitting(true)

    const result = await createPublicAppointment({
      businessId,
      serviceId: selectedServiceId,
      professionalId:
        selectedProfessionalId === ANY_PROFESSIONAL ? null : selectedProfessionalId,
      dateStr: selectedDate,
      time: selectedTime,
      clientName: cleanName,
      clientPhone: cleanPhoneDigits,
    })

    if (result.error) {
      setSubmitError(result.error)
      setIsSubmitting(false)
      return
    }

    if (result.token) {
      router.push(`/agendar/${slug}/confirmado/${result.token}`)
      return
    }

    // Fallback defensivo: nem error nem token (não deveria acontecer)
    setIsSubmitting(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-center text-micro text-muted-foreground">Passo {step} de 4</p>

      {step === 1 ? (
        <Card>
          <CardHeader>
            <CardTitle>Escolha o serviço</CardTitle>
            <CardDescription>Selecione o serviço que deseja agendar.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {services.length === 0 ? (
              <p className="text-body-sm text-muted-foreground">
                Nenhum serviço disponível no momento.
              </p>
            ) : (
              services.map((service) => (
                <Card
                  key={service.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelectService(service)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault()
                      handleSelectService(service)
                    }
                  }}
                  size="sm"
                  className="cursor-pointer transition-colors hover:border-ring"
                >
                  <CardContent className="flex items-center justify-between gap-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-body-sm font-medium text-foreground">
                        {service.name}
                      </span>
                      <span className="text-micro text-foreground-secondary">
                        {service.durationMinutes} min
                      </span>
                    </div>
                    <span className="text-body-sm font-medium text-foreground">
                      {formatDecimalToBRL(service.price)}
                    </span>
                  </CardContent>
                </Card>
              ))
            )}
          </CardContent>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card>
          <CardHeader>
            <CardTitle>Escolha a profissional</CardTitle>
            <CardDescription>{selectedService?.name}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {isLoadingProfessionals ? (
              <p className="text-body-sm text-muted-foreground">Carregando...</p>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleSelectProfessional(ANY_PROFESSIONAL)}
                  className="rounded-lg border border-border p-2.5 text-left text-body-sm font-medium text-foreground transition-colors hover:border-ring hover:bg-background"
                >
                  Sem preferência
                </button>
                {professionals.map((professional) => (
                  <button
                    key={professional.id}
                    type="button"
                    onClick={() => handleSelectProfessional(professional.id)}
                    className="rounded-lg border border-border p-2.5 text-left text-body-sm font-medium text-foreground transition-colors hover:border-ring hover:bg-background"
                  >
                    {professional.name}
                  </button>
                ))}
              </>
            )}
          </CardContent>
          <CardFooter>
            <Button type="button" variant="outline" onPress={handleBackToStep1}>
              Voltar
            </Button>
          </CardFooter>
        </Card>
      ) : null}

      {step === 3 ? (
        <Card>
          <CardHeader>
            <CardTitle>Escolha data e horário</CardTitle>
            <CardDescription>{selectedService?.name}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="date" className="text-body-sm font-medium text-foreground">
                Data *
              </label>
              <Input
                id="date"
                type="date"
                min={minDate}
                max={maxDate}
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
              />
            </div>

            {isLoadingTimes ? (
              <p className="text-body-sm text-muted-foreground">Carregando horários...</p>
            ) : selectedDate && availableTimes.length === 0 ? (
              <p className="text-body-sm text-muted-foreground">
                Nenhum horário disponível nesta data — tente outra data.
              </p>
            ) : availableTimes.length > 0 ? (
              <div className="grid grid-cols-4 gap-2">
                {availableTimes.map((time) => (
                  <button
                    key={time}
                    type="button"
                    onClick={() => handleSelectTime(time)}
                    className="rounded-lg border border-border p-2 text-center text-body-sm font-medium text-foreground transition-colors hover:border-ring hover:bg-background"
                  >
                    {time}
                  </button>
                ))}
              </div>
            ) : null}
          </CardContent>
          <CardFooter>
            <Button type="button" variant="outline" onPress={handleBackToStep2}>
              Voltar
            </Button>
          </CardFooter>
        </Card>
      ) : null}

      {step === 4 ? (
        <Card>
          <CardHeader>
            <CardTitle>Seus dados</CardTitle>
            <CardDescription>
              {selectedService?.name} ·{" "}
              {selectedDate ? formatDateBR(parseDateOnlyInput(selectedDate)) : ""} às{" "}
              {selectedTime}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="clientName"
                  className="text-body-sm font-medium text-foreground"
                >
                  Nome *
                </label>
                <Input
                  id="clientName"
                  required
                  value={clientName}
                  onChange={(event) => setClientName(event.target.value)}
                  placeholder="Seu nome"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="clientPhone"
                  className="text-body-sm font-medium text-foreground"
                >
                  WhatsApp *
                </label>
                <MaskedInput
                  id="clientPhone"
                  mask="phone"
                  required
                  autoComplete="off"
                  placeholder="(11) 99999-9999"
                  value={clientPhone}
                  onChange={(event) => setClientPhone(event.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              {submitError ? (
                <p className="w-full rounded-lg bg-error-light px-3 py-2 text-body-sm text-error">
                  {submitError}
                </p>
              ) : null}
              <div className="flex w-full justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  isDisabled={isSubmitting}
                  onPress={handleBackToStep3}
                >
                  Voltar
                </Button>
                <Button type="submit" variant="default" isDisabled={isSubmitting}>
                  {isSubmitting ? "Enviando..." : "Confirmar agendamento"}
                </Button>
              </div>
            </CardFooter>
          </form>
        </Card>
      ) : null}
    </div>
  )
}

export { PublicBookingWizard }
