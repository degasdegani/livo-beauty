"use client"

import { ArrowRight } from "lucide-react"
import Image from "next/image"

import { Button } from "@/components/ui/button"

function scrollToContact() {
  document.getElementById("contato")?.scrollIntoView({ behavior: "smooth" })
}

export function Hero() {
  return (
    <section className="relative mx-auto w-full max-w-[1600px] overflow-hidden px-10 py-24 md:py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 left-1/2 -z-10 h-[800px] w-[1000px] -translate-x-1/2 rounded-full bg-primary/25 blur-3xl"
      />

      <div className="grid items-center gap-12 md:grid-cols-2">
        <div className="flex flex-col items-start gap-8 text-left">
          <p className="font-[family-name:var(--font-jost)] text-body-sm font-medium tracking-[0.15em] text-foreground">
            LIVO BEAUTY
          </p>
          <h1 className="max-w-xl text-display-m leading-[1.05] font-medium tracking-tight text-foreground md:text-display-xl">
            Sua clínica ou salão, no nível dos{" "}
            <span className="text-primary">melhores softwares do mundo</span>.
          </h1>
          <p className="max-w-md text-body-lg text-foreground-secondary">
            Agenda, clientes, financeiro, estoque e prontuário — tudo em uma
            plataforma premium feita para negócios de estética que querem
            parecer, e ser, profissionais.
          </p>
          <div className="flex flex-col gap-3">
            <Button size="lg" onPress={scrollToContact} className="group">
              Começar agora — R$ 129,90/mês
              <ArrowRight
                strokeWidth={1.75}
                className="size-4 transition-transform group-hover:translate-x-0.5"
              />
            </Button>
            <p className="text-caption text-muted-foreground">
              Sem fidelidade. Cancele quando quiser.
            </p>
          </div>
        </div>

        <div className="relative">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 -rotate-3 translate-x-3 translate-y-3 rounded-xl bg-primary-light"
          />
          <div className="w-full overflow-hidden rounded-xl border border-border shadow-lg">
            <div className="flex h-9 items-center gap-1.5 rounded-t-xl border-b border-border bg-surface px-4">
              <span className="size-2.5 rounded-full bg-error/40" />
              <span className="size-2.5 rounded-full bg-warning/40" />
              <span className="size-2.5 rounded-full bg-success/40" />
            </div>
            <Image
              src="/dashboard-preview.png"
              alt="Painel do LIVO Beauty com agenda, KPIs e atendimentos do dia"
              width={1345}
              height={1169}
              priority
              className="h-auto max-h-[480px] w-full rounded-b-xl object-cover object-top"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
