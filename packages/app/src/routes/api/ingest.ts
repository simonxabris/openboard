import { createFileRoute } from "@tanstack/solid-router";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { createDb } from "../../db";
import { usageEvents, users } from "../../db/schema";
import { hashSecretKey, normalizeUsername } from "../../server/user-auth";

const MAX_EVENTS_PER_REQUEST = 500;

const ingestAuthSchema = z.object({
  username: z.string().trim().min(3).max(32),
  secretKey: z.string().trim().min(16).max(256),
});

const ingestEventSchema = z.object({
  id: z.string().trim().min(1).max(128),
  sessionId: z.string().trim().min(1).max(128),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  reasoningTokens: z.number().int().nonnegative(),
  cacheReadTokens: z.number().int().nonnegative(),
  cacheWriteTokens: z.number().int().nonnegative(),
  model: z.string().trim().min(1).max(120),
  provider: z.string().trim().min(1).max(120),
  eventSentAt: z.number().int().positive(),
  occurredAt: z.union([z.number().int(), z.string().datetime({ offset: true })]).optional(),
});

const ingestPayloadSchema = z
  .union([
    z.object({
      auth: ingestAuthSchema,
      events: z.array(ingestEventSchema).min(1).max(MAX_EVENTS_PER_REQUEST),
    }),
    z.object({
      auth: ingestAuthSchema,
      event: ingestEventSchema,
    }),
  ])
  .transform((payload) => ({
    auth: payload.auth,
    events: "events" in payload ? payload.events : [payload.event],
  }));

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
    },
  });
}

function coerceOccurredAt(value: number | string | undefined): Date {
  if (value === undefined) return new Date();

  const normalizedValue =
    typeof value === "number" && value > 0 && value < 1_000_000_000_000 ? value * 1000 : value;
  const date = new Date(normalizedValue);
  if (Number.isNaN(date.getTime())) {
    throw new Error("invalid_occurred_at");
  }

  return date;
}

function coerceEventSentAt(value: number): Date {
  const normalizedValue = value > 0 && value < 1_000_000_000_000 ? value * 1000 : value;
  const date = new Date(normalizedValue);
  if (Number.isNaN(date.getTime())) {
    throw new Error("invalid_event_sent_at");
  }

  return date;
}

export const Route = createFileRoute("/api/ingest")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "POST, OPTIONS",
            "access-control-allow-headers": "content-type",
          },
        }),
      POST: async ({ request }) => {
        let rawBody: unknown;
        try {
          rawBody = await request.json();
        } catch {
          return json(400, {
            ok: false,
            error: "invalid_json",
            message: "Request body must be valid JSON",
          });
        }

        const parsed = ingestPayloadSchema.safeParse(rawBody);
        if (!parsed.success) {
          return json(400, {
            ok: false,
            error: "invalid_payload",
            issues: parsed.error.issues.map((issue) => ({
              path: issue.path.join("."),
              message: issue.message,
            })),
          });
        }

        const db = createDb();
        try {
          const usernameNormalized = normalizeUsername(parsed.data.auth.username);
          const secretKeyHash = await hashSecretKey(parsed.data.auth.secretKey);
          const userRows = await db
            .select({
              id: users.id,
              secretKeyHash: users.secretKeyHash,
            })
            .from(users)
            .where(eq(users.usernameNormalized, usernameNormalized))
            .limit(1);

          const user = userRows[0];
          if (!user || user.secretKeyHash !== secretKeyHash) {
            return json(401, {
              ok: false,
              error: "invalid_credentials",
              message: "Invalid username or secret key",
            });
          }

          await db.update(users).set({ lastSeenAt: new Date() }).where(eq(users.id, user.id));

          let applied = 0;
          let stale = 0;

          for (const event of parsed.data.events) {
            const eventSentAt = coerceEventSentAt(event.eventSentAt);
            const occurredAt = coerceOccurredAt(event.occurredAt ?? event.eventSentAt);
            const usageDay = occurredAt.toISOString().slice(0, 10);

            const updatedEvent = await db
              .insert(usageEvents)
              .values({
                id: event.id,
                userId: user.id,
                sessionId: event.sessionId.trim(),
                usageDay,
                inputTokens: event.inputTokens,
                outputTokens: event.outputTokens,
                reasoningTokens: event.reasoningTokens,
                cacheReadTokens: event.cacheReadTokens,
                cacheWriteTokens: event.cacheWriteTokens,
                model: event.model.trim(),
                provider: event.provider.trim(),
                eventSentAt,
                occurredAt,
              })
              .onConflictDoUpdate({
                target: [usageEvents.userId, usageEvents.sessionId],
                set: {
                  id: event.id,
                  usageDay,
                  inputTokens: event.inputTokens,
                  outputTokens: event.outputTokens,
                  reasoningTokens: event.reasoningTokens,
                  cacheReadTokens: event.cacheReadTokens,
                  cacheWriteTokens: event.cacheWriteTokens,
                  model: event.model.trim(),
                  provider: event.provider.trim(),
                  eventSentAt,
                  occurredAt,
                  receivedAt: new Date(),
                },
                where: sql`excluded.event_sent_at > ${usageEvents.eventSentAt}
                  OR (excluded.event_sent_at = ${usageEvents.eventSentAt}
                    AND excluded.id > ${usageEvents.id})`,
              })
              .returning({
                userId: usageEvents.userId,
                sessionId: usageEvents.sessionId,
              });

            if (updatedEvent.length === 0) {
              stale += 1;
            } else {
              applied += 1;
            }
          }

          return json(200, {
            ok: true,
            received: parsed.data.events.length,
            applied,
            stale,
          });
        } catch (error) {
          console.error("ingest_failed", error);
          return json(500, {
            ok: false,
            error: "ingest_failed",
            message: "Failed to write usage events",
          });
        }
      },
    },
  },
});
