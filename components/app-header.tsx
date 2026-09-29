"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { ShieldCheck, Camera, ClipboardList, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"

export function AppHeader({ guardName }: { guardName: string }) {
  const router = useRouter()
  const pathname = usePathname()

  const handleSignOut = async () => {
    await authClient.signOut()
    router.push("/sign-in")
    router.refresh()
  }

  const navItems = [
    { href: "/", label: "Capture", icon: Camera },
    { href: "/records", label: "Records", icon: ClipboardList },
  ]

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-sm">
            <ShieldCheck className="h-5 w-5 text-primary-foreground" aria-hidden="true" />
          </div>
          <div className="leading-tight">
            <p className="text-base font-bold tracking-tight text-foreground">Yeam</p>
            <p className="max-w-28 truncate text-xs text-muted-foreground">{guardName}</p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleSignOut}
          aria-label="Sign out"
          className="h-11 w-11 rounded-xl text-muted-foreground"
        >
          <LogOut className="h-5 w-5" aria-hidden="true" />
        </Button>
      </div>
      <nav className="mx-auto grid max-w-3xl grid-cols-2 gap-1 border-t border-border px-3 py-2 sm:flex sm:justify-end sm:border-0 sm:px-4 sm:py-0 sm:pb-2">
        {navItems.map((item) => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary",
              )}
            >
              <item.icon className="h-5 w-5" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
