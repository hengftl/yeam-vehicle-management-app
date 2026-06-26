import type { VehicleRecord } from "@/lib/db/schema"
import { LogIn, LogOut, CarFront } from "lucide-react"
import { cn } from "@/lib/utils"

export function formatTime(date: Date) {
  return new Date(date).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function RecordList({ records }: { records: VehicleRecord[] }) {
  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-12 text-center">
        <CarFront className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
        <p className="text-muted-foreground">No vehicles logged yet</p>
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {records.map((r) => {
        const isOut = r.direction === "out"
        const detail = [r.color, r.make, r.model || r.vehicleType].filter(Boolean).join(" ")
        return (
          <li
            key={r.id}
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
          >
            <div
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg",
                isOut ? "bg-status-out" : "bg-status-in",
              )}
            >
              {isOut ? (
                <LogOut className="h-6 w-6 text-status-out-foreground" aria-hidden="true" />
              ) : (
                <LogIn className="h-6 w-6 text-status-in-foreground" aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-lg font-bold tracking-wide text-foreground">
                {r.plateNumber || "No plate"}
              </p>
              <p className="truncate text-sm capitalize text-muted-foreground">
                {detail || "Unknown vehicle"}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <span
                className={cn(
                  "inline-block rounded-full px-2.5 py-0.5 text-xs font-bold",
                  isOut
                    ? "bg-status-out text-status-out-foreground"
                    : "bg-status-in text-status-in-foreground",
                )}
              >
                {isOut ? "OUT" : "IN"}
              </span>
              <p className="mt-1 text-xs text-muted-foreground">{formatTime(r.createdAt)}</p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
