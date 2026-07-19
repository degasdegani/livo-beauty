"use client"

import * as React from "react"
import { toast } from "sonner"

import { Switch } from "@/components/ui/switch"
import {
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/actions/push-subscription"
import { urlBase64ToUint8Array } from "@/lib/push"

export function PushNotificationToggle() {
  const [isSupported, setIsSupported] = React.useState(false)
  const [isChecking, setIsChecking] = React.useState(true)
  const [isSubscribed, setIsSubscribed] = React.useState(false)
  const [permission, setPermission] =
    React.useState<NotificationPermission>("default")
  const [isPending, startTransition] = React.useTransition()

  React.useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window

    setIsSupported(supported)

    if (!supported) {
      setIsChecking(false)
      return
    }

    setPermission(Notification.permission)

    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => {
        setIsSubscribed(subscription !== null)
      })
      .catch(() => {
        setIsSubscribed(false)
      })
      .finally(() => {
        setIsChecking(false)
      })
  }, [])

  async function enablePush() {
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

    if (!vapidPublicKey) {
      toast.error("Configuração de notificações ausente.")
      return
    }

    const permissionResult = await Notification.requestPermission()
    setPermission(permissionResult)

    if (permissionResult !== "granted") {
      toast.error("Permissão de notificações não concedida.")
      return
    }

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      })

      const { endpoint, keys } = subscription.toJSON() as {
        endpoint: string
        keys: { p256dh: string; auth: string }
      }

      const result = await subscribeToPush({ endpoint, keys })

      if (!result.success) {
        await subscription.unsubscribe()
        toast.error(result.error ?? "Erro ao ativar notificações.")
        return
      }

      setIsSubscribed(true)
      toast.success("Notificações de agendamento ativadas.")
    } catch {
      toast.error("Não foi possível ativar as notificações.")
    }
  }

  async function disablePush() {
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        const endpoint = subscription.endpoint
        await subscription.unsubscribe()
        const result = await unsubscribeFromPush(endpoint)

        if (!result.success) {
          toast.error(result.error ?? "Erro ao desativar notificações.")
          return
        }
      }

      setIsSubscribed(false)
      toast.success("Notificações de agendamento desativadas.")
    } catch {
      toast.error("Não foi possível desativar as notificações.")
    }
  }

  function handleChange(checked: boolean) {
    startTransition(async () => {
      if (checked) {
        await enablePush()
      } else {
        await disablePush()
      }
    })
  }

  if (isChecking) {
    return (
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <div className="h-4 w-48 animate-pulse rounded bg-muted" />
          <div className="h-3 w-64 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-[18.4px] w-8 animate-pulse rounded-full bg-muted" />
      </div>
    )
  }

  if (!isSupported) {
    return (
      <div className="flex flex-col gap-1">
        <p className="text-body-sm font-medium text-foreground">
          Notificações de agendamento
        </p>
        <p className="text-micro text-muted-foreground">
          Seu navegador não suporta notificações push.
        </p>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col gap-1">
        <label
          htmlFor="push-notification-toggle"
          className="text-body-sm font-medium text-foreground"
        >
          Notificações de agendamento
        </label>
        <p className="text-micro text-muted-foreground">
          Receba um aviso quando um agendamento estiver próximo.
        </p>
        {permission === "denied" && (
          <p className="text-micro text-warning">
            As notificações foram bloqueadas no navegador. Habilite
            manualmente nas configurações do site para ativar.
          </p>
        )}
      </div>
      <Switch
        id="push-notification-toggle"
        isSelected={isSubscribed}
        onChange={handleChange}
        isDisabled={isPending || permission === "denied"}
      />
    </div>
  )
}
