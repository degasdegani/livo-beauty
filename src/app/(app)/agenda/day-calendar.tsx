"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDndMonitor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"

import { Button, LinkButton } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { formatSaoPauloDateLabel, shiftDateString } from "@/lib/datetime"
import { STATUS_BLOCK_CLASSES } from "./status"
import { rescheduleAppointment, resizeAppointment } from "./actions"
import { AppointmentDrawer, type AppointmentDrawerState } from "./appointment-drawer"
import {
  ProfessionalBlockDrawer,
  type ProfessionalBlockDrawerState,
} from "./professional-block-drawer"
import { AGENDA_WINDOW_START_MINUTES, AGENDA_WINDOW_END_MINUTES } from "./constants"
import type { ProfessionalOption } from "./appointment-form"
import type { AppointmentStatus } from "@/generated/prisma/client"

const SLOT_MINUTES = 30
const SLOT_HEIGHT_PX = 56
const PX_PER_MINUTE = SLOT_HEIGHT_PX / SLOT_MINUTES
const SLOT_COUNT =
  (AGENDA_WINDOW_END_MINUTES - AGENDA_WINDOW_START_MINUTES) / SLOT_MINUTES

const RESIZE_SNAP_MINUTES = 15
const MIN_APPOINTMENT_DURATION_MINUTES = 15
const RESIZE_ID_PREFIX = "resize::"

export type AppointmentBlockData = {
  id: string
  professionalId: string
  clientName: string
  serviceLabel: string
  status: AppointmentStatus
  room: string | null
  startMinutes: number
  durationMinutes: number
}

export type ProfessionalBlockData = {
  id: string
  professionalId: string
  reason: string | null
  startMinutes: number
  durationMinutes: number
  /** Rotulo do periodo REAL do bloqueio (nao recortado pela janela da grade) — usado na confirmacao de remocao. */
  rangeLabel: string
}

type SlotSelection = {
  professionalId: string
  anchorSlotIndex: number
  currentSlotIndex: number
}

function slotKey(professionalId: string, slotIndex: number): string {
  return `${professionalId}::${slotIndex}`
}

function slotIndexToMinutes(slotIndex: number): number {
  return AGENDA_WINDOW_START_MINUTES + slotIndex * SLOT_MINUTES
}

function minutesToTimeLabel(minutes: number): string {
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0")
  const mm = String(minutes % 60).padStart(2, "0")
  return `${hh}:${mm}`
}

function SlotCell({
  professionalId,
  slotIndex,
  blocked,
  selected,
  onSlotPointerDown,
  onSlotPointerEnter,
}: {
  professionalId: string
  slotIndex: number
  blocked: boolean
  selected: boolean
  onSlotPointerDown: (professionalId: string, slotIndex: number) => void
  onSlotPointerEnter: (professionalId: string, slotIndex: number) => void
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: slotKey(professionalId, slotIndex),
    disabled: blocked,
    data: { professionalId, slotIndex },
  })

  return (
    <div
      ref={setNodeRef}
      role={blocked ? undefined : "button"}
      onPointerDown={
        blocked ? undefined : () => onSlotPointerDown(professionalId, slotIndex)
      }
      onPointerEnter={
        blocked ? undefined : () => onSlotPointerEnter(professionalId, slotIndex)
      }
      style={{ height: SLOT_HEIGHT_PX }}
      className={cn(
        "border-b transition-colors duration-150 ease-out",
        slotIndex % 2 === 1 ? "border-border" : "border-border/50",
        !blocked && "cursor-pointer hover:bg-primary-light/50",
        (isOver || selected) && !blocked && "bg-primary-light/80"
      )}
    />
  )
}

/** Alca de redimensionamento na borda inferior do bloco — arrasta so o endAt, snap de 15min. */
function ResizeHandle({
  appointmentId,
  onResizeDelta,
  onResizeEnd,
}: {
  appointmentId: string
  onResizeDelta: (deltaMinutes: number | null) => void
  onResizeEnd: (deltaMinutes: number) => void
}) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: `${RESIZE_ID_PREFIX}${appointmentId}`,
  })
  const deltaRef = React.useRef(0)

  useDndMonitor({
    onDragStart(event) {
      if (event.active.id !== `${RESIZE_ID_PREFIX}${appointmentId}`) return
      deltaRef.current = 0
    },
    onDragMove(event) {
      if (event.active.id !== `${RESIZE_ID_PREFIX}${appointmentId}`) return
      const rawMinutes = event.delta.y / PX_PER_MINUTE
      const snapped =
        Math.round(rawMinutes / RESIZE_SNAP_MINUTES) * RESIZE_SNAP_MINUTES
      deltaRef.current = snapped
      onResizeDelta(snapped)
    },
    onDragEnd(event) {
      if (event.active.id !== `${RESIZE_ID_PREFIX}${appointmentId}`) return
      onResizeDelta(null)
      if (deltaRef.current !== 0) {
        onResizeEnd(deltaRef.current)
      }
      deltaRef.current = 0
    },
    onDragCancel(event) {
      if (event.active.id !== `${RESIZE_ID_PREFIX}${appointmentId}`) return
      onResizeDelta(null)
      deltaRef.current = 0
    },
  })

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      onPointerDown={(event) => {
        event.stopPropagation()
        listeners?.onPointerDown?.(event)
      }}
      onClick={(event) => event.stopPropagation()}
      aria-hidden="true"
      className="absolute inset-x-2 bottom-0 h-1.5 cursor-ns-resize touch-none rounded-full opacity-0 transition-opacity duration-150 ease-out group-hover:bg-foreground/15 group-hover:opacity-100"
    />
  )
}

function AppointmentBlockView({
  appointment,
  isDragging,
  onOpen,
  onResizeEnd,
}: {
  appointment: AppointmentBlockData
  isDragging: boolean
  onOpen: (id: string) => void
  onResizeEnd: (appointmentId: string, newDurationMinutes: number) => void
}) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: appointment.id,
    data: {
      professionalId: appointment.professionalId,
      startMinutes: appointment.startMinutes,
    },
  })
  const [resizeDeltaMinutes, setResizeDeltaMinutes] = React.useState<
    number | null
  >(null)

  const top = (appointment.startMinutes - AGENDA_WINDOW_START_MINUTES) * PX_PER_MINUTE
  const maxDelta =
    24 * 60 - appointment.startMinutes - appointment.durationMinutes
  const minDelta = MIN_APPOINTMENT_DURATION_MINUTES - appointment.durationMinutes
  const clampedDelta =
    resizeDeltaMinutes === null
      ? 0
      : Math.min(Math.max(resizeDeltaMinutes, minDelta), maxDelta)
  const effectiveDuration = appointment.durationMinutes + clampedDelta
  const height = Math.max(effectiveDuration * PX_PER_MINUTE - 2, 20)

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...listeners}
      {...attributes}
      onClick={() => onOpen(appointment.id)}
      style={{ top, height }}
      className={cn(
        "group absolute inset-x-1 flex flex-col items-start overflow-hidden rounded-md border-l-4 px-2 py-1 text-left shadow-xs transition-opacity duration-150 ease-out",
        STATUS_BLOCK_CLASSES[appointment.status],
        isDragging ? "opacity-0" : "opacity-100"
      )}
    >
      <span className="truncate text-micro font-medium text-foreground">
        {appointment.clientName}
      </span>
      <span className="truncate text-micro text-foreground-secondary">
        {appointment.serviceLabel}
      </span>

      <ResizeHandle
        appointmentId={appointment.id}
        onResizeDelta={setResizeDeltaMinutes}
        onResizeEnd={(deltaMinutes) => {
          const clamped = Math.min(Math.max(deltaMinutes, minDelta), maxDelta)
          onResizeEnd(appointment.id, appointment.durationMinutes + clamped)
        }}
      />
    </button>
  )
}

function AppointmentBlockPreview({ appointment }: { appointment: AppointmentBlockData }) {
  const height = Math.max(appointment.durationMinutes * PX_PER_MINUTE - 2, 20)

  return (
    <div
      style={{ height }}
      className={cn(
        "flex w-52 flex-col items-start overflow-hidden rounded-md border-l-4 px-2 py-1 shadow-md",
        STATUS_BLOCK_CLASSES[appointment.status]
      )}
    >
      <span className="truncate text-micro font-medium text-foreground">
        {appointment.clientName}
      </span>
      <span className="truncate text-micro text-foreground-secondary">
        {appointment.serviceLabel}
      </span>
    </div>
  )
}

function BlockOverlay({
  block,
  onOpen,
}: {
  block: ProfessionalBlockData
  onOpen: (blockId: string) => void
}) {
  const top = (block.startMinutes - AGENDA_WINDOW_START_MINUTES) * PX_PER_MINUTE
  const height = Math.max(block.durationMinutes * PX_PER_MINUTE - 2, 4)

  return (
    <button
      type="button"
      onClick={() => onOpen(block.id)}
      style={{
        top,
        height,
        backgroundImage:
          "repeating-linear-gradient(45deg, var(--color-muted-foreground) 0, var(--color-muted-foreground) 1px, transparent 1px, transparent 9px)",
        backgroundColor: "var(--color-muted)",
      }}
      className="absolute inset-x-1 flex cursor-pointer items-center justify-center rounded-md border border-border opacity-70 transition-opacity duration-150 ease-out hover:opacity-90"
    >
      {block.reason ? (
        <span className="truncate px-2 text-micro font-medium text-muted-foreground">
          {block.reason}
        </span>
      ) : null}
    </button>
  )
}

function ProfessionalColumn({
  professional,
  appointments,
  blocks,
  activeId,
  selection,
  onSlotPointerDown,
  onSlotPointerEnter,
  onOpenAppointment,
  onOpenBlock,
  onResizeEnd,
}: {
  professional: ProfessionalOption
  appointments: AppointmentBlockData[]
  blocks: ProfessionalBlockData[]
  activeId: string | null
  selection: SlotSelection | null
  onSlotPointerDown: (professionalId: string, slotIndex: number) => void
  onSlotPointerEnter: (professionalId: string, slotIndex: number) => void
  onOpenAppointment: (id: string) => void
  onOpenBlock: (blockId: string) => void
  onResizeEnd: (appointmentId: string, newDurationMinutes: number) => void
}) {
  function isSlotBlocked(slotIndex: number): boolean {
    const slotStart = slotIndexToMinutes(slotIndex)
    const slotEnd = slotStart + SLOT_MINUTES
    return blocks.some(
      (block) =>
        slotStart < block.startMinutes + block.durationMinutes &&
        slotEnd > block.startMinutes
    )
  }

  function isSlotSelected(slotIndex: number): boolean {
    if (!selection || selection.professionalId !== professional.id) return false
    const minIndex = Math.min(selection.anchorSlotIndex, selection.currentSlotIndex)
    const maxIndex = Math.max(selection.anchorSlotIndex, selection.currentSlotIndex)
    return slotIndex >= minIndex && slotIndex <= maxIndex
  }

  return (
    <div className="relative border-l border-border">
      {Array.from({ length: SLOT_COUNT }).map((_, slotIndex) => (
        <SlotCell
          key={slotIndex}
          professionalId={professional.id}
          slotIndex={slotIndex}
          blocked={isSlotBlocked(slotIndex)}
          selected={isSlotSelected(slotIndex)}
          onSlotPointerDown={onSlotPointerDown}
          onSlotPointerEnter={onSlotPointerEnter}
        />
      ))}

      {blocks.map((block) => (
        <BlockOverlay key={block.id} block={block} onOpen={onOpenBlock} />
      ))}

      {appointments.map((appointment) => (
        <AppointmentBlockView
          key={appointment.id}
          appointment={appointment}
          isDragging={activeId === appointment.id}
          onOpen={onOpenAppointment}
          onResizeEnd={onResizeEnd}
        />
      ))}
    </div>
  )
}

const HOUR_LABELS = Array.from(
  { length: AGENDA_WINDOW_END_MINUTES / 60 - AGENDA_WINDOW_START_MINUTES / 60 + 1 },
  (_, i) => AGENDA_WINDOW_START_MINUTES / 60 + i
)

export function DayCalendar({
  date,
  today,
  professionals,
  appointments,
  blocks,
}: {
  date: string
  today: string
  professionals: ProfessionalOption[]
  appointments: AppointmentBlockData[]
  blocks: ProfessionalBlockData[]
}) {
  const router = useRouter()
  const [items, setItems] = React.useState(appointments)
  const [activeId, setActiveId] = React.useState<string | null>(null)
  const [selection, setSelection] = React.useState<SlotSelection | null>(null)
  const [drawerState, setDrawerState] = React.useState<AppointmentDrawerState>({
    mode: "closed",
  })
  const [blockDrawerState, setBlockDrawerState] =
    React.useState<ProfessionalBlockDrawerState>({ mode: "closed" })
  const [, startTransition] = React.useTransition()

  // Sincroniza com dados vindos do servidor (ex: router.refresh() apos
  // salvar no Drawer) — o componente nao remonta nesse caso, so recebe
  // novas props.
  React.useEffect(() => {
    setItems(appointments)
  }, [appointments])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  )

  function goToDate(nextDate: string) {
    router.push(`/agenda?date=${nextDate}`)
  }

  function handleSlotClick(professionalId: string, slotIndex: number) {
    const time = minutesToTimeLabel(slotIndexToMinutes(slotIndex))
    setDrawerState({ mode: "create", professionalId, startAt: `${date}T${time}` })
  }

  function handleOpenAppointment(id: string) {
    setDrawerState({ mode: "edit", appointmentId: id })
  }

  function handleDrawerOpenChange(open: boolean) {
    if (!open) setDrawerState({ mode: "closed" })
  }

  function handleSaved() {
    setDrawerState({ mode: "closed" })
    router.refresh()
  }

  function handleStatusChanged(appointmentId: string, status: AppointmentStatus) {
    setItems((prev) =>
      prev.map((item) => (item.id === appointmentId ? { ...item, status } : item))
    )
  }

  // Selecao de intervalo por clique-e-arrasto sobre celulas vazias — usada
  // para abrir o Drawer de bloqueio ja com horario de inicio/fim
  // pre-preenchidos. Um clique simples (sem arrasto real) cai no fluxo
  // existente de criar agendamento.
  function handleSlotPointerDown(professionalId: string, slotIndex: number) {
    setSelection({ professionalId, anchorSlotIndex: slotIndex, currentSlotIndex: slotIndex })
  }

  function handleSlotPointerEnter(professionalId: string, slotIndex: number) {
    setSelection((current) => {
      if (!current || current.professionalId !== professionalId) return current
      if (current.currentSlotIndex === slotIndex) return current
      return { ...current, currentSlotIndex: slotIndex }
    })
  }

  React.useEffect(() => {
    if (!selection) return

    function handlePointerUp() {
      if (!selection) return
      const { professionalId, anchorSlotIndex, currentSlotIndex } = selection
      const minIndex = Math.min(anchorSlotIndex, currentSlotIndex)
      const maxIndex = Math.max(anchorSlotIndex, currentSlotIndex)
      setSelection(null)

      if (minIndex === maxIndex) {
        handleSlotClick(professionalId, minIndex)
        return
      }

      const startTime = minutesToTimeLabel(slotIndexToMinutes(minIndex))
      const endTime = minutesToTimeLabel(slotIndexToMinutes(maxIndex) + SLOT_MINUTES)
      setBlockDrawerState({
        mode: "create",
        professionalId,
        startAt: `${date}T${startTime}`,
        endAt: `${date}T${endTime}`,
      })
    }

    window.addEventListener("pointerup", handlePointerUp)
    return () => window.removeEventListener("pointerup", handlePointerUp)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection, date])

  function handleOpenBlock(blockId: string) {
    const block = blocks.find((item) => item.id === blockId)
    if (!block) return
    const professional = professionals.find((item) => item.id === block.professionalId)

    setBlockDrawerState({
      mode: "remove",
      blockId: block.id,
      professionalName: professional?.name ?? "Profissional",
      reason: block.reason,
      rangeLabel: block.rangeLabel,
    })
  }

  function handleBlockDrawerOpenChange(open: boolean) {
    if (!open) setBlockDrawerState({ mode: "closed" })
  }

  function handleBlockSaved() {
    setBlockDrawerState({ mode: "closed" })
    router.refresh()
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over) return

    const appointmentId = String(active.id)
    const original = items.find((item) => item.id === appointmentId)
    if (!original) return

    const [targetProfessionalId, slotIndexRaw] = String(over.id).split("::")
    const slotIndex = Number(slotIndexRaw)
    const newStartMinutes = slotIndexToMinutes(slotIndex)

    if (
      targetProfessionalId === original.professionalId &&
      newStartMinutes === original.startMinutes
    ) {
      return
    }

    setItems((prev) =>
      prev.map((item) =>
        item.id === appointmentId
          ? { ...item, professionalId: targetProfessionalId, startMinutes: newStartMinutes }
          : item
      )
    )

    startTransition(async () => {
      const result = await rescheduleAppointment(
        appointmentId,
        targetProfessionalId,
        date,
        newStartMinutes
      )

      if (result.error) {
        setItems((prev) =>
          prev.map((item) => (item.id === appointmentId ? original : item))
        )
        toast.error(result.error)
      }
    })
  }

  function handleResizeEnd(appointmentId: string, newDurationMinutes: number) {
    const original = items.find((item) => item.id === appointmentId)
    if (!original) return

    const clampedDuration = Math.max(
      newDurationMinutes,
      MIN_APPOINTMENT_DURATION_MINUTES
    )
    if (clampedDuration === original.durationMinutes) return

    setItems((prev) =>
      prev.map((item) =>
        item.id === appointmentId
          ? { ...item, durationMinutes: clampedDuration }
          : item
      )
    )

    startTransition(async () => {
      const result = await resizeAppointment(
        appointmentId,
        date,
        original.startMinutes + clampedDuration
      )

      if (result.error) {
        setItems((prev) =>
          prev.map((item) => (item.id === appointmentId ? original : item))
        )
        toast.error(result.error)
      }
    })
  }

  const activeAppointment = activeId
    ? (items.find((item) => item.id === activeId) ?? null)
    : null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-h2 font-medium text-foreground">Agenda</h1>
          <p className="text-body-sm text-foreground-secondary capitalize">
            {formatSaoPauloDateLabel(date)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="default"
            size="sm"
            onPress={() =>
              setDrawerState({ mode: "create", professionalId: "", startAt: "" })
            }
          >
            Novo agendamento
          </Button>
          <Button
            variant="outline"
            size="sm"
            onPress={() => setBlockDrawerState({ mode: "create" })}
          >
            Bloquear agenda
          </Button>

          <div className="mx-1 h-5 w-px bg-border" />

          <Button
            variant="outline"
            size="sm"
            onPress={() => goToDate(shiftDateString(date, -1))}
          >
            Dia anterior
          </Button>
          <Button variant="outline" size="sm" onPress={() => goToDate(today)}>
            Hoje
          </Button>
          <Button
            variant="outline"
            size="sm"
            onPress={() => goToDate(shiftDateString(date, 1))}
          >
            Próximo dia
          </Button>
          <input
            type="date"
            value={date}
            onChange={(event) => event.target.value && goToDate(event.target.value)}
            className="h-7 rounded-lg border border-input bg-surface px-2.5 text-[0.8rem] text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <LinkButton href="/agenda/lista" variant="ghost" size="sm">
            Ver como lista
          </LinkButton>
        </div>
      </div>

      {professionals.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface py-10 text-center text-body-sm text-muted-foreground">
          Nenhum profissional ativo cadastrado ainda.
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="max-h-[75vh] overflow-auto rounded-xl border border-border bg-surface">
            <div
              className="grid min-w-max"
              style={{
                gridTemplateColumns: `64px repeat(${professionals.length}, minmax(200px, 1fr))`,
              }}
            >
              <div className="sticky top-0 left-0 z-30 border-b border-border bg-surface" />
              {professionals.map((professional) => (
                <div
                  key={professional.id}
                  className="sticky top-0 z-20 truncate border-b border-l border-border bg-surface px-3 py-2.5 text-body-sm font-medium text-foreground"
                >
                  {professional.name}
                </div>
              ))}

              <div className="relative">
                {HOUR_LABELS.map((hour, index) => (
                  <div
                    key={hour}
                    style={{ top: (hour * 60 - AGENDA_WINDOW_START_MINUTES) * PX_PER_MINUTE }}
                    className={cn(
                      "absolute right-2 text-micro text-muted-foreground",
                      // O primeiro rotulo (inicio da janela) fica exatamente
                      // no topo da grade, colado no limite do cabecalho
                      // sticky — sem o -translate-y-1/2 dos demais, o texto
                      // vazaria para cima e ficaria cortado atras do
                      // cabecalho (z-index maior).
                      index === 0 ? "top-0" : "-translate-y-1/2"
                    )}
                  >
                    {String(hour).padStart(2, "0")}:00
                  </div>
                ))}
              </div>

              {professionals.map((professional) => (
                <ProfessionalColumn
                  key={professional.id}
                  professional={professional}
                  appointments={items.filter(
                    (item) => item.professionalId === professional.id
                  )}
                  blocks={blocks.filter(
                    (block) => block.professionalId === professional.id
                  )}
                  activeId={activeId}
                  selection={selection}
                  onSlotPointerDown={handleSlotPointerDown}
                  onSlotPointerEnter={handleSlotPointerEnter}
                  onOpenAppointment={handleOpenAppointment}
                  onOpenBlock={handleOpenBlock}
                  onResizeEnd={handleResizeEnd}
                />
              ))}
            </div>
          </div>

          <DragOverlay
            dropAnimation={{ duration: 180, easing: "cubic-bezier(0.33, 1, 0.68, 1)" }}
          >
            {activeAppointment ? (
              <AppointmentBlockPreview appointment={activeAppointment} />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <AppointmentDrawer
        state={drawerState}
        onOpenChange={handleDrawerOpenChange}
        professionals={professionals}
        onSaved={handleSaved}
        onStatusChanged={handleStatusChanged}
      />

      <ProfessionalBlockDrawer
        state={blockDrawerState}
        onOpenChange={handleBlockDrawerOpenChange}
        professionals={professionals}
        onSaved={handleBlockSaved}
      />
    </div>
  )
}
