import { NextRequest, NextResponse } from "next/server"
import webpush from "web-push"

import { prisma } from "@/lib/prisma"
import { formatTimeBR } from "@/lib/datetime"
import type { AppointmentStatus } from "@/generated/prisma/client"

const CLOSED_STATUSES: AppointmentStatus[] = ["CANCELADO", "CONCLUIDO"]
const REMINDER_WINDOW_START_MINUTES = 25
const REMINDER_WINDOW_END_MINUTES = 35

function isGoneError(error: unknown): boolean {
  const statusCode = (error as { statusCode?: number })?.statusCode
  return statusCode === 410 || statusCode === 404
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT as string,
    process.env.VAPID_PUBLIC_KEY as string,
    process.env.VAPID_PRIVATE_KEY as string
  )

  const now = new Date()
  const windowStart = new Date(
    now.getTime() + REMINDER_WINDOW_START_MINUTES * 60 * 1000
  )
  const windowEnd = new Date(
    now.getTime() + REMINDER_WINDOW_END_MINUTES * 60 * 1000
  )

  const appointments = await prisma.appointment.findMany({
    where: {
      startAt: { gte: windowStart, lte: windowEnd },
      status: { notIn: CLOSED_STATUSES },
      pushReminderSentAt: null,
    },
    include: {
      client: { select: { name: true } },
      services: { include: { service: { select: { name: true } } } },
    },
  })

  let sent = 0
  let failed = 0

  for (const appointment of appointments) {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { professionalId: appointment.professionalId },
    })

    const serviceNames = appointment.services
      .map((appointmentService) => appointmentService.service.name)
      .join(", ")

    const payload = JSON.stringify({
      title: "Agendamento em breve",
      body: `${appointment.client.name} às ${formatTimeBR(appointment.startAt)} — ${serviceNames}`,
      url: "/agenda",
    })

    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          payload
        )
        sent++
      } catch (error) {
        failed++

        if (isGoneError(error)) {
          await prisma.pushSubscription.delete({
            where: { id: subscription.id },
          })
        }
      }
    }

    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { pushReminderSentAt: now },
    })
  }

  return NextResponse.json({
    processed: appointments.length,
    sent,
    failed,
  })
}
