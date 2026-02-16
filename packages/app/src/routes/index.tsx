import { createFileRoute } from "@tanstack/solid-router";
import { queryOptions, useQuery } from "@tanstack/solid-query";
import { For, Show, createSignal } from "solid-js";
import openboardPluginTemplate from "../opencode-plugin.ts?raw";

import {
  createUser,
  getAllTimeLeaderboard,
  getDailyLeaderboard,
  type LeaderboardEntry,
} from "../server/functions";

const dailyLeaderboardQueryOptions = queryOptions({
  queryKey: ["leaderboard", "daily"],
  queryFn: () => getDailyLeaderboard(),
});

const allTimeLeaderboardQueryOptions = queryOptions({
  queryKey: ["leaderboard", "all-time"],
  queryFn: () => getAllTimeLeaderboard(),
});

export const Route = createFileRoute("/")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(dailyLeaderboardQueryOptions),
      context.queryClient.ensureQueryData(allTimeLeaderboardQueryOptions),
    ]),
  component: Home,
});

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function RankDisplay(props: { rank: number }) {
  return (
    <span class="text-[#525252] text-sm font-medium">
      {props.rank}
    </span>
  );
}

function LeaderboardTable(props: {
  title: string;
  subtitle: string;
  data: LeaderboardEntry[];
}) {
  return (
    <div class="border border-[#262626] overflow-hidden bg-[#0a0a0a]">
      <div class="px-5 py-4 border-b border-[#262626]">
        <div>
          <h2 class="text-[#e5e5e5] text-base font-semibold m-0">{props.title}</h2>
          <p class="text-[#525252] text-xs m-0 mt-0.5">{props.subtitle}</p>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-[#262626] text-[#525252] text-xs uppercase tracking-wider">
              <th class="text-left py-3 px-5 font-medium w-16">#</th>
              <th class="text-left py-3 px-2 font-medium">User</th>
              <th class="text-right py-3 px-5 font-medium">Tokens</th>
            </tr>
          </thead>
          <tbody>
            <For each={props.data}>
              {(entry) => (
                <tr class="border-b border-[#1a1a1a] hover:bg-[#1a1a1a]/50 transition-colors">
                  <td class="py-3 px-5">
                    <RankDisplay rank={entry.rank} />
                  </td>
                  <td class="py-3 px-2">
                    <span
                      class={`font-medium ${entry.rank <= 3 ? "text-[#e5e5e5]" : "text-[#a3a3a3]"}`}
                    >
                      {entry.name}
                    </span>
                  </td>
                  <td class="py-3 px-5 text-right">
                    <span class="text-[var(--accent)] font-semibold">{formatTokens(entry.tokens)}</span>
                  </td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Home() {
  const dailyLeaderboardQuery = useQuery(() => dailyLeaderboardQueryOptions);
  const allTimeLeaderboardQuery = useQuery(() => allTimeLeaderboardQueryOptions);
  let setupDialog: HTMLDialogElement | undefined;
  const [username, setUsername] = createSignal("");
  const [isCreatingUser, setIsCreatingUser] = createSignal(false);
  const [claimError, setClaimError] = createSignal<string | null>(null);
  const [claimedUsername, setClaimedUsername] = createSignal<string | null>(null);
  const [secretKey, setSecretKey] = createSignal<string | null>(null);
  const [setupScriptCopied, setSetupScriptCopied] = createSignal(false);

  const openSetupDialog = () => {
    setupDialog?.showModal();
  };

  const closeSetupDialog = () => {
    setupDialog?.close();
  };

  const onCreateUsername = async () => {
    if (isCreatingUser()) return;

    setClaimError(null);
    setSetupScriptCopied(false);
    setIsCreatingUser(true);

    try {
      const result = await createUser({
        data: {
          username: username(),
        },
      });

      if (!result.ok) {
        setClaimedUsername(null);
        setSecretKey(null);
        setClaimError(result.message);
        return;
      }

      setClaimedUsername(result.username);
      setSecretKey(result.secretKey);
      setUsername(result.username);
    } catch {
      setClaimError("Failed to create user");
    } finally {
      setIsCreatingUser(false);
    }
  };

  const generatedPluginCode = () => {
    const setupUsername = claimedUsername();
    const setupSecretKey = secretKey();
    if (!setupUsername || !setupSecretKey) return "";

    const usernameLiteral = JSON.stringify(setupUsername);
    const secretKeyLiteral = JSON.stringify(setupSecretKey);

    return openboardPluginTemplate
      .replace(/const USAGE_EVENTS_USERNAME = .+;/, `const USAGE_EVENTS_USERNAME = ${usernameLiteral};`)
      .replace(
        /const USAGE_EVENTS_SECRET_KEY = .+;/,
        `const USAGE_EVENTS_SECRET_KEY = ${secretKeyLiteral};`,
      );
  };

  const generatedSetupScript = () => {
    const pluginCode = generatedPluginCode();
    if (!pluginCode) return "";
    const pluginCodeBase64 = btoa(unescape(encodeURIComponent(pluginCode)));

    return `#!/usr/bin/env bash
set -euo pipefail

mkdir -p "$HOME/.config/opencode/plugins"

printf '%s' '${pluginCodeBase64}' | base64 --decode > "$HOME/.config/opencode/plugins/openboard-usage.ts"

echo "OpenBoard usage plugin written to ~/.config/opencode/plugins/openboard-usage.ts"`;
  };

  const onCopySetupScript = async () => {
    const script = generatedSetupScript();
    if (!script) return;

    try {
      await navigator.clipboard.writeText(script);
      setSetupScriptCopied(true);
    } catch {
      setClaimError("Unable to copy automatically. Copy the setup script manually.");
    }
  };

  return (
    <div class="max-w-6xl mx-auto px-6 py-12">
      <div class="mb-12">
        <h1 class="text-4xl md:text-5xl font-bold text-[#e5e5e5] tracking-tight mb-3">
          The open source AI coding leaderboard
        </h1>
        <p class="text-[#525252] text-lg max-w-2xl">
          Track token usage across OpenCode users. Anonymous, open, community-driven.
        </p>
      </div>

      <div class="mb-6">
        <button
          type="button"
          onClick={openSetupDialog}
          class="px-4 py-2 bg-[var(--accent)] text-[#0a0a0a] text-sm font-semibold hover:bg-[#67e8f9]"
        >
          Setup
        </button>
      </div>

      <div class="flex flex-col gap-10">
        <LeaderboardTable
          title="Today's Leaderboard"
          subtitle={new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
          data={dailyLeaderboardQuery.data ?? []}
        />

        <LeaderboardTable
          title="All Time"
          subtitle="Cumulative token usage since launch"
          data={allTimeLeaderboardQuery.data ?? []}
        />
      </div>

      <dialog
        ref={(element) => {
          setupDialog = element;
        }}
        class="setup-dialog w-[min(920px,calc(100vw-2rem))] bg-[#0a0a0a] border border-[#262626] p-0"
      >
        <div class="border-b border-[#262626] px-5 py-4 flex items-center justify-between">
          <h2 class="text-[#e5e5e5] text-base font-semibold m-0">OpenBoard setup</h2>
          <button
            type="button"
            class="text-[#737373] hover:text-[#e5e5e5] text-sm"
            onClick={closeSetupDialog}
            aria-label="Close setup dialog"
          >
            Close
          </button>
        </div>

        <div class="p-5">
          <p class="text-[#a3a3a3] text-sm mt-0 mb-2">
            Create a username first. We generate a secret key tied to that user.
          </p>
          <p class="text-[#a3a3a3] text-sm mt-0 mb-5">
            The key is shown once. Save it, then install the OpenBoard plugin with the setup
            script.
          </p>

          <div class="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={username()}
              onInput={(event) => setUsername(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void onCreateUsername();
                }
              }}
              placeholder="your_username"
              autocomplete="off"
              class="flex-1 px-3 py-2 bg-[#111111] border border-[#262626] text-[#e5e5e5] text-sm outline-none focus:border-[var(--accent)]"
            />
            <button
              type="button"
              onClick={() => void onCreateUsername()}
              disabled={isCreatingUser()}
              class="px-4 py-2 bg-[var(--accent)] text-[#0a0a0a] text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isCreatingUser() ? "Creating..." : "Create username"}
            </button>
          </div>

          <Show when={claimError()}>
            {(error) => <p class="text-[#f87171] text-sm mt-3 mb-0">{error()}</p>}
          </Show>

          <Show when={secretKey()}>
            {(secret) => (
              <div class="mt-5 border border-[#262626] bg-[#111111] p-4">
                <p class="text-[var(--accent)] text-sm m-0">
                  Claimed <span class="font-semibold">{claimedUsername()}</span>
                </p>
                <p class="text-[#facc15] text-xs mt-2 mb-3">
                  Save this key now. You won’t be able to view it again.
                </p>
                <code class="block text-[#e5e5e5] text-xs break-all bg-[#0a0a0a] p-3 border border-[#262626]">
                  {secret()}
                </code>

                <div class="mt-4">
                  <button
                    type="button"
                    onClick={onCopySetupScript}
                    class="px-3 py-1.5 border border-[var(--accent)] text-[var(--accent)] text-xs font-semibold hover:bg-[var(--accent)]/10"
                  >
                    {setupScriptCopied() ? "Setup script copied" : "Copy setup script"}
                  </button>
                </div>

                <pre class="mt-3 overflow-x-auto text-[#e5e5e5] text-xs bg-[#0a0a0a] p-3 border border-[#262626]">
                  <code>{generatedPluginCode()}</code>
                </pre>
              </div>
            )}
          </Show>
        </div>
      </dialog>
    </div>
  );
}
