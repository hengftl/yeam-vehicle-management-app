"use client"

import { useState } from "react"
import * as XLSX from "xlsx"
import type { VehicleRecord } from "@/lib/db/schema"
import { RecordList, formatTime } from "@/components/record-list"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { FileSpreadsheet, Search, LogIn, LogOut } from "lucide-react"

type Filter = "all" | "in" | "out"

export function RecordsView({ records }: { records: VehicleRecord[] }) {
  const [filter, setFilter] = useState<Filter>("all")
  const [query, setQuery] = useState("")

  const filtered = records.filter((r) => {
    if (filter !== "all" && r.direction !== filter) return false
    if (query) {
      const haystack = [r.plateNumber, r.make, r.model, r.color, r.vehicleType]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      if (!haystack.includes(query.toLowerCase())) return false
    }
    return true
  })

  const exportToExcel = () => {
    const rows = filtered.map((r) => ({
      "Date & Time": formatTime(r.createdAt),
      Direction: r.direction === "out" ? "OUT" : "IN",
      "Plate Number": r.plateNumber ?? "",
      Type: r.vehicleType ?? "",
      Make: r.make ?? "",
      Model: r.model ?? "",
      Color: r.color ?? "",
      Description: r.description ?? "",
      Confidence: r.confidence ?? "",
    }))

    const worksheet = XLSX.utils.json_to_sheet(rows)
    worksheet["!cols"] = [
      { wch: 18 },
      { wch: 10 },
      { wch: 14 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 10 },
      { wch: 40 },
      { wch: 12 },
    ]
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Vehicle Log")
    const stamp = new Date().toISOString().slice(0, 10)
    XLSX.writeFile(workbook, `vehicle-log-${stamp}.xlsx`)
  }

  const filters: { key: Filter; label: string; icon?: typeof LogIn }[] = [
    { key: "all", label: "All" },
    { key: "in", label: "IN", icon: LogIn },
    { key: "out", label: "OUT", icon: LogOut },
  ]

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Total records</p>
            <p className="text-2xl font-bold text-foreground">{records.length}</p>
          </div>
          <Button onClick={exportToExcel} disabled={filtered.length === 0} className="h-12 text-base">
            <FileSpreadsheet className="h-5 w-5" aria-hidden="true" />
            Export Excel
          </Button>
        </div>

        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search plate, make, color..."
            className="h-11 pl-9"
            aria-label="Search records"
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={
                "flex items-center justify-center gap-1.5 rounded-lg border py-2 text-sm font-semibold transition-colors " +
                (filter === f.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-secondary")
              }
            >
              {f.icon && <f.icon className="h-4 w-4" aria-hidden="true" />}
              {f.label}
            </button>
          ))}
        </div>
      </Card>

      <RecordList records={filtered} />
    </div>
  )
}
