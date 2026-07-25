"use client"

import { useInView } from "@/hooks/use-in-view"

export function Reveal({ children }: { children: React.ReactNode }) {
  const { ref, inView } = useInView<HTMLDivElement>()
  return (
    <div
      ref={ref}
      className={`transition-all duration-200 ease-out ${
        inView ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
    >
      {children}
    </div>
  )
}
