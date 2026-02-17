import { createFileRoute, Link } from "@tanstack/solid-router";
import { queryOptions, useQuery } from "@tanstack/solid-query";
import { For, Show, createMemo } from "solid-js";

import { getProfileStats } from "../../server/functions";

const PIE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
  "var(--chart-9)",
  "var(--chart-10)",
];

const profileQueryOptions = (handle: string) =>
  queryOptions({
    queryKey: ["profile", handle],
    queryFn: () =>
      getProfileStats({
        data: {
          handle,
        },
      }),
    staleTime: 1000 * 60 * 5,
  });

export const Route = createFileRoute("/porfile/$hanldle")({
  loader: ({ params, context }) => context.queryClient.ensureQueryData(profileQueryOptions(params.hanldle)),
  component: ProfilePage,
});

function formatTokens(value: number | null | undefined) {
  return Number(value ?? 0).toLocaleString("en-US");
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function normalizeHandle(handle: string) {
  const trimmed = handle.trim();
  if (!trimmed) return "";
  return `@${trimmed.replace(/^@/, "")}`;
}

function ProfilePage() {
  const params = Route.useParams();
  const profileQuery = useQuery(() => profileQueryOptions(params().hanldle));

  const slices = createMemo(() => {
    const data = profileQuery.data;
    const total = data?.totalTokens ?? 0;
    const byModel = data?.byModel ?? [];

    if (total <= 0 || byModel.length === 0) {
      return [] as Array<{ model: string; tokens: number; percentage: number; color: string }>;
    }

    return byModel.map((entry, index) => ({
      model: entry.model,
      tokens: entry.tokens,
      percentage: entry.tokens / total,
      color: PIE_COLORS[index % PIE_COLORS.length]!,
    }));
  });

  const pieBackground = createMemo(() => {
    const currentSlices = slices();
    if (currentSlices.length === 0) {
      return "conic-gradient(#1a1a1a 0deg 360deg)";
    }

    let currentDeg = 0;
    const stops = currentSlices.map((slice) => {
      const start = currentDeg;
      currentDeg += slice.percentage * 360;
      return `${slice.color} ${start}deg ${currentDeg}deg`;
    });

    return `conic-gradient(${stops.join(", ")})`;
  });

  return (
    <div class="max-w-6xl mx-auto px-6 py-12">
      <div class="mb-8">
        <p class="text-xs uppercase tracking-[0.16em] text-[var(--accent)] m-0">Profile</p>
        <h1 class="text-3xl md:text-4xl font-bold text-[var(--text-primary)] tracking-tight mt-2 mb-2">
          {normalizeHandle(profileQuery.data?.handle ?? params().hanldle)}
        </h1>
        <p class="text-[#737373] text-base m-0">Individual usage stats across all recorded sessions.</p>
      </div>

      <Show when={profileQuery.isPending}>
        <div class="border border-[#262626] bg-[#111111] p-5">
          <p class="text-[#a3a3a3] text-sm m-0">Loading profile statistics...</p>
        </div>
      </Show>

      <Show when={profileQuery.data && !profileQuery.data.found}>
        <div class="border border-[#7f1d1d] bg-[#111111] p-5 flex flex-col gap-3">
          <p class="text-[#f87171] text-sm m-0">No profile found for this handle.</p>
<Link to="/" class="text-sm text-[#a3a3a3] hover:text-[var(--text-primary)] no-underline">
            Back to leaderboard
          </Link>
        </div>
      </Show>

      <Show when={profileQuery.data?.found ? profileQuery.data : null}>
        {(profile) => (
          <div class="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
            <div class="border border-[#262626] bg-[#111111] p-5">
              <p class="text-[var(--text-secondary)] text-xs uppercase tracking-[0.16em] m-0 mb-2">All Tokens Used</p>
              <p class="text-[var(--text-primary)] text-4xl font-bold tracking-tight m-0">
                {formatTokens(profile().totalTokens)}
              </p>
            </div>

            <div class="border border-[#262626] bg-[#111111] p-5">
              <div class="flex items-center justify-between gap-4 mb-4">
                <p class="text-[var(--text-primary)] text-sm font-semibold m-0">Tokens by model</p>
                <p class="text-[var(--text-secondary)] text-xs m-0">{profile().byModel.length} models</p>
              </div>

              <div class="grid grid-cols-1 xl:grid-cols-[220px_1fr] gap-5 items-start">
                <div
                  class="h-[220px] w-[220px] rounded-full border border-[#262626] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.25)]"
                  style={{ background: pieBackground() }}
                  aria-label="Token distribution by model"
                />

                <div class="space-y-2 max-h-[260px] overflow-auto pr-1">
                  <Show when={slices().length > 0} fallback={<p class="text-[#737373] text-sm m-0">No token usage yet.</p>}>
                    <For each={slices()}>
                      {(slice) => (
                        <div class="flex items-center justify-between gap-4 border border-[#262626] px-3 py-2">
                          <div class="flex items-center gap-2 min-w-0">
                            <span
                              class="h-2.5 w-2.5 rounded-full shrink-0"
                              style={{ "background-color": slice.color }}
                              aria-hidden="true"
                            />
                            <span class="text-[var(--text-primary)] text-sm truncate">{slice.model}</span>
                          </div>
                          <div class="text-right shrink-0">
                            <p class="text-[var(--text-primary)] text-xs m-0">{formatTokens(slice.tokens)} tokens</p>
                            <p class="text-[var(--text-secondary)] text-xs m-0">{formatPercent(slice.percentage)}</p>
                          </div>
                        </div>
                      )}
                    </For>
                  </Show>
                </div>
              </div>
            </div>
          </div>
        )}
      </Show>

      <div class="mt-6">
        <Link to="/" class="text-sm text-[#a3a3a3] hover:text-[var(--text-primary)] no-underline">
          Back to leaderboard
        </Link>
      </div>
    </div>
  );
}
