import { prisma } from "@/lib/prisma"

export async function resolveClient(
  businessId: string,
  name: string,
  phone: string
) {
  const existing = await prisma.client.findFirst({
    where: { businessId, phone },
  })

  if (existing) return existing

  return prisma.client.create({
    data: { businessId, name, phone, fullProfileCompleted: false },
  })
}
