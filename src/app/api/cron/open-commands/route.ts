import { NextRequest, NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { openCommandForAppointment } from "@/lib/commands"
import type { AppointmentStatus } from "@/generated/prisma/client"

const INACTIVE_STATUSES: AppointmentStatus[] = ["AUSENTE", "CANCELADO"]

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()

  const appointments = await prisma.appointment.findMany({
    where: {
      startAt: { lte: now },
      status: { notIn: INACTIVE_STATUSES },
      command: null,
    },
    select: { id: true },
  })

  let opened = 0
  let failed = 0

  for (const appointment of appointments) {
    try {
      const result = await prisma.$transaction((tx) =>
        openCommandForAppointment(tx, appointment.id)
      )
      if ("error" in result) {
        failed++
      } else {
        opened++
      }
    } catch {
      failed++
    }
  }

  return NextResponse.json({
    processed: appointments.length,
    opened,
    failed,
  })
}
