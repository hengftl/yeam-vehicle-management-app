"use server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { vehicleRecord } from "@/lib/db/schema"
import { and, desc, eq } from "drizzle-orm"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { generateText, Output } from "ai"
import { z } from "zod"

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error("Unauthorized")
  return session.user.id
}

const ExtractionSchema = z.object({
  plateNumber: z
    .string()
    .nullable()
    .describe("The license plate number, exactly as shown. Null if not readable."),
  vehicleType: z
    .string()
    .nullable()
    .describe("One of: car, truck, motorcycle, van, bus, suv, pickup, other"),
  make: z.string().nullable().describe("Manufacturer brand, e.g. Toyota, Honda. Null if unsure."),
  model: z.string().nullable().describe("Model name if visible, e.g. Camry. Null if unsure."),
  color: z.string().nullable().describe("Primary color of the vehicle."),
  description: z
    .string()
    .nullable()
    .describe("A short, simple one-sentence description of the vehicle for a security guard."),
  confidence: z.enum(["high", "medium", "low"]).describe("Overall confidence in the plate reading."),
})

export type ExtractionResult = z.infer<typeof ExtractionSchema>

export async function extractVehicleFromImage(imageDataUrl: string): Promise<ExtractionResult> {
  await getUserId()

  const { experimental_output } = await generateText({
    model: "openai/gpt-4-turbo",
    system: `You are a vehicle identification expert for a security gate system. Your PRIMARY task is to accurately read and extract the license plate number from the vehicle photo.

CRITICAL INSTRUCTIONS FOR LICENSE PLATE:
- Focus intensely on reading the license plate. This is the most important data.
- Read EVERY character on the plate, including letters, numbers, and dots/periods.
- Common Thai plate formats: XX.YYYY or similar (e.g., "กก.1234" or "TK.1168")
- If you see Thai script or mixed script, read exactly what you see.
- Include any dots, spaces, or separators exactly as shown.
- If the plate is partially obscured, read only what is clearly visible.
- If you cannot read the plate at all, set plateNumber to null and confidence to "low".

SECONDARY TASK - Vehicle Details:
- Identify the make/brand (Toyota, Lexus, Honda, etc.)
- Identify the model if visible
- Describe the primary color
- Classify the vehicle type
- Write a brief, clear description suitable for a security guard.

Return confidence as "high" (plate fully readable), "medium" (plate partially readable), or "low" (plate unclear/not visible).`,
    experimental_output: Output.object({ schema: ExtractionSchema }),
    messages: [
      {
        role: "user",
        content: [
          { 
            type: "text", 
            text: "Please examine this vehicle photo carefully. Focus first on reading the license plate number exactly as shown. Then provide the vehicle details. The plate is the most critical information.",
          },
          { type: "image", image: imageDataUrl },
        ],
      },
    ],
  })

  return experimental_output
}

export async function getOpenInRecordForPlate(plateNumber: string) {
  const userId = await getUserId()
  if (!plateNumber) return null

  const normalized = plateNumber.replace(/\s+/g, "").toUpperCase()

  const open = await db
    .select()
    .from(vehicleRecord)
    .where(and(eq(vehicleRecord.userId, userId), eq(vehicleRecord.direction, "in")))
    .orderBy(desc(vehicleRecord.createdAt))

  // Find the most recent IN record whose plate matches and has no later OUT.
  const matched = open.find(
    (r) => (r.plateNumber ?? "").replace(/\s+/g, "").toUpperCase() === normalized,
  )
  if (!matched) return null

  // Ensure it has not already been closed by a later OUT for the same plate.
  const outs = await db
    .select()
    .from(vehicleRecord)
    .where(and(eq(vehicleRecord.userId, userId), eq(vehicleRecord.direction, "out")))

  const closedAfter = outs.some(
    (o) =>
      (o.plateNumber ?? "").replace(/\s+/g, "").toUpperCase() === normalized &&
      o.createdAt > matched.createdAt,
  )

  return closedAfter ? null : matched
}

export async function saveVehicleRecord(input: {
  direction: "in" | "out"
  plateNumber: string | null
  vehicleType: string | null
  make: string | null
  model: string | null
  color: string | null
  description: string | null
  confidence: string | null
  imageUrl: string | null
}) {
  const userId = await getUserId()

  let matchedRecordId: number | null = null
  if (input.direction === "out" && input.plateNumber) {
    const open = await getOpenInRecordForPlate(input.plateNumber)
    matchedRecordId = open?.id ?? null
  }

  const [record] = await db
    .insert(vehicleRecord)
    .values({
      userId,
      direction: input.direction,
      plateNumber: input.plateNumber,
      vehicleType: input.vehicleType,
      make: input.make,
      model: input.model,
      color: input.color,
      description: input.description,
      confidence: input.confidence,
      imageUrl: input.imageUrl,
      matchedRecordId,
    })
    .returning()

  revalidatePath("/")
  revalidatePath("/records")
  return record
}

export async function getRecords() {
  const userId = await getUserId()
  return db
    .select()
    .from(vehicleRecord)
    .where(eq(vehicleRecord.userId, userId))
    .orderBy(desc(vehicleRecord.createdAt))
}

export async function getRecentRecords(limit = 8) {
  const userId = await getUserId()
  return db
    .select()
    .from(vehicleRecord)
    .where(eq(vehicleRecord.userId, userId))
    .orderBy(desc(vehicleRecord.createdAt))
    .limit(limit)
}

export async function deleteRecord(id: number) {
  const userId = await getUserId()
  await db.delete(vehicleRecord).where(and(eq(vehicleRecord.id, id), eq(vehicleRecord.userId, userId)))
  revalidatePath("/")
  revalidatePath("/records")
}

// Stats for dashboard: vehicles currently inside (open IN records)
export async function getCurrentlyInside() {
  const userId = await getUserId()
  const ins = await db
    .select()
    .from(vehicleRecord)
    .where(and(eq(vehicleRecord.userId, userId), eq(vehicleRecord.direction, "in")))
    .orderBy(desc(vehicleRecord.createdAt))

  const outs = await db
    .select()
    .from(vehicleRecord)
    .where(and(eq(vehicleRecord.userId, userId), eq(vehicleRecord.direction, "out")))

  const inside = ins.filter((rec) => {
    const plate = (rec.plateNumber ?? "").replace(/\s+/g, "").toUpperCase()
    if (!plate) return false
    const closed = outs.some(
      (o) =>
        (o.plateNumber ?? "").replace(/\s+/g, "").toUpperCase() === plate &&
        o.createdAt > rec.createdAt,
    )
    return !closed
  })

  // Dedupe by plate, keeping the latest IN.
  const seen = new Set<string>()
  const unique = inside.filter((rec) => {
    const plate = (rec.plateNumber ?? "").replace(/\s+/g, "").toUpperCase()
    if (seen.has(plate)) return false
    seen.add(plate)
    return true
  })

  return unique
}
