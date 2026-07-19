import type { DefaultSession } from "next-auth"

import type { UserRole } from "@/generated/prisma/client"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      businessId: string
      role: UserRole
    } & DefaultSession["user"]
  }

  interface User {
    businessId: string
    role: UserRole
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    businessId: string
    role: UserRole
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    businessId: string
    role: UserRole
  }
}
