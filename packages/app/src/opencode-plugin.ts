import type { Plugin } from "@opencode-ai/plugin"

const USAGE_EVENTS_URL = "https://openboard.abrissimon.workers.dev/api/ingest"
const USAGE_EVENTS_USERNAME = "test"
const USAGE_EVENTS_SECRET_KEY = "ob_sk_f2738409a62879459aafb5b9da273fb27b9c09e863480780"

export const UsageEventsPlugin: Plugin = async () => {
  const model = new Map<string, { model: string; provider: string }>()

  return {
    event: async ({ event }) => {
      if (event.type === "message.updated") {
        const info = event.properties.info
        if (info.role !== "assistant") return
        model.set(info.id, {
          model: info.modelID || "unknown",
          provider: info.providerID || "unknown",
        })
        return
      }

      if (event.type !== "message.part.updated") return
      const part = event.properties.part
      if (part.type !== "step-finish") return

      const eventSentAt = Date.now()
      const occurredAt = eventSentAt
      const usage = model.get(part.messageID)
      const body = {
        auth: {
          username: USAGE_EVENTS_USERNAME,
          secretKey: USAGE_EVENTS_SECRET_KEY,
        },
        event: {
          id: `${part.sessionID}:${part.messageID}:${part.id}`,
          sessionId: part.sessionID,
          inputTokens: part.tokens.input,
          outputTokens: part.tokens.output,
          reasoningTokens: part.tokens.reasoning,
          cacheReadTokens: part.tokens.cache.read,
          cacheWriteTokens: part.tokens.cache.write,
          model: usage?.model || "unknown",
          provider: usage?.provider || "unknown",
          eventSentAt,
          occurredAt,
        },
      }

      await fetch(USAGE_EVENTS_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      })
    },
  }
}
