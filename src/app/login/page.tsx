"use client"

import type { FormEvent } from "react"
import { signIn } from "next-auth/react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function LoginPage() {
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)

    await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirect: true,
      callbackUrl: "/dashboard",
    })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-border bg-surface p-6"
      >
        <div>
          <h1 className="text-h4 font-medium text-foreground">Entrar</h1>
          <p className="text-body-sm text-foreground-secondary">
            LIVO Beauty
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="email"
            className="text-body-sm font-medium text-foreground"
          >
            Email
          </label>
          <Input id="email" name="email" type="email" required />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="password"
            className="text-body-sm font-medium text-foreground"
          >
            Senha
          </label>
          <Input id="password" name="password" type="password" required />
        </div>

        <Button type="submit" variant="default">
          Entrar
        </Button>
      </form>
    </div>
  )
}
