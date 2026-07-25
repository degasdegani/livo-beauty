"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { MaskedInput } from "@/components/ui/masked-input"
import { Input } from "@/components/ui/input"

const BUSINESS_TYPES = ["Salão", "Clínica de estética", "Outro"] as const

export function ContactForm() {
  const [nome, setNome] = React.useState("")
  const [whatsapp, setWhatsapp] = React.useState("")
  const [tipoNegocio, setTipoNegocio] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)

  function handleSubmit() {
    if (!nome.trim() || !whatsapp.trim() || !tipoNegocio) {
      setError("Preencha nome, WhatsApp e tipo de negócio para continuar.")
      return
    }

    setError(null)

    const message = `Olá! Meu nome é ${nome}, tenho um(a) ${tipoNegocio} e quero conhecer o LIVO Beauty. Meu WhatsApp: ${whatsapp}`
    const url = `https://wa.me/5516992813674?text=${encodeURIComponent(message)}`
    window.open(url, "_blank")
  }

  return (
    <section id="contato" className="px-10 py-24">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 rounded-2xl border border-border bg-surface p-10 shadow-md">
        <div className="flex flex-col gap-2 text-center">
          <h2 className="text-h2 font-medium text-foreground">
            Vamos conversar
          </h2>
          <p className="text-body text-foreground-secondary">
            Preencha seus dados e continue a conversa no WhatsApp.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="contactNome"
              className="text-body-sm font-medium text-foreground"
            >
              Nome *
            </label>
            <Input
              id="contactNome"
              value={nome}
              onChange={(event) => setNome(event.target.value)}
              placeholder="Seu nome"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="contactWhatsapp"
              className="text-body-sm font-medium text-foreground"
            >
              WhatsApp *
            </label>
            <MaskedInput
              id="contactWhatsapp"
              mask="phone"
              value={whatsapp}
              onChange={(event) => setWhatsapp(event.target.value)}
              placeholder="(16) 99999-9999"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="contactTipoNegocio"
              className="text-body-sm font-medium text-foreground"
            >
              Tipo de negócio *
            </label>
            <select
              id="contactTipoNegocio"
              value={tipoNegocio}
              onChange={(event) => setTipoNegocio(event.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-surface px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="" disabled>
                Selecione...
              </option>
              {BUSINESS_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error ? (
          <p className="w-full rounded-lg bg-error-light px-3 py-2 text-body-sm text-error">
            {error}
          </p>
        ) : null}

        <Button size="lg" onPress={handleSubmit} className="w-full">
          Falar com a gente
        </Button>
      </div>
    </section>
  )
}
