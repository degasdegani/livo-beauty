"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDecimalToBRL } from "@/lib/masks"
import { COMMAND_STATUS_LABEL, COMMAND_STATUS_BADGE_VARIANT } from "./status"
import { CommandDrawer, type CommandDrawerState } from "./command-drawer"
import type { CommandStatus } from "@/generated/prisma/client"

export type CommandRow = {
  id: string
  clientName: string
  professionalNames: string[]
  total: number
  status: CommandStatus
}

export function CommandsList({ rows }: { rows: CommandRow[] }) {
  const router = useRouter()
  const [drawerState, setDrawerState] = React.useState<CommandDrawerState>({
    mode: "closed",
  })

  function handleOpen(commandId: string) {
    setDrawerState({ mode: "open", commandId })
  }

  function handleOpenChange(open: boolean) {
    if (!open) setDrawerState({ mode: "closed" })
  }

  function handleChanged() {
    router.refresh()
  }

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-body-sm text-muted-foreground">
          Nenhuma comanda ainda.
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardContent className="flex flex-col divide-y divide-border p-0">
          {rows.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => handleOpen(row.id)}
              className="flex flex-col gap-2 p-4 text-left transition-colors duration-150 ease-out hover:bg-background sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-body-sm font-medium text-foreground">
                    {row.clientName}
                  </span>
                  <Badge variant={COMMAND_STATUS_BADGE_VARIANT[row.status]}>
                    {COMMAND_STATUS_LABEL[row.status]}
                  </Badge>
                </div>
                <span className="text-body-sm text-foreground-secondary">
                  {row.professionalNames.join(", ")}
                </span>
              </div>
              <span className="text-body-sm font-medium text-foreground">
                {formatDecimalToBRL(row.total)}
              </span>
            </button>
          ))}
        </CardContent>
      </Card>

      <CommandDrawer
        state={drawerState}
        onOpenChange={handleOpenChange}
        onChanged={handleChanged}
      />
    </>
  )
}
