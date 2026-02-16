import { createFileRoute } from '@tanstack/solid-router'
import { queryOptions, useQuery } from '@tanstack/solid-query'
import { createServerFn } from '@tanstack/solid-start'
import { For } from 'solid-js'
import { Trophy, Flame, Crown } from 'lucide-solid'

const LEADERBOARD_LIMIT = 10

type LeaderboardEntry = {
  rank: number
  name: string
  tokens: number
  model: string
  sessions: number
}

type LeaderboardScope = 'daily' | 'all-time'

type LeaderboardModelRow = {
  userId: string
  displayName: string | null
  model: string
  tokens: number | string
  sessions: number | string
}

function getUtcDayKey() {
  return new Date().toISOString().slice(0, 10)
}

function getDisplayName(userId: string, displayName: string | null) {
  if (typeof displayName === 'string' && displayName.trim().length > 0) {
    return displayName.trim()
  }

  return `anon_${userId.slice(0, 8)}`
}

async function fetchLeaderboard(scope: LeaderboardScope): Promise<LeaderboardEntry[]> {
  const [{ createDb }, { usageEvents, users }, { eq, sql }] = await Promise.all([
    import('../db'),
    import('../db/schema'),
    import('drizzle-orm'),
  ])

  const db = createDb()

  const baseQuery = db
    .select({
      userId: usageEvents.userId,
      displayName: users.displayName,
      model: usageEvents.model,
      tokens: sql<number>`sum(${usageEvents.tokens})`,
      sessions: sql<number>`count(*)`,
    })
    .from(usageEvents)
    .leftJoin(users, eq(users.id, usageEvents.userId))

  const rows = (scope === 'daily'
    ? await baseQuery
        .where(eq(usageEvents.usageDay, getUtcDayKey()))
        .groupBy(usageEvents.userId, users.displayName, usageEvents.model)
    : await baseQuery.groupBy(usageEvents.userId, users.displayName, usageEvents.model)) as Array<LeaderboardModelRow>

  const byUser = new Map<
    string,
    { name: string; tokens: number; sessions: number; topModel: string; topModelTokens: number }
  >()

  for (const row of rows) {
    const rowTokens = Number(row.tokens ?? 0)
    const rowSessions = Number(row.sessions ?? 0)
    const current =
      byUser.get(row.userId) ??
      ({
        name: getDisplayName(row.userId, row.displayName),
        tokens: 0,
        sessions: 0,
        topModel: row.model,
        topModelTokens: -1,
      } as const)

    const next = {
      ...current,
      tokens: current.tokens + rowTokens,
      sessions: current.sessions + rowSessions,
      topModel: rowTokens > current.topModelTokens ? row.model : current.topModel,
      topModelTokens: Math.max(current.topModelTokens, rowTokens),
    }
    byUser.set(row.userId, next)
  }

  return [...byUser.values()]
    .sort((a, b) => b.tokens - a.tokens)
    .slice(0, LEADERBOARD_LIMIT)
    .map((entry, index) => ({
      rank: index + 1,
      name: entry.name,
      tokens: entry.tokens,
      model: entry.topModel,
      sessions: entry.sessions,
    }))
}

const getDailyLeaderboard = createServerFn({ method: 'GET' }).handler(async () => {
  return fetchLeaderboard('daily')
})

const getAllTimeLeaderboard = createServerFn({ method: 'GET' }).handler(async () => {
  return fetchLeaderboard('all-time')
})

const dailyLeaderboardQueryOptions = queryOptions({
  queryKey: ['leaderboard', 'daily'],
  queryFn: () => getDailyLeaderboard(),
})

const allTimeLeaderboardQueryOptions = queryOptions({
  queryKey: ['leaderboard', 'all-time'],
  queryFn: () => getAllTimeLeaderboard(),
})

export const Route = createFileRoute('/')({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(dailyLeaderboardQueryOptions),
      context.queryClient.ensureQueryData(allTimeLeaderboardQueryOptions),
    ]),
  component: Home,
})

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

function RankBadge(props: { rank: number }) {
  if (props.rank === 1) {
    return (
      <div class="flex items-center justify-center w-8 h-8 rounded-md bg-[#fbbf24]/10 text-[#fbbf24]">
        <Crown size={16} />
      </div>
    )
  }
  if (props.rank === 2) {
    return (
      <div class="flex items-center justify-center w-8 h-8 rounded-md bg-[#94a3b8]/10 text-[#94a3b8] text-sm font-bold">
        2
      </div>
    )
  }
  if (props.rank === 3) {
    return (
      <div class="flex items-center justify-center w-8 h-8 rounded-md bg-[#d97706]/10 text-[#d97706] text-sm font-bold">
        3
      </div>
    )
  }
  return (
    <div class="flex items-center justify-center w-8 h-8 rounded-md text-[#525252] text-sm font-medium">
      {props.rank}
    </div>
  )
}

function LeaderboardTable(props: {
  title: string
  subtitle: string
  icon: any
  data: LeaderboardEntry[]
}) {
  return (
    <div class="border border-[#262626] overflow-hidden bg-[#0a0a0a]">
      <div class="px-5 py-4 border-b border-[#262626] flex items-center gap-3">
        {props.icon}
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
              <th class="text-right py-3 px-2 font-medium">Tokens</th>
              <th class="text-right py-3 px-2 font-medium hidden sm:table-cell">Model</th>
              <th class="text-right py-3 px-5 font-medium hidden md:table-cell">Sessions</th>
            </tr>
          </thead>
          <tbody>
            <For each={props.data}>
              {(entry) => (
                <tr class="border-b border-[#1a1a1a] hover:bg-[#1a1a1a]/50 transition-colors">
                  <td class="py-3 px-5">
                    <RankBadge rank={entry.rank} />
                  </td>
                  <td class="py-3 px-2">
                    <span class={`font-medium ${entry.rank <= 3 ? 'text-[#e5e5e5]' : 'text-[#a3a3a3]'}`}>
                      {entry.name}
                    </span>
                  </td>
                  <td class="py-3 px-2 text-right">
                    <span class="text-[#22d3ee] font-semibold">{formatTokens(entry.tokens)}</span>
                  </td>
                  <td class="py-3 px-2 text-right hidden sm:table-cell">
                    <span class="text-[#525252] text-xs bg-[#1a1a1a] px-2 py-1 rounded">
                      {entry.model}
                    </span>
                  </td>
                  <td class="py-3 px-5 text-right text-[#525252] hidden md:table-cell">
                    {entry.sessions}
                  </td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Home() {
  const dailyLeaderboardQuery = useQuery(() => dailyLeaderboardQueryOptions)
  const allTimeLeaderboardQuery = useQuery(() => allTimeLeaderboardQueryOptions)

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

      <div class="flex flex-col gap-10">
        <LeaderboardTable
          title="Today's Leaderboard"
          subtitle={new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          icon={<Flame size={20} class="text-[#f97316]" />}
          data={dailyLeaderboardQuery.data ?? []}
        />

        <LeaderboardTable
          title="All Time"
          subtitle="Cumulative token usage since launch"
          icon={<Trophy size={20} class="text-[#fbbf24]" />}
          data={allTimeLeaderboardQuery.data ?? []}
        />
      </div>
    </div>
  )
}
