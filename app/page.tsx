import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { AppHeader } from "@/components/app-header"
import { CaptureDashboard } from "@/components/capture-dashboard"

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/sign-in")

  return (
    <div className="min-h-svh bg-background">
      <AppHeader guardName={session.user.name} />
      <main className="mx-auto max-w-3xl px-3 py-4 sm:px-4 sm:py-6">
        <CaptureDashboard />
      </main>
    </div>
  )
}
