"use client"

import * as React from "react"
import {
  ModalOverlay as ModalOverlayPrimitive,
  Modal as ModalPrimitive,
  Dialog as DialogPrimitive,
} from "react-aria-components"
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface LightboxImage {
  src: string
  alt?: string
  caption?: string
}

interface ImageLightboxProps {
  images: LightboxImage[]
  index: number | null
  onIndexChange: (index: number | null) => void
}

function ImageLightbox({ images, index, onIndexChange }: ImageLightboxProps) {
  const total = images.length

  const goTo = React.useCallback(
    (nextIndex: number) => {
      onIndexChange(((nextIndex % total) + total) % total)
    },
    [onIndexChange, total]
  )

  if (index === null) {
    return null
  }

  const current = images[index]

  return (
    <ModalOverlayPrimitive
      isDismissable
      isOpen={index !== null}
      onOpenChange={(isOpen) => {
        if (!isOpen) onIndexChange(null)
      }}
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6",
        "transition-opacity duration-200 ease-[cubic-bezier(0.33,1,0.68,1)] data-entering:opacity-0 data-exiting:opacity-0"
      )}
    >
      <ModalPrimitive
        className={cn(
          "flex max-h-full max-w-full flex-col items-center gap-3 outline-none",
          "transition-all duration-200 ease-[cubic-bezier(0.33,1,0.68,1)] data-entering:scale-95 data-entering:opacity-0 data-exiting:scale-95 data-exiting:opacity-0"
        )}
      >
        <DialogPrimitive
          aria-label="Visualização de foto"
          className="relative flex max-h-full max-w-full flex-col items-center gap-3 outline-none"
        >
          {({ close }) => (
            <div
              className="relative flex max-h-full max-w-full flex-col items-center gap-3"
              onKeyDown={(event: React.KeyboardEvent) => {
                if (event.key === "ArrowLeft") {
                  event.preventDefault()
                  goTo(index - 1)
                } else if (event.key === "ArrowRight") {
                  event.preventDefault()
                  goTo(index + 1)
                }
              }}
            >
              <Button
                variant="ghost"
                size="icon-sm"
                onPress={close}
                className="absolute -top-10 right-0 text-white hover:bg-white/10 hover:text-white"
              >
                <XIcon />
                <span className="sr-only">Fechar</span>
              </Button>

              <div className="relative flex items-center justify-center">
                {total > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onPress={() => goTo(index - 1)}
                    className="absolute left-2 text-white hover:bg-white/10 hover:text-white"
                  >
                    <ChevronLeftIcon />
                    <span className="sr-only">Foto anterior</span>
                  </Button>
                )}

                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={current.src}
                  alt={current.alt ?? ""}
                  className="max-h-[75vh] max-w-[85vw] rounded-lg object-contain"
                />

                {total > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onPress={() => goTo(index + 1)}
                    className="absolute right-2 text-white hover:bg-white/10 hover:text-white"
                  >
                    <ChevronRightIcon />
                    <span className="sr-only">Próxima foto</span>
                  </Button>
                )}
              </div>

              {current.caption && (
                <p className="max-w-[85vw] text-center text-body-sm text-white/90">
                  {current.caption}
                </p>
              )}
            </div>
          )}
        </DialogPrimitive>
      </ModalPrimitive>
    </ModalOverlayPrimitive>
  )
}

export { ImageLightbox, type LightboxImage }
