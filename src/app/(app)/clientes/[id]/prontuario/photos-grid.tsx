"use client"

import { useState } from "react"

import { ImageLightbox } from "@/components/ui/image-lightbox"

interface PhotoItem {
  id: string
  caption: string
}

export function PhotosGrid({ photos }: { photos: PhotoItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  if (photos.length === 0) {
    return (
      <p className="text-body-sm text-foreground-secondary">
        Nenhuma foto registrada ainda.
      </p>
    )
  }

  const images = photos.map((photo) => ({
    src: `/api/anamnese-photos/${photo.id}`,
    caption: photo.caption,
  }))

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {photos.map((photo, photoIndex) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setOpenIndex(photoIndex)}
            className="flex cursor-pointer flex-col gap-1.5 text-left"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/anamnese-photos/${photo.id}`}
              alt=""
              className="aspect-square w-full rounded-lg border border-border object-cover transition-opacity duration-150 ease-out hover:opacity-80"
            />
            <p className="text-micro text-foreground-secondary">
              {photo.caption}
            </p>
          </button>
        ))}
      </div>

      <ImageLightbox
        images={images}
        index={openIndex}
        onIndexChange={setOpenIndex}
      />
    </>
  )
}
