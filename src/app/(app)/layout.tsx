import type { ReactNode } from "react"
import {
  Calendar,
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
  Sparkles,
  Truck,
  UserCog,
  Users,
  Wallet,
} from "lucide-react"

import { canAccessProducts, canManagePayables, canManageProfessionals, requireSessionUser } from "@/lib/access"
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration"
import { Sidebar, type SidebarNavItem } from "@/components/layout/sidebar"

export default async function AppLayout({
  children,
}: {
  children: ReactNode
}) {
  const { role } = await requireSessionUser()

  const navItems: SidebarNavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-5 w-5" /> },
    {
      href: "/agenda",
      label: "Agenda",
      icon: <Calendar className="h-5 w-5" />,
      subItem: { href: "/agenda/lista", label: "Ver como lista" },
    },
    { href: "/clientes", label: "Clientes", icon: <Users className="h-5 w-5" /> },
    ...(canManageProfessionals(role)
      ? [{ href: "/profissionais", label: "Profissionais", icon: <UserCog className="h-5 w-5" /> }]
      : []),
    { href: "/servicos", label: "Serviços", icon: <Sparkles className="h-5 w-5" /> },
    { href: "/comandas", label: "Comandas", icon: <Receipt className="h-5 w-5" /> },
    ...(canAccessProducts(role)
      ? [
          { href: "/produtos", label: "Produtos", icon: <Package className="h-5 w-5" /> },
          { href: "/fornecedores", label: "Fornecedores", icon: <Truck className="h-5 w-5" /> },
        ]
      : []),
    ...(canManagePayables(role)
      ? [{ href: "/financeiro/contas-a-pagar", label: "Financeiro", icon: <Wallet className="h-5 w-5" /> }]
      : []),
  ]

  const footerItem: SidebarNavItem = {
    href: "/configuracoes",
    label: "Configurações",
    icon: <Settings className="h-5 w-5" />,
  }

  return (
    <div className="flex min-h-full">
      <ServiceWorkerRegistration />
      <Sidebar items={navItems} footerItem={footerItem} />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-10 py-10">
          {children}
        </div>
      </main>
    </div>
  )
}
