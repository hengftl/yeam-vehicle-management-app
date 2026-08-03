import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { vehicleRecord } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { AppHeader } from '@/components/app-header'
import { RecordsView } from '@/components/records-view'

export const metadata = {
  title: 'Vehicle Records | Guard Log',
  description: 'View and export all vehicle records',
}

export default async function RecordsPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  const records = await db
    .select()
    .from(vehicleRecord)
    .where(eq(vehicleRecord.userId, session.user.id))
    .orderBy(desc(vehicleRecord.createdAt))

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader guardName={session.user.name || 'Guard'} />
      <main className="flex-1 px-4 py-6">
        <RecordsView records={records} />
      </main>
    </div>
  )
}
