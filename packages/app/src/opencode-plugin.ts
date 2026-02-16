import type { Plugin } from "@opencode-ai/plugin"

export const MyPlugin: Plugin = async ({ project, client, $, directory, worktree }) => {
  return {
    async event({ event }) {
      if (event.type === 'message.updated' && event.properties.info.role === 'assistant') {
        event.properties.info.
      }
    }
  }
}
