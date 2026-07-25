"use client"

import { Check } from "lucide-react"

import { Button } from "@/components/ui/button"

const INCLUDED_ITEMS = [
  "Agenda com confirmação automática por WhatsApp",
  "CRM completo de clientes",
  "Financeiro e comissões",
  "Controle de estoque e fornecedores",
  "Relatórios de faturamento",
  "Prontuário/Anamnese com LGPD",
]

function scrollToContact() {
  document.getElementById("contato")?.scrollIntoView({ behavior: "smooth" })
}

export function Pricing() {
  return (
    <section className="bg-foreground px-10 py-24">
      <div className="mx-auto grid w-full max-w-4xl grid-cols-1 items-center gap-10 md:grid-cols-2">
        <div>
          <h2 className="mb-6 text-h2 font-medium text-background">
            Um plano. Sem letra miúda.
          </h2>
          <ul className="flex flex-col gap-3">
            {INCLUDED_ITEMS.map((item) => (
              <li
                key={item}
                className="flex items-center gap-2.5 text-body text-background/80"
              >
                <Check strokeWidth={1.75} className="size-4 shrink-0 text-accent-teal" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col items-center gap-6 rounded-2xl border border-border bg-background p-10 text-center shadow-md">
          <p className="text-body-sm font-medium text-foreground-secondary">
            Um plano. Tudo incluso.
          </p>
          <p className="flex items-baseline gap-1 text-foreground">
            <span className="text-display-m font-medium">R$ 129,90</span>
            <span className="text-body text-foreground-secondary">/mês</span>
          </p>
          <Button size="lg" onPress={scrollToContact} className="w-full">
            Falar com a gente
          </Button>
        </div>
      </div>
    </section>
  )
}
