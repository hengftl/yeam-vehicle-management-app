"use client"

import { useRef, useState, useCallback } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Camera,
  LogIn,
  LogOut,
  Loader2,
  Volume2,
  RotateCcw,
  Check,
  CarFront,
  CircleAlert,
} from "lucide-react"
import {
  extractVehicleFromImage,
  getOpenInRecordForPlate,
  saveVehicleRecord,
  type ExtractionResult,
} from "@/app/actions/vehicles"
import { cn } from "@/lib/utils"

type Phase = "idle" | "analyzing" | "review" | "saving" | "done"

export function VehicleCapture({ onSaved }: { onSaved?: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [phase, setPhase] = useState<Phase>("idle")
  const [image, setImage] = useState<string | null>(null)
  const [result, setResult] = useState<ExtractionResult | null>(null)
  const [suggestedOut, setSuggestedOut] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedDirection, setSavedDirection] = useState<"in" | "out" | null>(null)

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return
    window.speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(text)
    utter.rate = 0.95
    window.speechSynthesis.speak(utter)
  }, [])

  const buildSpokenSummary = useCallback((r: ExtractionResult, isOut: boolean) => {
    const parts: string[] = []
    parts.push(isOut ? "Vehicle leaving." : "Vehicle arriving.")
    if (r.plateNumber) parts.push(`Plate ${r.plateNumber.split("").join(" ")}.`)
    else parts.push("Plate not readable.")
    const desc = [r.color, r.make, r.model || r.vehicleType].filter(Boolean).join(" ")
    if (desc) parts.push(desc + ".")
    return parts.join(" ")
  }, [])

  const createPlateDetailCrop = (dataUrl: string) =>
    new Promise<string>((resolve, reject) => {
      const source = new window.Image()
      source.onload = () => {
        const width = source.naturalWidth
        const height = source.naturalHeight
        const cropWidth = Math.round(width * 0.72)
        const cropHeight = Math.round(height * 0.58)
        const cropX = Math.round((width - cropWidth) / 2)
        const cropY = Math.round(height * 0.28)
        const canvas = document.createElement("canvas")
        canvas.width = 1800
        canvas.height = Math.max(900, Math.round((cropHeight / cropWidth) * 1800))
        const context = canvas.getContext("2d")
        if (!context) return reject(new Error("Could not prepare image"))
        context.imageSmoothingEnabled = true
        context.imageSmoothingQuality = "high"
        context.drawImage(source, cropX, cropY, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL("image/jpeg", 0.95))
      }
      source.onerror = () => reject(new Error("Could not read image"))
      source.crossOrigin = "anonymous"
      source.src = dataUrl
    })

  const handleFile = async (file: File) => {
    setError(null)
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = reader.result as string
      setImage(dataUrl)
      setPhase("analyzing")
      try {
        const detail = await createPlateDetailCrop(dataUrl)
        const extraction = await extractVehicleFromImage({ full: dataUrl, detail })
        setResult(extraction)
        let isOut = false
        if (extraction.plateNumber) {
          const open = await getOpenInRecordForPlate(extraction.plateNumber)
          isOut = !!open
        }
        setSuggestedOut(isOut)
        setPhase("review")
        speak(buildSpokenSummary(extraction, isOut))
      } catch (e) {
        console.error("[v0] extraction error:", e)
        setError("Could not read the photo. Please try again.")
        setPhase("idle")
      }
    }
    reader.readAsDataURL(file)
  }

  const reset = () => {
    window.speechSynthesis?.cancel()
    setPhase("idle")
    setImage(null)
    setResult(null)
    setError(null)
    setSavedDirection(null)
    setSuggestedOut(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleSave = async (direction: "in" | "out") => {
    if (!result) return
    setPhase("saving")
    try {
      await saveVehicleRecord({
        direction,
        plateNumber: result.plateNumber,
        vehicleType: result.vehicleType,
        make: result.make,
        model: result.model,
        color: result.color,
        description: result.description,
        confidence: result.confidence,
        imageUrl: image,
      })
      setSavedDirection(direction)
      setPhase("done")
      speak(direction === "in" ? "Saved. Vehicle is in." : "Saved. Vehicle is out.")
      onSaved?.()
    } catch (e) {
      console.error("[v0] save error:", e)
      setError("Could not save. Please try again.")
      setPhase("review")
    }
  }

  // ---------- IDLE ----------
  if (phase === "idle") {
    return (
      <Card className="rounded-3xl border-2 border-dashed border-violet-200 bg-white/90 p-3 shadow-[0_5px_0_#ddd6fe] sm:p-6">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleFile(f)
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-border bg-secondary/40 py-14 transition-colors hover:bg-secondary"
        >
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary">
            <Camera className="h-12 w-12 text-primary-foreground" aria-hidden="true" />
          </div>
          <span className="text-xl font-bold text-foreground">Take vehicle photo</span>
          <span className="text-sm text-muted-foreground">Tap to open the camera</span>
        </button>
        {error && (
          <p className="mt-4 flex items-center justify-center gap-2 text-center text-destructive" role="alert">
            <CircleAlert className="h-5 w-5" aria-hidden="true" />
            {error}
          </p>
        )}
      </Card>
    )
  }

  // ---------- ANALYZING ----------
  if (phase === "analyzing") {
    return (
      <Card className="overflow-hidden">
        {image && (
          <div className="relative aspect-video w-full">
            <Image src={image || "/placeholder.svg"} alt="Captured vehicle" fill className="object-cover" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-foreground/60">
              <Loader2 className="h-12 w-12 animate-spin text-background" aria-hidden="true" />
              <p className="text-lg font-semibold text-background">Reading vehicle...</p>
            </div>
          </div>
        )}
      </Card>
    )
  }

  // ---------- DONE ----------
  if (phase === "done" && savedDirection) {
    const isOut = savedDirection === "out"
    return (
      <Card
        className={cn(
          "flex flex-col items-center gap-4 p-8 text-center",
          isOut ? "bg-status-out" : "bg-status-in",
        )}
      >
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-background/20">
          <Check className="h-12 w-12 text-status-in-foreground" aria-hidden="true" />
        </div>
        <div>
          <p className="text-2xl font-bold text-status-in-foreground">
            {isOut ? "Vehicle OUT" : "Vehicle IN"}
          </p>
          <p className="mt-1 text-lg font-medium text-status-in-foreground/90">
            {result?.plateNumber ?? "No plate"}
          </p>
        </div>
        <Button
          onClick={reset}
          size="lg"
          variant="secondary"
          className="mt-2 h-14 w-full text-lg font-semibold"
        >
          <Camera className="h-6 w-6" aria-hidden="true" />
          Next vehicle
        </Button>
      </Card>
    )
  }

  // ---------- REVIEW / SAVING ----------
  const busy = phase === "saving"
  return (
    <Card className="overflow-hidden">
      {image && (
        <div className="relative aspect-video w-full">
          <Image src={image || "/placeholder.svg"} alt="Captured vehicle" fill className="object-cover" />
          <span
            className={cn(
              "absolute left-3 top-3 rounded-full px-3 py-1 text-sm font-bold",
              suggestedOut
                ? "bg-status-out text-status-out-foreground"
                : "bg-status-in text-status-in-foreground",
            )}
          >
            {suggestedOut ? "Likely LEAVING" : "Likely ARRIVING"}
          </span>
        </div>
      )}

      <div className="flex flex-col gap-5 p-5">
        {/* Plate - the most important info, shown large */}
        <div className="rounded-xl border-2 border-foreground bg-secondary px-4 py-3 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            License Plate
          </p>
          <p className="font-mono text-3xl font-bold tracking-widest text-foreground">
            {result?.plateNumber ?? "— — —"}
          </p>
          {result?.confidence && (
            <p className="mt-1 text-xs text-muted-foreground">
              Reading confidence: {result.confidence}
            </p>
          )}
        </div>

        {/* Visual detail chips */}
        <div className="flex flex-col gap-3 text-base">
          <DetailRow label="Type" value={result?.vehicleType} />
          <DetailRow label="Make" value={result?.make} />
          <DetailRow label="Model" value={result?.model} />
          <DetailRow label="Color" value={result?.color} />
        </div>

        {result?.description && (
          <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
            {result.description}
          </p>
        )}

        <Button
          type="button"
          variant="outline"
          onClick={() => result && speak(buildSpokenSummary(result, suggestedOut))}
          className="h-12 w-full text-base"
        >
          <Volume2 className="h-5 w-5" aria-hidden="true" />
          Read aloud
        </Button>

        {error && (
          <p className="flex items-center gap-2 text-destructive" role="alert">
            <CircleAlert className="h-5 w-5" aria-hidden="true" />
            {error}
          </p>
        )}

        {/* Big color-coded IN / OUT actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => handleSave("in")}
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-xl py-6 font-bold text-status-in-foreground transition-opacity disabled:opacity-60",
              "bg-status-in",
              !suggestedOut && "ring-4 ring-status-in/40",
            )}
          >
            {busy ? (
              <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
            ) : (
              <LogIn className="h-8 w-8" aria-hidden="true" />
            )}
            <span className="text-xl">IN</span>
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => handleSave("out")}
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-xl py-6 font-bold text-status-out-foreground transition-opacity disabled:opacity-60",
              "bg-status-out",
              suggestedOut && "ring-4 ring-status-out/40",
            )}
          >
            {busy ? (
              <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
            ) : (
              <LogOut className="h-8 w-8" aria-hidden="true" />
            )}
            <span className="text-xl">OUT</span>
          </button>
        </div>

        <Button
          type="button"
          variant="ghost"
          onClick={reset}
          disabled={busy}
          className="h-11 w-full text-muted-foreground"
        >
          <RotateCcw className="h-5 w-5" aria-hidden="true" />
          Retake photo
        </Button>
      </div>
    </Card>
  )
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-2">
      <span className="flex items-center gap-2 text-muted-foreground">
        <CarFront className="h-4 w-4" aria-hidden="true" />
        {label}
      </span>
      <span className="font-semibold capitalize text-foreground">{value || "Unknown"}</span>
    </div>
  )
}
