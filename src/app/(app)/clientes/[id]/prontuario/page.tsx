import { notFound } from "next/navigation"

import { prisma } from "@/lib/prisma"
import { getClientsVisibleToUser, requireSessionUser } from "@/lib/access"
import { buildAnamneseConsentText } from "@/lib/anamnese-consent"
import { getAnamneseRecord, saveAnamneseRecord } from "./actions"
import { ConsentFooter } from "./consent-footer"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"

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

  const consentText = buildAnamneseConsentText(business.name)
  const saveAnamneseRecordWithId = saveAnamneseRecord.bind(null, id)

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
    </div>
  )
}
