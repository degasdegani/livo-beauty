import { prisma } from "@/lib/prisma"

/**
 * Reserva atomica de uma vaga de "membro fundador". Usa UPDATE...RETURNING
 * condicional via SQL bruto para evitar race condition de dois cadastros
 * simultaneos disputando a ultima vaga — um read-then-write comum (SELECT
 * seguido de UPDATE) tem essa brecha, este UPDATE nao tem: o WHERE
 * "claimedCount" < "maxSlots" e avaliado atomicamente pelo Postgres na
 * mesma linha bloqueada pelo proprio UPDATE.
 *
 * Retorna true se a vaga foi reservada, false se as vagas ja se esgotaram.
 */
export async function claimFoundingSlot(): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ claimedCount: number }[]>`
    UPDATE "founding_slot_counters"
    SET "claimedCount" = "claimedCount" + 1, "updatedAt" = now()
    WHERE id = 'singleton' AND "claimedCount" < "maxSlots"
    RETURNING "claimedCount"
  `

  return rows.length > 0
}

/**
 * Libera uma vaga de fundador (ex: trial expirou sem conversao em
 * pagamento). Nunca deixa claimedCount ficar negativo.
 */
export async function releaseFoundingSlot(): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "founding_slot_counters"
    SET "claimedCount" = GREATEST("claimedCount" - 1, 0), "updatedAt" = now()
    WHERE id = 'singleton'
  `
}

/**
 * Leitura pura (sem UPDATE) de quantas vagas de fundador ainda restam, para
 * exibir na landing/pricing. Numero exato ("faltam N de 25 vagas") e decisao
 * de produto ja tomada — nao arredondar nem esconder.
 */
export async function getRemainingFoundingSlots(): Promise<number> {
  const counter = await prisma.foundingSlotCounter.findUnique({
    where: { id: "singleton" },
  })

  if (!counter) return 0

  return Math.max(counter.maxSlots - counter.claimedCount, 0)
}
