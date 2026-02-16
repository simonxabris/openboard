import { createFileRoute } from '@tanstack/solid-router'
import { queryOptions, useQuery } from '@tanstack/solid-query'
import { For, Show, createSignal } from 'solid-js'
import { Trophy, Flame, Crown } from 'lucide-solid'
import {
  createUser,
  getAllTimeLeaderboard,
  getDailyLeaderboard,
  type LeaderboardEntry,
} from '../server/functions'

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
              <th class="text-right py-3 px-5 font-medium">Tokens</th>
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
                  <td class="py-3 px-5 text-right">
                    <span class="text-[#22d3ee] font-semibold">{formatTokens(entry.tokens)}</span>
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
  const [username, setUsername] = createSignal('')
  const [isCreatingUser, setIsCreatingUser] = createSignal(false)
  const [claimError, setClaimError] = createSignal<string | null>(null)
  const [claimedUsername, setClaimedUsername] = createSignal<string | null>(null)
  const [secretKey, setSecretKey] = createSignal<string | null>(null)
  const [secretCopied, setSecretCopied] = createSignal(false)

  const onClaimSubmit = async (event: SubmitEvent) => {
    event.preventDefault()
    if (isCreatingUser()) return

    setClaimError(null)
    setSecretCopied(false)
    setIsCreatingUser(true)

    try {
      const result = await createUser({
        data: {
          username: username(),
        },
      })

      if (!result.ok) {
        setClaimedUsername(null)
        setSecretKey(null)
        setClaimError(result.message)
        return
      }

      setClaimedUsername(result.username)
      setSecretKey(result.secretKey)
      setUsername(result.username)
    } catch {
      setClaimError('Failed to create user')
    } finally {
      setIsCreatingUser(false)
    }
  }

  const onCopySecret = async () => {
    const value = secretKey()
    if (!value) return

    try {
      await navigator.clipboard.writeText(value)
      setSecretCopied(true)
    } catch {
      setClaimError('Unable to copy automatically. Copy the secret manually.')
    }
  }

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

      <div class="border border-[#262626] bg-[#0a0a0a] p-5 mb-10">
        <h2 class="text-[#e5e5e5] text-base font-semibold m-0">Claim a username</h2>
        <p class="text-[#737373] text-sm mt-2 mb-4">
          Claiming creates your user and returns a secret key. You must store it securely and send
          it with ingestion requests.
        </p>

        <form class="flex flex-col sm:flex-row gap-3" onSubmit={onClaimSubmit}>
          <input
            type="text"
            value={username()}
            onInput={(event) => setUsername(event.currentTarget.value)}
            placeholder="your_username"
            autocomplete="off"
            class="flex-1 px-3 py-2 bg-[#111111] border border-[#262626] text-[#e5e5e5] text-sm outline-none focus:border-[#22d3ee]"
          />
          <button
            type="submit"
            disabled={isCreatingUser()}
            class="px-4 py-2 bg-[#22d3ee] text-[#0a0a0a] text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isCreatingUser() ? 'Creating...' : 'Claim username'}
          </button>
        </form>

        <Show when={claimError()}>
          {(error) => <p class="text-[#f87171] text-sm mt-3">{error()}</p>}
        </Show>

        <Show when={secretKey()}>
          {(secret) => (
            <div class="mt-4 border border-[#262626] bg-[#111111] p-4">
              <p class="text-[#22d3ee] text-sm m-0">
                Claimed <span class="font-semibold">{claimedUsername()}</span>
              </p>
              <p class="text-[#facc15] text-xs mt-2 mb-3">
                This secret is only shown once. Save it now.
              </p>
              <code class="block text-[#e5e5e5] text-xs break-all bg-[#0a0a0a] p-3 border border-[#262626]">
                {secret()}
              </code>
              <button
                type="button"
                onClick={onCopySecret}
                class="mt-3 px-3 py-1.5 border border-[#262626] text-[#a3a3a3] text-xs hover:text-[#e5e5e5] hover:border-[#3f3f46]"
              >
                {secretCopied() ? 'Copied' : 'Copy secret'}
              </button>
            </div>
          )}
        </Show>
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
