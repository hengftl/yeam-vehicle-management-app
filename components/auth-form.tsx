"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { ShieldCheck } from "lucide-react"

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isSignUp = mode === "sign-up"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = isSignUp
      ? await authClient.signUp.email({ email, password, name })
      : await authClient.signIn.email({ email, password })

    setLoading(false)

    if (error) {
      setError(error.message ?? "Something went wrong")
      return
    }

    router.push("/")
    router.refresh()
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-[radial-gradient(circle_at_20%_20%,_#fde68a_0,_transparent_25%),radial-gradient(circle_at_85%_15%,_#bfdbfe_0,_transparent_25%),linear-gradient(135deg,_#fff7ed_0%,_#f0fdf4_100%)] px-4 py-10">
      <Card className="w-full max-w-md rounded-[2rem] border-2 border-dashed border-violet-200 bg-white/90 p-6 shadow-[0_7px_0_#ddd6fe] sm:p-8">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-16 w-16 rotate-[-6deg] items-center justify-center rounded-3xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-[0_4px_0_#c4b5fd]">
            <ShieldCheck className="h-9 w-9 text-primary-foreground" aria-hidden="true" />
          </div>
  <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground text-balance">
    Yeam
  </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isSignUp ? "Create your guard account" : "Sign in to start your shift"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {isSignUp && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="name" className="text-base">
                Your name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
                className="h-12 text-base"
              />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="email" className="text-base">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="h-12 text-base"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password" className="text-base">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete={isSignUp ? "new-password" : "current-password"}
              className="h-12 text-base"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" disabled={loading} className="h-12 w-full text-base font-semibold">
            {loading ? "Please wait..." : isSignUp ? "Create account" : "Sign in"}
          </Button>
        </form>

        <p className="text-sm text-muted-foreground text-center mt-6">
          {isSignUp ? "Already have an account? " : "Don't have an account? "}
          <Link
            href={isSignUp ? "/sign-in" : "/sign-up"}
            className="text-foreground font-medium underline-offset-4 hover:underline"
          >
            {isSignUp ? "Sign in" : "Sign up"}
          </Link>
        </p>
      </Card>
    </main>
  )
}
