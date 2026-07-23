import { notFound } from "next/navigation"

import { prisma } from "@/lib/prisma"
import { getClientsVisibleToUser, requireSessionUser } from "@/lib/access"
import { buildAnamneseConsentText } from "@/lib/anamnese-consent"
import { formatDateTimeBR } from "@/lib/datetime"
import { getAnamneseRecord, saveAnamneseRecord } from "./actions"
import { uploadAnamnesePhoto } from "./photo-actions"
import { ConsentFooter } from "./consent-footer"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import type { AnamnesePhotoKind } from "@/generated/prisma/client"

const PHOTO_KIND_LABELS: Record<AnamnesePhotoKind, string> = {
  ANTES: "Antes",
  DEPOIS: "Depois",
  GERAL: "Geral",
}

function appointmentLabel(appointment: {
  startAt: Date
  services: { service: { name: string } }[]
}): string {
  const serviceNames = appointment.services
    .map((appointmentService) => appointmentService.service.name)
    .join(", ")
  const dateLabel = formatDateTimeBR(appointment.startAt)
  return serviceNames ? `${dateLabel} - ${serviceNames}` : dateLabel
}

function photoCaption(photo: {
  kind: AnamnesePhotoKind
  takenAt: Date
  appointment: {
    startAt: Date
    services: { service: { name: string } }[]
  } | null
}): string {
  const kindLabel = PHOTO_KIND_LABELS[photo.kind]
  const dateLabel = formatDateTimeBR(photo.takenAt)
  if (!photo.appointment) {
    return `${kindLabel} - ${dateLabel}`
  }
  return `${kindLabel} - ${dateLabel} - Atendimento: ${appointmentLabel(photo.appointment)}`
}

export default async function ProntuarioPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { businessId } = await requireSessionUser()

  const client = await prisma.client.findFirst({
    where: { id, ...(await getClientsVisibleToUser()) },
    select: { id: true, name: true },
  })

  if (!client) {
    notFound()
  }

  let record
  try {
    record = await getAnamneseRecord(id)
  } catch {
    notFound()
  }

  const business = await prisma.business.findUniqueOrThrow({
    where: { id: businessId },
    select: { name: true },
  })

  const appointments = await prisma.appointment.findMany({
    where: { clientId: id, businessId },
    orderBy: { startAt: "desc" },
    include: { services: { include: { service: { select: { name: true } } } } },
  })

  const photos = await prisma.anamnesePhoto.findMany({
    where: { clientId: id },
    orderBy: { takenAt: "desc" },
    include: {
      appointment: {
        include: { services: { include: { service: { select: { name: true } } } } },
      },
    },
  })

  const consentText = buildAnamneseConsentText(business.name)
  const saveAnamneseRecordWithId = saveAnamneseRecord.bind(null, id)
  const uploadAnamnesePhotoWithId = uploadAnamnesePhoto.bind(null, id)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2 font-medium text-foreground">
          Prontuário/Anamnese
        </h1>
        <p className="text-body-sm text-foreground-secondary">
          Ficha clínica de {client.name}.
        </p>
      </div>

      <form
        action={saveAnamneseRecordWithId}
        className="flex max-w-2xl flex-col gap-6"
      >
        <Card>
          <CardHeader>
            <CardTitle>Dados de saúde</CardTitle>
            <CardDescription>
              Usados para avaliar segurança e adequação dos procedimentos
              realizados neste cliente.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="allergies"
                className="text-body-sm font-medium text-foreground"
              >
                Alergias
              </label>
              <Textarea
                id="allergies"
                name="allergies"
                defaultValue={record?.allergies ?? ""}
                placeholder="Ex: alergia a látex, a determinado ácido, etc."
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="medications"
                className="text-body-sm font-medium text-foreground"
              >
                Medicamentos em uso
              </label>
              <Textarea
                id="medications"
                name="medications"
                defaultValue={record?.medications ?? ""}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="healthConditions"
                className="text-body-sm font-medium text-foreground"
              >
                Condições de saúde
              </label>
              <Textarea
                id="healthConditions"
                name="healthConditions"
                defaultValue={record?.healthConditions ?? ""}
                placeholder="Ex: gestação, diabetes, problemas de pele, etc."
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="previousProcedures"
                className="text-body-sm font-medium text-foreground"
              >
                Procedimentos anteriores
              </label>
              <Textarea
                id="previousProcedures"
                name="previousProcedures"
                defaultValue={record?.previousProcedures ?? ""}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="contraindications"
                className="text-body-sm font-medium text-foreground"
              >
                Contraindicações
              </label>
              <Textarea
                id="contraindications"
                name="contraindications"
                defaultValue={record?.contraindications ?? ""}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="notes"
                className="text-body-sm font-medium text-foreground"
              >
                Observações
              </label>
              <Textarea
                id="notes"
                name="notes"
                defaultValue={record?.notes ?? ""}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Consentimento</CardTitle>
            <CardDescription>
              Este texto é exibido a cada salvamento e fica registrado no
              histórico de consentimento.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line text-body-sm text-foreground-secondary">
              {consentText}
            </p>
          </CardContent>
          <CardFooter>
            <ConsentFooter cancelHref={`/clientes/${id}/editar`} />
          </CardFooter>
        </Card>
      </form>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Fotos</CardTitle>
          <CardDescription>
            Fotos de evolução do cliente, vinculadas ou não a um atendimento.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {record ? (
            <form
              action={uploadAnamnesePhotoWithId}
              className="flex flex-col gap-4 rounded-lg border border-border p-4"
            >
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="file"
                  className="text-body-sm font-medium text-foreground"
                >
                  Arquivo *
                </label>
                <input
                  id="file"
                  name="file"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  required
                  className="text-body-sm text-foreground-secondary file:mr-3 file:rounded-lg file:border-0 file:bg-primary-light file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary hover:file:bg-primary-light/80"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="kind"
                  className="text-body-sm font-medium text-foreground"
                >
                  Tipo *
                </label>
                <select
                  id="kind"
                  name="kind"
                  required
                  defaultValue="GERAL"
                  className="h-8 w-full max-w-xs rounded-lg border border-input bg-surface px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="ANTES">Antes</option>
                  <option value="DEPOIS">Depois</option>
                  <option value="GERAL">Geral</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="appointmentId"
                  className="text-body-sm font-medium text-foreground"
                >
                  Vincular a um atendimento
                </label>
                <select
                  id="appointmentId"
                  name="appointmentId"
                  defaultValue=""
                  className="h-8 w-full max-w-md rounded-lg border border-input bg-surface px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="">Nenhum</option>
                  {appointments.map((appointment) => (
                    <option key={appointment.id} value={appointment.id}>
                      {appointmentLabel(appointment)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Button type="submit" variant="default">
                  Enviar foto
                </Button>
              </div>
            </form>
          ) : (
            <p className="text-body-sm text-foreground-secondary">
              Preencha a ficha de anamnese acima antes de anexar fotos.
            </p>
          )}

          {photos.length === 0 ? (
            <p className="text-body-sm text-foreground-secondary">
              Nenhuma foto registrada ainda.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {photos.map((photo) => (
                <div key={photo.id} className="flex flex-col gap-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/anamnese-photos/${photo.id}`}
                    alt=""
                    className="aspect-square w-full rounded-lg border border-border object-cover"
                  />
                  <p className="text-micro text-foreground-secondary">
                    {photoCaption(photo)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
