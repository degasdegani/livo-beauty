import { redirect } from "next/navigation"

import { auth } from "@/lib/auth"

export async function requireBusinessId(): Promise<string> {
  const session = await auth()
  const businessId = session?.user?.businessId

  if (!businessId) {
    redirect("/login")
  }

  return businessId
}
