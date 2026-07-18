import "dotenv/config"
import bcrypt from "bcryptjs"

import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  const business = await prisma.business.upsert({
    where: { slug: "salao-teste" },
    update: {},
    create: {
      name: "Salão de Teste",
      slug: "salao-teste",
      businessType: "SALON",
    },
  })

  const passwordHash = await bcrypt.hash("teste123", 10)

  await prisma.user.upsert({
    where: { email: "teste@livobeauty.com.br" },
    update: {},
    create: {
      email: "teste@livobeauty.com.br",
      password: passwordHash,
      role: "OWNER",
      businessId: business.id,
    },
  })

  console.log("Seed concluído: negócio e usuário de teste prontos.")
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
