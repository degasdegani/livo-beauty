"use client"

import * as React from "react"

import { Button, LinkButton } from "@/components/ui/button"
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
import { formatMaskValue } from "@/lib/masks"
import { searchClientsByPhone, type AppointmentFormState } from "./actions"

const CLIENT_SEARCH_MIN_DIGITS = 3
const CLIENT_SEARCH_DEBOUNCE_MS = 300

type ClientSuggestion = { id: string; name: string; phone: string }

type ProfessionalOption = {
  id: string
  name: string
  services: {
    id: string
    name: string
    durationMinutes: number
  }[]
}

type AppointmentFormValues = {
  clientName: string
  clientPhone: string
  professionalId: string
  serviceIds: string[]
  startAt: string
  room: string
  notes: string
}

function AppointmentForm({
  professionals,
  action,
  submitLabel,
  cancelHref,
  defaultValues,
  clientLocked = false,
}: {
  professionals: ProfessionalOption[]
  action: (
    state: AppointmentFormState,
    formData: FormData
  ) => Promise<AppointmentFormState>
  submitLabel: string
  cancelHref: string
  defaultValues?: AppointmentFormValues
  clientLocked?: boolean
}) {
  const [state, formAction, isPending] = React.useActionState(action, {})

  const [professionalId, setProfessionalId] = React.useState(
    defaultValues?.professionalId ?? ""
  )
  const [serviceIds, setServiceIds] = React.useState<string[]>(
    defaultValues?.serviceIds ?? []
  )
  const [startAt, setStartAt] = React.useState(defaultValues?.startAt ?? "")
  const [clientName, setClientName] = React.useState(
    defaultValues?.clientName ?? ""
  )
  const [clientPhoneValue, setClientPhoneValue] = React.useState("")
  const [foundClientName, setFoundClientName] = React.useState<string | null>(
    null
  )
  const [suggestions, setSuggestions] = React.useState<ClientSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = React.useState(false)
  const [isSearchingClient, startSearchTransition] = React.useTransition()
  const searchDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  )

  const selectedProfessional =
    professionals.find((professional) => professional.id === professionalId) ??
    null

  function handleProfessionalChange(
    event: React.ChangeEvent<HTMLSelectElement>
  ) {
    const nextId = event.target.value
    setProfessionalId(nextId)

    const next = professionals.find((professional) => professional.id === nextId)
    const allowedIds = new Set(next?.services.map((service) => service.id) ?? [])
    setServiceIds((prev) => prev.filter((id) => allowedIds.has(id)))
  }

  function toggleService(serviceId: string) {
    setServiceIds((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    )
  }

  function handlePhoneChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextValue = event.target.value
    setClientPhoneValue(nextValue)
    setFoundClientName(null)

    const digits = nextValue.replace(/\D/g, "")

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current)
      searchDebounceRef.current = null
    }

    if (digits.length < CLIENT_SEARCH_MIN_DIGITS) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    // Debounce: evita disparar uma busca a cada tecla — só busca depois que
    // o usuário para de digitar por um instante.
    searchDebounceRef.current = setTimeout(() => {
      startSearchTransition(async () => {
        const results = await searchClientsByPhone(digits)
        setSuggestions(results)

        // Fallback: telefone completo colado/digitado sem usar o dropdown —
        // se bater exatamente com um cliente existente, trava como já
        // acontecia antes (sem exigir clique na sugestão).
        const exactMatch = results.find((client) => client.phone === digits)
        if (exactMatch) {
          setFoundClientName(exactMatch.name)
          setClientName(exactMatch.name)
          setShowSuggestions(false)
        } else {
          setShowSuggestions(results.length > 0)
        }
      })
    }, CLIENT_SEARCH_DEBOUNCE_MS)
  }

  function handleSelectSuggestion(client: ClientSuggestion) {
    setClientPhoneValue(formatMaskValue("phone", client.phone))
    setClientName(client.name)
    setFoundClientName(client.name)
    setSuggestions([])
    setShowSuggestions(false)
  }

  function handlePhoneBlur() {
    setShowSuggestions(false)
  }

  const selectedServices = selectedProfessional
    ? selectedProfessional.services.filter((service) =>
        serviceIds.includes(service.id)
      )
    : []
  const totalMinutes = selectedServices.reduce(
    (sum, service) => sum + service.durationMinutes,
    0
  )

  const endAtLabel = React.useMemo(() => {
    if (!startAt || totalMinutes === 0) return null
    const start = new Date(startAt)
    if (Number.isNaN(start.getTime())) return null
    const end = new Date(start.getTime() + totalMinutes * 60_000)
    return end.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }, [startAt, totalMinutes])

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Cliente</CardTitle>
          <CardDescription>
            {clientLocked
              ? "Cliente do agendamento (não editável nesta etapa)."
              : "Digite o telefone — se já houver cadastro, os dados são reaproveitados."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {clientLocked ? (
            <p className="text-body-sm text-foreground">
              {defaultValues?.clientName} ·{" "}
              <span className="text-foreground-secondary">
                {defaultValues?.clientPhone}
              </span>
            </p>
          ) : (
            <>
              <div className="relative flex flex-col gap-1.5">
                <label
                  htmlFor="clientPhone"
                  className="text-body-sm font-medium text-foreground"
                >
                  Telefone (WhatsApp) *
                </label>
                <MaskedInput
                  id="clientPhone"
                  name="clientPhone"
                  mask="phone"
                  placeholder="(11) 99999-9999"
                  required
                  autoComplete="off"
                  value={clientPhoneValue}
                  onChange={handlePhoneChange}
                  onBlur={handlePhoneBlur}
                />
                {showSuggestions && suggestions.length > 0 ? (
                  <div className="absolute top-full z-10 mt-1 flex w-full flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-md">
                    {suggestions.map((client) => (
                      <button
                        key={client.id}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => handleSelectSuggestion(client)}
                        className="flex flex-col items-start gap-0.5 px-3 py-2 text-left text-body-sm hover:bg-background"
                      >
                        <span className="font-medium text-foreground">
                          {client.name}
                        </span>
                        <span className="text-foreground-secondary">
                          {formatMaskValue("phone", client.phone)}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
                {isSearchingClient ? (
                  <p className="text-micro text-muted-foreground">
                    Buscando cliente...
                  </p>
                ) : foundClientName ? (
                  <p className="text-micro text-success">
                    Cliente encontrado: {foundClientName} — dados reaproveitados.
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="clientName"
                  className="text-body-sm font-medium text-foreground"
                >
                  Nome *
                </label>
                <Input
                  id="clientName"
                  name="clientName"
                  required
                  readOnly={foundClientName !== null}
                  value={clientName}
                  onChange={(event) => setClientName(event.target.value)}
                  placeholder="Nome do cliente"
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profissional e serviços</CardTitle>
          <CardDescription>Campos obrigatórios marcados com *</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="professionalId"
              className="text-body-sm font-medium text-foreground"
            >
              Profissional *
            </label>
            {/* Select nativo por enquanto — sem componente customizado ainda */}
            <select
              id="professionalId"
              name="professionalId"
              required
              value={professionalId}
              onChange={handleProfessionalChange}
              className="h-8 w-full rounded-lg border border-input bg-surface px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="" disabled>
                Selecione...
              </option>
              {professionals.map((professional) => (
                <option key={professional.id} value={professional.id}>
                  {professional.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-body-sm font-medium text-foreground">
              Serviços *
            </span>
            {!selectedProfessional ? (
              <p className="text-body-sm text-muted-foreground">
                Selecione um profissional para ver os serviços que ele atende.
              </p>
            ) : selectedProfessional.services.length === 0 ? (
              <p className="text-body-sm text-muted-foreground">
                Este profissional não tem serviços vinculados.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {selectedProfessional.services.map((service) => (
                  <label
                    key={service.id}
                    className="flex items-center gap-2 rounded-lg border border-border p-2.5 text-body-sm"
                  >
                    <input
                      type="checkbox"
                      name="serviceIds"
                      value={service.id}
                      checked={serviceIds.includes(service.id)}
                      onChange={() => toggleService(service.id)}
                      className="size-4 rounded border-input"
                    />
                    <span className="flex-1 text-foreground">
                      {service.name}
                    </span>
                    <span className="text-foreground-secondary">
                      {service.durationMinutes} min
                    </span>
                  </label>
                ))}
              </div>
            )}
            {selectedServices.length > 0 ? (
              <p className="text-body-sm text-foreground-secondary">
                Duração total: {totalMinutes} min
                {endAtLabel ? ` — término previsto às ${endAtLabel}` : ""}
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Horário e detalhes</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="startAt"
              className="text-body-sm font-medium text-foreground"
            >
              Data e hora de início *
            </label>
            <Input
              id="startAt"
              name="startAt"
              type="datetime-local"
              required
              value={startAt}
              onChange={(event) => setStartAt(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="room"
              className="text-body-sm font-medium text-foreground"
            >
              Sala
            </label>
            <Input
              id="room"
              name="room"
              defaultValue={defaultValues?.room}
              placeholder="Ex: Sala 2"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="notes"
              className="text-body-sm font-medium text-foreground"
            >
              Observações
            </label>
            <Input
              id="notes"
              name="notes"
              defaultValue={defaultValues?.notes}
              placeholder="Observações do atendimento"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          {state.error ? (
            <p className="w-full rounded-lg bg-error-light px-3 py-2 text-body-sm text-error">
              {state.error}
            </p>
          ) : null}
          <div className="flex w-full justify-end gap-3">
            <LinkButton href={cancelHref} variant="outline">
              Cancelar
            </LinkButton>
            <Button type="submit" variant="default" isDisabled={isPending}>
              {isPending ? "Salvando..." : submitLabel}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </form>
  )
}

export { AppointmentForm }
