"use client"

import { ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"

function scrollToContact() {
  document.getElementById("contato")?.scrollIntoView({ behavior: "smooth" })
}

export function Header() {
  return (
    <header className="sticky top-0 z-50 h-16 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between px-10">
        <p className="font-[family-name:var(--font-jost)] text-body-sm font-medium tracking-[0.15em] text-foreground">
          LIVO BEAUTY
        </p>
        <Button onPress={scrollToContact} className="group">
          Começar agora
          <ArrowRight
            strokeWidth={1.75}
            className="size-4 transition-transform group-hover:translate-x-0.5"
          />
        </Button>
      </div>
    </header>
  )
}
