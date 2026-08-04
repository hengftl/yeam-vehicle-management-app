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
    <header className="sticky top-0 z-20 border-b border-border bg-card">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <ShieldCheck className="h-5 w-5 text-primary-foreground" aria-hidden="true" />
          </div>
  <div className="leading-tight">
    <p className="text-sm font-bold text-foreground">Yeam</p>
    <p className="text-xs text-muted-foreground">{guardName}</p>
  </div>
        </div>

        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary",
                )}
              >
                <item.icon className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            )
          })}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            aria-label="Sign out"
            className="text-muted-foreground"
          >
            <LogOut className="h-5 w-5" aria-hidden="true" />
          </Button>
        </nav>
      </div>
    </header>
  )
}
