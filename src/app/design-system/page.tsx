import { Button, LinkButton } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardAction,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Sparkles } from "lucide-react"

const colorSwatches: { label: string; className: string; hex: string }[] = [
  { label: "Background", className: "bg-background", hex: "#F8FAFC" },
  { label: "Surface", className: "bg-surface", hex: "#FFFFFF" },
  { label: "Border", className: "bg-border", hex: "#E7ECF3" },
  { label: "Primary", className: "bg-primary", hex: "#7C6CF6" },
  { label: "Primary Hover", className: "bg-primary-hover", hex: "#6B5AF0" },
  { label: "Primary Light", className: "bg-primary-light", hex: "#F3F0FF" },
  { label: "Accent", className: "bg-accent-teal", hex: "#3DD6C1" },
  { label: "Accent Light", className: "bg-accent-teal-light", hex: "#E8FFFA" },
  { label: "Success", className: "bg-success", hex: "#10B981" },
  { label: "Warning", className: "bg-warning", hex: "#F59E0B" },
  { label: "Error", className: "bg-error", hex: "#EF4444" },
  { label: "Info*", className: "bg-info", hex: "#3B82F6" },
  { label: "Text Primary", className: "bg-foreground", hex: "#111827" },
  {
    label: "Text Secondary",
    className: "bg-foreground-secondary",
    hex: "#4B5563",
  },
  { label: "Text Muted", className: "bg-muted-foreground", hex: "#94A3B8" },
]

const typeScale: { label: string; className: string; px: string }[] = [
  { label: "Display XL", className: "text-display-xl", px: "64px" },
  { label: "Display L", className: "text-display-l", px: "56px" },
  { label: "Display M", className: "text-display-m", px: "48px" },
  { label: "H1", className: "text-h1", px: "40px" },
  { label: "H2", className: "text-h2", px: "32px" },
  { label: "H3", className: "text-h3", px: "28px" },
  { label: "H4", className: "text-h4", px: "24px" },
  { label: "H5", className: "text-h5", px: "20px" },
  { label: "Body Large", className: "text-body-lg", px: "18px" },
  { label: "Body", className: "text-body", px: "16px" },
  { label: "Body Small", className: "text-body-sm", px: "14px" },
  { label: "Caption", className: "text-caption", px: "12px" },
  { label: "Micro", className: "text-micro", px: "11px" },
]

const spacingScale = [
  { label: "4", className: "w-1" },
  { label: "8", className: "w-2" },
  { label: "12", className: "w-3" },
  { label: "16", className: "w-4" },
  { label: "20", className: "w-5" },
  { label: "24", className: "w-6" },
  { label: "32", className: "w-8" },
  { label: "40", className: "w-10" },
  { label: "48", className: "w-12" },
  { label: "56", className: "w-14" },
  { label: "64", className: "w-16" },
  { label: "80", className: "w-20" },
  { label: "96", className: "w-24" },
  { label: "128", className: "w-32" },
]

const radiusScale = [
  { label: "xs / 4px", className: "rounded-xs" },
  { label: "sm / 8px", className: "rounded-sm" },
  { label: "md / 12px", className: "rounded-md" },
  { label: "lg / 16px", className: "rounded-lg" },
  { label: "xl / 20px", className: "rounded-xl" },
  { label: "2xl / 24px", className: "rounded-2xl" },
  { label: "full / 9999px", className: "rounded-full" },
]

const shadowScale = [
  { label: "xs", className: "shadow-xs" },
  { label: "sm", className: "shadow-sm" },
  { label: "md", className: "shadow-md" },
  { label: "lg", className: "shadow-lg" },
]

const statusBadges = [
  { label: "Confirmado", variant: "confirmado" as const },
  { label: "Em atendimento", variant: "em-atendimento" as const },
  { label: "Concluído", variant: "concluido" as const },
  { label: "Cancelado", variant: "cancelado" as const },
  { label: "Ausente", variant: "ausente" as const },
  { label: "Reagendado", variant: "reagendado" as const },
]

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-h4 font-medium text-foreground">{title}</h2>
      {children}
    </section>
  )
}

export default function DesignSystemPage() {
  return (
    <main className="mx-auto flex max-w-[1440px] flex-col gap-16 px-10 py-16">
      <header className="flex flex-col gap-2">
        <p className="text-caption font-medium tracking-wide text-muted-foreground uppercase">
          LIVO Beauty — Fundação
        </p>
        <h1 className="text-h1 font-medium text-foreground">Design System</h1>
        <p className="text-body text-foreground-secondary">
          Amostra dos design tokens e componentes base implementados a partir
          de docs/LIVO_BEAUTY_DESIGN_SYSTEM.md.
        </p>
      </header>

      <Section title="01. Cores">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {colorSwatches.map((swatch) => (
            <div key={swatch.label} className="flex flex-col gap-2">
              <div
                className={`h-16 rounded-lg border border-border ${swatch.className}`}
              />
              <div>
                <p className="text-body-sm font-medium text-foreground">
                  {swatch.label}
                </p>
                <p className="text-caption text-muted-foreground">
                  {swatch.hex}
                </p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-caption text-muted-foreground">
          * Info (azul) não consta no documento — token adicional criado para
          o status &quot;Em atendimento&quot; da Agenda.
        </p>
      </Section>

      <Section title="02. Tipografia">
        <div className="flex flex-col gap-4">
          {typeScale.map((step) => (
            <div
              key={step.label}
              className="flex items-baseline gap-6 border-b border-border pb-4"
            >
              <span className="w-32 shrink-0 text-caption text-muted-foreground">
                {step.label} · {step.px}
              </span>
              <span className={`${step.className} font-medium text-foreground`}>
                LIVO Beauty
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="03. Espaçamento">
        <div className="flex flex-col gap-2">
          {spacingScale.map((step) => (
            <div key={step.label} className="flex items-center gap-4">
              <span className="w-10 shrink-0 text-caption text-muted-foreground">
                {step.label}px
              </span>
              <div className={`h-3 rounded-xs bg-primary ${step.className}`} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="04. Raios">
        <div className="flex flex-wrap gap-6">
          {radiusScale.map((step) => (
            <div key={step.label} className="flex flex-col items-center gap-2">
              <div
                className={`h-16 w-16 border border-border bg-surface shadow-xs ${step.className}`}
              />
              <span className="text-caption text-muted-foreground">
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="05. Sombras">
        <div className="flex flex-wrap gap-8">
          {shadowScale.map((step) => (
            <div key={step.label} className="flex flex-col items-center gap-3">
              <div
                className={`h-16 w-16 rounded-lg bg-surface ${step.className}`}
              />
              <span className="text-caption text-muted-foreground">
                Shadow {step.label}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="06. Componentes">
        <div className="flex flex-col gap-10">
          <div className="flex flex-col gap-3">
            <h3 className="text-body-sm font-medium text-muted-foreground">
              Botões
            </h3>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="default">Primary</Button>
              <Button variant="outline">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="secondary">Secondary (shadcn)</Button>
              <LinkButton variant="link" href="#">
                Link
              </LinkButton>
              <Button variant="default" size="icon" aria-label="Ação com IA">
                <Sparkles strokeWidth={1.75} className="size-[18px]" />
              </Button>
              <Button variant="default" isDisabled>
                Loading…
              </Button>
            </div>
            <p className="text-caption text-muted-foreground">
              &quot;Secondary&quot; do documento corresponde à variante{" "}
              <code>outline</code> do shadcn (surface branca + borda) — a
              variante nativa <code>secondary</code> (cinza preenchido) foi
              mantida disponível à parte.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-body-sm font-medium text-muted-foreground">
              Card
            </h3>
            <Card className="max-w-sm">
              <CardHeader>
                <CardTitle>Card Title</CardTitle>
                <CardDescription>
                  Card description goes here with some supporting text.
                </CardDescription>
                <CardAction>
                  <Badge variant="confirmado">Confirmado</Badge>
                </CardAction>
              </CardHeader>
              <CardContent>
                <p className="text-body-sm text-foreground-secondary">
                  Conteúdo de exemplo do componente Card, usando os tokens de
                  surface, border e shadow.
                </p>
              </CardContent>
              <CardFooter>
                <Button variant="default" size="sm">
                  Ação principal
                </Button>
              </CardFooter>
            </Card>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-body-sm font-medium text-muted-foreground">
              Input
            </h3>
            <div className="flex max-w-sm flex-col gap-3">
              <Input placeholder="Default input" />
              <Input placeholder="Input desabilitado" disabled />
              <Input
                placeholder="Input com erro"
                aria-invalid="true"
                defaultValue="valor inválido"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-body-sm font-medium text-muted-foreground">
              Badges de status — Agenda
            </h3>
            <div className="flex flex-wrap gap-2">
              {statusBadges.map((badge) => (
                <Badge key={badge.label} variant={badge.variant}>
                  {badge.label}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </Section>
    </main>
  )
}
