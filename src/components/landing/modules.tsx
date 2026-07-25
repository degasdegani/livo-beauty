import {
  BarChart3,
  Calendar,
  Package,
  ShieldCheck,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react"

type ModuleItem = {
  icon: LucideIcon
  title: string
  description: string
}

const MODULES: ModuleItem[] = [
  {
    icon: Calendar,
    title: "Agenda",
    description:
      "confirmação automática por WhatsApp, sem faltas por esquecimento",
  },
  {
    icon: Users,
    title: "Clientes",
    description:
      "histórico completo de cada pessoa que passa pelo seu negócio",
  },
  {
    icon: Wallet,
    title: "Financeiro",
    description:
      "fluxo de caixa e comissões sob controle, sem planilha",
  },
  {
    icon: Package,
    title: "Estoque",
    description:
      "saiba quando repor, com fornecedores organizados",
  },
  {
    icon: BarChart3,
    title: "Relatórios",
    description:
      "faturamento, comissões e clientes em poucos cliques",
  },
  {
    icon: ShieldCheck,
    title: "Prontuário/Anamnese",
    description:
      "dado de saúde protegido, com consentimento e trilha de auditoria",
  },
]

export function Modules() {
  return (
    <section className="mx-auto w-full max-w-[1600px] px-10 py-24">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map(({ icon: Icon, title, description }) => (
          <div
            key={title}
            className="relative flex flex-col gap-3 rounded-xl border border-border bg-surface p-8 shadow-xs transition-all duration-150 hover:-translate-y-1 hover:border-primary/40 hover:shadow-md"
          >
            <div className="flex size-12 items-center justify-center rounded-lg bg-primary-light text-primary">
              <Icon strokeWidth={1.75} className="size-6" />
            </div>
            <h3 className="text-h5 font-medium text-foreground">{title}</h3>
            <p className="text-body-sm text-foreground-secondary">
              {description}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
