"use client"

import { useEffect, useState, useCallback } from "react"
import { VehicleCapture } from "@/components/vehicle-capture"
import { RecordList } from "@/components/record-list"
import { getRecentRecords, getCurrentlyInside } from "@/app/actions/vehicles"
import type { VehicleRecord } from "@/lib/db/schema"
import { CarFront, History } from "lucide-react"
import { Card } from "@/components/ui/card"

export function CaptureDashboard() {
  const [recent, setRecent] = useState<VehicleRecord[]>([])
  const [insideCount, setInsideCount] = useState<number | null>(null)

  const refresh = useCallback(async () => {
    const [records, inside] = await Promise.all([getRecentRecords(6), getCurrentlyInside()])
    setRecent(records)
    setInsideCount(inside.length)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex items-center justify-between gap-4 bg-primary p-5 text-primary-foreground">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-foreground/15">
            <CarFront className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm opacity-90">Vehicles inside now</p>
            <p className="text-3xl font-bold leading-none">{insideCount ?? "—"}</p>
          </div>
        </div>
      </Card>

      <VehicleCapture onSaved={refresh} />

      <section>
        <div className="mb-2 flex items-center gap-2">
          <History className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-foreground">Recent activity</h2>
        </div>
        <RecordList records={recent} />
      </section>
    </div>
  )
}
