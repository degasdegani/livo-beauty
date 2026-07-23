import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  createAnamneseCustomField,
  deleteAnamneseCustomField,
} from "./anamnese-fields-actions"
import { MAX_ANAMNESE_CUSTOM_FIELDS } from "./anamnese-field-constants"
import type { AnamneseCustomField } from "@/generated/prisma/client"

const FIELD_TYPE_LABELS: Record<AnamneseCustomField["type"], string> = {
  TEXT: "Texto",
  BOOLEAN: "Sim/Não",
}

export function AnamneseCustomFields({
  fields,
}: {
  fields: AnamneseCustomField[]
}) {
  const limitReached = fields.length >= MAX_ANAMNESE_CUSTOM_FIELDS

  return (
    <div className="flex flex-col gap-4 border-t border-border pt-4">
      <div>
        <p className="text-body-sm font-medium text-foreground">
          Campos customizáveis
        </p>
        <p className="text-micro text-muted-foreground">
          Campos adicionais exibidos na ficha de anamnese, além dos campos
          padrão. Até {MAX_ANAMNESE_CUSTOM_FIELDS} campos.
        </p>
      </div>

      {fields.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {fields.map((field) => (
            <li
              key={field.id}
              className="flex items-center justify-between gap-4 rounded-lg border border-border px-3 py-2"
            >
              <span className="text-body-sm text-foreground">
                {field.label}{" "}
                <span className="text-micro text-muted-foreground">
                  ({FIELD_TYPE_LABELS[field.type]})
                </span>
              </span>
              <form action={deleteAnamneseCustomField.bind(null, field.id)}>
                <Button type="submit" variant="destructive" size="sm">
                  Remover
                </Button>
              </form>
            </li>
          ))}
        </ul>
      ) : null}

      {limitReached ? (
        <p className="text-micro text-muted-foreground">
          Limite de {MAX_ANAMNESE_CUSTOM_FIELDS} campos customizáveis
          atingido.
        </p>
      ) : (
        <form
          action={createAnamneseCustomField}
          className="flex flex-wrap items-end gap-3"
        >
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="label"
              className="text-body-sm font-medium text-foreground"
            >
              Nome do campo
            </label>
            <Input
              id="label"
              name="label"
              placeholder="Ex: Tipo de pele"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="type"
              className="text-body-sm font-medium text-foreground"
            >
              Tipo
            </label>
            <select
              id="type"
              name="type"
              defaultValue="TEXT"
              className="h-8 rounded-lg border border-input bg-surface px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="TEXT">Texto</option>
              <option value="BOOLEAN">Sim/Não</option>
            </select>
          </div>

          <Button type="submit" variant="outline">
            Adicionar campo
          </Button>
        </form>
      )}
    </div>
  )
}
