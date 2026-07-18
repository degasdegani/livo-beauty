import { createProfessional } from "../actions"
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

export default function NovoProfissionalPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2 font-medium text-foreground">
          Novo profissional
        </h1>
        <p className="text-body-sm text-foreground-secondary">
          Cadastre um membro da equipe.
        </p>
      </div>

      <form action={createProfessional} className="flex max-w-lg flex-col">
        <Card>
          <CardHeader>
            <CardTitle>Dados do profissional</CardTitle>
            <CardDescription>
              Campos obrigatórios marcados com *
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="name"
                className="text-body-sm font-medium text-foreground"
              >
                Nome *
              </label>
              <Input id="name" name="name" placeholder="Ex: Ana Souza" required />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="phone"
                className="text-body-sm font-medium text-foreground"
              >
                WhatsApp
              </label>
              <MaskedInput
                id="phone"
                name="phone"
                mask="phone"
                placeholder="(11) 99999-9999"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="category"
                className="text-body-sm font-medium text-foreground"
              >
                Categoria *
              </label>
              {/* Select nativo por enquanto — sem componente customizado ainda */}
              <select
                id="category"
                name="category"
                defaultValue="SERVICE_PROVIDER"
                required
                className="h-8 w-full rounded-lg border border-input bg-surface px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="SERVICE_PROVIDER">Prestador de serviço</option>
                <option value="RECEPTION">Recepção</option>
              </select>
            </div>
          </CardContent>
          <CardFooter className="justify-end gap-3">
            <LinkButton href="/profissionais" variant="outline">
              Cancelar
            </LinkButton>
            <Button type="submit" variant="default">
              Salvar profissional
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}
