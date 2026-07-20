import { createClient } from "../actions"
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

export default function NovoClientePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2 font-medium text-foreground">Novo cliente</h1>
        <p className="text-body-sm text-foreground-secondary">
          Nome e WhatsApp já são suficientes para começar — complete o resto
          quando quiser.
        </p>
      </div>

      <form action={createClient} className="flex max-w-lg flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Dados do cliente</CardTitle>
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
                Nome completo *
              </label>
              <Input
                id="name"
                name="name"
                placeholder="Ex: Maria Silva"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="phone"
                className="text-body-sm font-medium text-foreground"
              >
                WhatsApp *
              </label>
              <MaskedInput
                id="phone"
                name="phone"
                mask="phone"
                placeholder="(11) 99999-9999"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="birthDate"
                className="text-body-sm font-medium text-foreground"
              >
                Data de nascimento
              </label>
              <Input id="birthDate" name="birthDate" type="date" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="instagram"
                className="text-body-sm font-medium text-foreground"
              >
                Instagram
              </label>
              <Input
                id="instagram"
                name="instagram"
                placeholder="@usuario"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="origin"
                className="text-body-sm font-medium text-foreground"
              >
                Como conheceu o salão?
              </label>
              {/* Select nativo por enquanto — sem componente customizado ainda */}
              <select
                id="origin"
                name="origin"
                defaultValue=""
                className="h-8 w-full rounded-lg border border-input bg-surface px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">Não informado</option>
                <option value="INDICACAO">Indicação</option>
                <option value="INSTAGRAM">Instagram</option>
                <option value="GOOGLE">Google</option>
                <option value="FACHADA">Fachada</option>
                <option value="OUTRO">Outro</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Endereço</CardTitle>
            <CardDescription>Todos os campos são opcionais</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="addressZipCode"
                className="text-body-sm font-medium text-foreground"
              >
                CEP
              </label>
              <MaskedInput
                id="addressZipCode"
                name="addressZipCode"
                mask="cep"
                placeholder="00000-000"
                className="max-w-40"
              />
            </div>

            <div className="flex gap-4">
              <div className="flex flex-1 flex-col gap-1.5">
                <label
                  htmlFor="addressStreet"
                  className="text-body-sm font-medium text-foreground"
                >
                  Rua
                </label>
                <Input id="addressStreet" name="addressStreet" />
              </div>
              <div className="flex w-28 flex-col gap-1.5">
                <label
                  htmlFor="addressNumber"
                  className="text-body-sm font-medium text-foreground"
                >
                  Número
                </label>
                <Input id="addressNumber" name="addressNumber" />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="addressComplement"
                className="text-body-sm font-medium text-foreground"
              >
                Complemento
              </label>
              <Input id="addressComplement" name="addressComplement" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="addressNeighborhood"
                className="text-body-sm font-medium text-foreground"
              >
                Bairro
              </label>
              <Input id="addressNeighborhood" name="addressNeighborhood" />
            </div>

            <div className="flex gap-4">
              <div className="flex flex-1 flex-col gap-1.5">
                <label
                  htmlFor="addressCity"
                  className="text-body-sm font-medium text-foreground"
                >
                  Cidade
                </label>
                <Input id="addressCity" name="addressCity" />
              </div>
              <div className="flex w-24 flex-col gap-1.5">
                <label
                  htmlFor="addressState"
                  className="text-body-sm font-medium text-foreground"
                >
                  UF
                </label>
                <Input id="addressState" name="addressState" maxLength={2} />
              </div>
            </div>
          </CardContent>
          <CardFooter className="justify-end gap-3">
            <LinkButton href="/clientes" variant="outline">
              Cancelar
            </LinkButton>
            <Button type="submit" variant="default">
              Salvar cliente
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}
