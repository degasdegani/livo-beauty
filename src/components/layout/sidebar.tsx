"use client"

import { useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"

export type SidebarNavItem = {
  href: string
  label: string
  icon: ReactNode
  subItem?: { href: string; label: string }
}

type SidebarProps = {
  items: SidebarNavItem[]
  footerItem: SidebarNavItem
}

const STORAGE_KEY = "livo-sidebar-collapsed"

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function Sidebar({ items, footerItem }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    setCollapsed(localStorage.getItem(STORAGE_KEY) === "true")
  }, [])

  function toggleCollapsed() {
    setCollapsed((previous) => {
      const next = !previous
      localStorage.setItem(STORAGE_KEY, String(next))
      return next
    })
  }

  function renderNavItem(item: SidebarNavItem) {
    const active = isActivePath(pathname, item.href)
    const subActive = item.subItem ? isActivePath(pathname, item.subItem.href) : false

    return (
      <div key={item.href}>
        <Link
          href={item.href}
          title={collapsed ? item.label : undefined}
          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-body-sm transition-colors ${
            collapsed ? "justify-center" : ""
          } ${
            active
              ? "bg-primary-light text-primary"
              : "text-foreground-secondary hover:bg-primary-light/50 hover:text-foreground"
          }`}
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center">
            {item.icon}
          </span>
          {collapsed ? (
            <span className="sr-only">{item.label}</span>
          ) : (
            <span className="truncate">{item.label}</span>
          )}
        </Link>

        {item.subItem && !collapsed ? (
          <Link
            href={item.subItem.href}
            className={`ml-8 flex items-center rounded-lg px-3 py-1.5 text-micro transition-colors ${
              subActive
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground-secondary"
            }`}
          >
            {item.subItem.label}
          </Link>
        ) : null}
      </div>
    )
  }

  return (
    <aside
      className={`flex h-full flex-col border-r border-border bg-surface transition-all duration-200 ${
        collapsed ? "w-[72px]" : "w-[272px]"
      }`}
    >
      <div className={`flex h-16 shrink-0 items-center ${collapsed ? "justify-center" : "px-6"}`}>
        <span className="text-body font-medium text-foreground">
          {collapsed ? "L" : "LIVO Beauty"}
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2">
        <div className="flex flex-col gap-1">{items.map((item) => renderNavItem(item))}</div>
      </nav>

      <div className="shrink-0 border-t border-border px-3 py-2">
        {renderNavItem(footerItem)}

        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-body-sm text-foreground-secondary transition-colors hover:bg-primary-light/50 hover:text-foreground ${
            collapsed ? "justify-center" : ""
          }`}
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5 shrink-0" />
          ) : (
            <ChevronLeft className="h-5 w-5 shrink-0" />
          )}
          {collapsed ? null : <span>Recolher</span>}
        </button>
      </div>
    </aside>
  )
}
