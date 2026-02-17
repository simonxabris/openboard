import { Link, createFileRoute } from "@tanstack/solid-router";
import { queryOptions, useQuery } from "@tanstack/solid-query";
import { For, Show, createSignal } from "solid-js";
import { ExternalLink } from "lucide-solid";

import { authClient } from "../lib/auth-client";
import {
  getAllTimeLeaderboard,
  getDailyLeaderboard,
  getSessionStatus,
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
  loader: async ({ context }) => {
    const [, , sessionStatus] = await Promise.all([
      context.queryClient.ensureQueryData(dailyLeaderboardQueryOptions),
      context.queryClient.ensureQueryData(allTimeLeaderboardQueryOptions),
      getSessionStatus(),
    ]);

    return sessionStatus;
  },
  component: Home,
});

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function getXProfileUrl(handle: string): string {
  const username = handle.trim().replace(/^@/, "");
  return `https://x.com/${encodeURIComponent(username)}`;
}

function getDisplayHandle(handle: string): string {
  const username = handle.trim().replace(/^@/, "");
  return `@${username}`;
}

function RankDisplay(props: { rank: number }) {
  return <span class="text-[var(--text-secondary)] text-sm font-medium">{props.rank}</span>;
}

function LeaderboardTable(props: { title: string; subtitle: string; data: LeaderboardEntry[] }) {
  return (
    <div class="border border-[#262626] overflow-hidden bg-[#0a0a0a]">
      <div class="px-5 py-4 border-b border-[#262626]">
        <div>
          <h2 class="text-[var(--text-primary)] text-base font-semibold m-0">{props.title}</h2>
          <p class="text-[var(--text-secondary)] text-xs m-0 mt-0.5">{props.subtitle}</p>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-[#262626] text-[var(--text-secondary)] text-xs uppercase tracking-wider">
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
                    <div class="flex items-center gap-2.5">
                      <div class="h-8 w-8 overflow-hidden rounded-full bg-[#1a1a1a] border border-[#262626]">
                        <Show
                          when={entry.imageUrl}
                          fallback={
                            <span class="h-full w-full grid place-items-center text-[10px] font-semibold text-[#a3a3a3]">
                              {entry.handle.replace(/^@/, "").slice(0, 2).toUpperCase()}
                            </span>
                          }
                        >
                          {(imageUrl) => (
                            <img
                              src={imageUrl()}
                              alt={`${getDisplayHandle(entry.handle)} avatar`}
                              class="h-full w-full object-cover"
                              loading="lazy"
                            />
                          )}
                        </Show>
                      </div>
                      <div class="flex items-center gap-2">
                        <Link
                          to="/porfile/$hanldle"
                          params={{ hanldle: entry.handle }}
                          class={`font-medium no-underline hover:text-[var(--text-primary)] ${entry.rank <= 3 ? "text-[var(--text-primary)]" : "text-[#a3a3a3]"}`}
                        >
                          {getDisplayHandle(entry.handle)}
                        </Link>
                        <a
                          href={getXProfileUrl(entry.handle)}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Open ${getDisplayHandle(entry.handle)} on X`}
                          class="text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors inline-flex items-center"
                        >
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    </div>
                  </td>
                  <td class="py-3 px-5 text-right">
                    <span class="text-[var(--accent)] font-semibold">
                      {formatTokens(entry.tokens)}
                    </span>
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
  const loaderData = Route.useLoaderData();
  const isLoggedIn = () => loaderData().isLoggedIn;
  const [isSigningIn, setIsSigningIn] = createSignal(false);
  const [signInError, setSignInError] = createSignal<string | null>(null);

  const onSignInWithX = async () => {
    if (isSigningIn()) return;

    setSignInError(null);
    setIsSigningIn(true);

    try {
      const result = await authClient.signIn.social({
        provider: "twitter",
        callbackURL: "/onboard",
      });

      if (result.error) {
        setSignInError(result.error.message || "Unable to start X sign-in.");
      }
    } catch {
      setSignInError("Unable to start X sign-in.");
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div class="max-w-6xl mx-auto px-6 py-12">
      <div class="mb-12">
        <h1 class="text-4xl md:text-5xl font-bold text-[var(--text-primary)] tracking-tight mb-3">
          Daily leaderboard for OpenCode
        </h1>
        <p class="text-[var(--text-secondary)] text-lg max-w-2xl">Who will generate the most slop today?</p>
      </div>

      <Show when={!isLoggedIn()}>
        <div class="mb-10 border border-[#262626] bg-[#0a0a0a] p-6">
          <div class="border border-[#262626] bg-[#111111] px-4 py-3 mb-5 flex items-start gap-3">
            <span class="text-[var(--accent)] text-sm leading-relaxed shrink-0">🔒</span>
            <p class="text-[#a3a3a3] text-sm leading-relaxed m-0">
              The plugin only sends anonymous session IDs and token counts —{" "}
              <span class="text-[var(--text-primary)] font-semibold">no code, prompts, or personal data</span>{" "}
              ever leaves your machine. You can verify this yourself when setting up the plugin —
              the source is fully open.
            </p>
          </div>

          <p class="text-[var(--text-secondary)] text-xs uppercase tracking-[0.16em] m-0 mb-5">Get on the board</p>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div class="flex flex-col gap-3">
              <div class="flex items-center gap-3">
                <span class="shrink-0 h-7 w-7 grid place-items-center border border-[var(--accent)] text-[var(--accent)] text-xs font-bold">
                  1
                </span>
                <span class="text-[var(--text-primary)] text-sm font-semibold">Sign in with X</span>
              </div>
              <p class="text-[var(--text-secondary)] text-xs leading-relaxed m-0 pl-10">
                Connect your X account so your usage appears on the leaderboard.
              </p>
              <div class="pl-10 mt-1">
                <button
                  type="button"
                  onClick={() => void onSignInWithX()}
                  disabled={isSigningIn()}
                  class="px-4 py-2 bg-[var(--accent)] text-[#0a0a0a] text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSigningIn() ? "Redirecting..." : "Sign in →"}
                </button>
                <Show when={signInError()}>
                  {(error) => <p class="text-[#f87171] text-xs m-0 mt-2">{error()}</p>}
                </Show>
              </div>
            </div>

            {/* Step 2 */}
            <div class="flex flex-col gap-3">
              <div class="flex items-center gap-3">
                <span class="shrink-0 h-7 w-7 grid place-items-center border border-[#262626] text-[var(--text-secondary)] text-xs font-bold">
                  2
                </span>
                <span class="text-[#a3a3a3] text-sm font-semibold">Setup plugin</span>
              </div>
              <p class="text-[var(--text-secondary)] text-xs leading-relaxed m-0 pl-10">
                Install the OpenCode plugin and paste your token to start reporting usage.
              </p>
            </div>

            {/* Step 3 */}
            <div class="flex flex-col gap-3">
              <div class="flex items-center gap-3">
                <span class="shrink-0 h-7 w-7 grid place-items-center border border-[#262626] text-[var(--text-secondary)] text-xs font-bold">
                  3
                </span>
                <span class="text-[#a3a3a3] text-sm font-semibold">Good to go</span>
              </div>
              <p class="text-[var(--text-secondary)] text-xs leading-relaxed m-0 pl-10">
                Start coding — your token usage will appear on the leaderboard automatically.
              </p>
            </div>
          </div>
        </div>
      </Show>

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
    </div>
  );
}
