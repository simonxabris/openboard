import { createFileRoute } from '@tanstack/solid-router'
import { z } from 'zod'
import { createDb } from '../../db'
import { usageEvents, users } from '../../db/schema'

const MAX_EVENTS_PER_REQUEST = 500

const ingestEventSchema = z.object({
  id: z.string().trim().min(1).max(128),
  userId: z.string().trim().min(1).max(128),
  displayName: z.string().trim().min(1).max(80).optional(),
  tokens: z.number().int().nonnegative(),
  model: z.string().trim().min(1).max(120),
  provider: z.string().trim().min(1).max(120),
  occurredAt: z.union([z.number().int(), z.string().datetime({ offset: true })]).optional(),
})

const ingestPayloadSchema = z
  .union([
    z.object({
      events: z.array(ingestEventSchema).min(1).max(MAX_EVENTS_PER_REQUEST),
    }),
    ingestEventSchema,
  ])
  .transform((payload) => ('events' in payload ? payload.events : [payload]))

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
    },
  })
}

function coerceOccurredAt(value: number | string | undefined): Date {
  if (value === undefined) return new Date()

  const normalizedValue =
    typeof value === 'number' && value > 0 && value < 1_000_000_000_000
      ? value * 1000
      : value
  const date = new Date(normalizedValue)
  if (Number.isNaN(date.getTime())) {
    throw new Error('invalid_occurred_at')
  }

  return date
}

export const Route = createFileRoute('/api/ingest')({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            'access-control-allow-origin': '*',
            'access-control-allow-methods': 'POST, OPTIONS',
            'access-control-allow-headers': 'content-type',
          },
        }),
      POST: async ({ request }) => {
        let rawBody: unknown
        try {
          rawBody = await request.json()
        } catch {
          return json(400, {
            ok: false,
            error: 'invalid_json',
            message: 'Request body must be valid JSON',
          })
        }

        const parsed = ingestPayloadSchema.safeParse(rawBody)
        if (!parsed.success) {
          return json(400, {
            ok: false,
            error: 'invalid_payload',
            issues: parsed.error.issues.map((issue) => ({
              path: issue.path.join('.'),
              message: issue.message,
            })),
          })
        }

        const db = createDb()
        let inserted = 0
        let duplicates = 0

        try {
          for (const event of parsed.data) {
            const occurredAt = coerceOccurredAt(event.occurredAt)
            const usageDay = occurredAt.toISOString().slice(0, 10)
            const displayName = event.displayName?.trim()

            const userConflictUpdate: { lastSeenAt: Date; displayName?: string } = {
              lastSeenAt: new Date(),
            }
            if (displayName) {
              userConflictUpdate.displayName = displayName
            }

            await db
              .insert(users)
              .values({
                id: event.userId,
                ...(displayName ? { displayName } : {}),
              })
              .onConflictDoUpdate({
                target: users.id,
                set: userConflictUpdate,
              })

            const insertedEvent = await db
              .insert(usageEvents)
              .values({
                id: event.id,
                userId: event.userId,
                usageDay,
                tokens: event.tokens,
                model: event.model.trim(),
                provider: event.provider.trim(),
                occurredAt,
              })
              .onConflictDoNothing({ target: usageEvents.id })
              .returning({ id: usageEvents.id })

            if (insertedEvent.length === 0) {
              duplicates += 1
            } else {
              inserted += 1
            }
          }
        } catch (error) {
          console.error('ingest_failed', error)
          return json(500, {
            ok: false,
            error: 'ingest_failed',
            message: 'Failed to write usage events',
          })
        }

        return json(200, {
          ok: true,
          received: parsed.data.length,
          inserted,
          duplicates,
        })
      },
    },
  },
})
