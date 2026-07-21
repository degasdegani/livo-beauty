import type { ReactNode } from "react"
import Link from "next/link"

import { canAccessProducts, requireSessionUser } from "@/lib/access"
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration"

export default async function AppLayout({
  children,
}: {
  children: ReactNode
}) {
  const { role } = await requireSessionUser()

  return (
    <div className="flex min-h-full flex-col">
      <ServiceWorkerRegistration />
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-[1440px] items-center gap-8 px-10 py-4">
          <span className="text-body font-medium text-foreground">
            LIVO Beauty
          </span>
          <nav className="flex items-center gap-6">
            <Link
              href="/agenda"
              className="text-body-sm text-foreground-secondary transition-colors hover:text-foreground"
            >
              Agenda
            </Link>
            <Link
              href="/agenda/lista"
              className="text-micro text-muted-foreground transition-colors hover:text-foreground-secondary"
            >
              Ver como lista
            </Link>
            <Link
              href="/clientes"
              className="text-body-sm text-foreground-secondary transition-colors hover:text-foreground"
            >
              Clientes
            </Link>
            <Link
              href="/profissionais"
              className="text-body-sm text-foreground-secondary transition-colors hover:text-foreground"
            >
              Profissionais
            </Link>
            <Link
              href="/servicos"
              className="text-body-sm text-foreground-secondary transition-colors hover:text-foreground"
            >
              Serviços
            </Link>
            {canAccessProducts(role) ? (
              <>
                <Link
                  href="/produtos"
                  className="text-body-sm text-foreground-secondary transition-colors hover:text-foreground"
                >
                  Produtos
                </Link>
                <Link
                  href="/fornecedores"
                  className="text-body-sm text-foreground-secondary transition-colors hover:text-foreground"
                >
                  Fornecedores
                </Link>
              </>
            ) : null}
            <Link
              href="/configuracoes"
              className="text-body-sm text-foreground-secondary transition-colors hover:text-foreground"
            >
              Configurações
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-8 px-10 py-10">
        {children}
      </main>
    </div>
  )
}
