import { prisma } from "@/lib/prisma"
import { requireSessionUser } from "@/lib/access"
import { requireProfessionalId } from "@/lib/session"
import { CommandsList, type CommandRow } from "./comandas-list"
import type { Prisma } from "@/generated/prisma/client"

export default async function ComandasPage() {
  const { businessId, role } = await requireSessionUser()

  const where: Prisma.CommandWhereInput = { businessId }
  if (role === "PROFESSIONAL") {
    const professionalId = await requireProfessionalId()
    where.items = { some: { professionalId } }
  }

  const commands = await prisma.command.findMany({
    where,
    include: {
      client: { select: { name: true } },
      items: {
        select: {
          unitPrice: true,
          quantity: true,
          professional: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { openedAt: "desc" },
  })

  const rows: CommandRow[] = commands.map((command) => ({
    id: command.id,
    clientName: command.client.name,
    professionalNames: Array.from(
      new Map(
        command.items.map((item) => [item.professional.id, item.professional.name])
      ).values()
    ),
    total: command.items.reduce(
      (sum, item) => sum + item.unitPrice.toNumber() * item.quantity,
      0
    ),
    status: command.status,
  }))

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-h2 font-medium text-foreground">Comandas</h1>
        <p className="text-body-sm text-foreground-secondary">
          Comandas abertas, fechadas e canceladas do salão.
        </p>
      </div>

      <CommandsList rows={rows} />
    </div>
  )
}
