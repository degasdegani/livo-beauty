export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-border px-10 py-8">
      <p className="mx-auto max-w-[1600px] font-[family-name:var(--font-jost)] text-body-sm font-medium tracking-[0.15em] text-foreground-secondary">
        LIVO BEAUTY © {year}
      </p>
    </footer>
  )
}
