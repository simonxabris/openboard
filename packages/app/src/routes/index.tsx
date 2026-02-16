import { createFileRoute } from '@tanstack/solid-router'
import { For } from 'solid-js'
import { Trophy, Flame, Crown } from 'lucide-solid'

export const Route = createFileRoute('/')({ component: Home })

type LeaderboardEntry = {
  rank: number
  name: string
  tokens: number
  model: string
  sessions: number
}

const dailyLeaderboard: LeaderboardEntry[] = [
  { rank: 1, name: 'phantom_dev', tokens: 2_847_312, model: 'claude-4-sonnet', sessions: 47 },
  { rank: 2, name: 'rust_enjoyer', tokens: 2_134_891, model: 'gpt-4.1', sessions: 38 },
  { rank: 3, name: 'nix_wizard', tokens: 1_923_445, model: 'claude-4-sonnet', sessions: 34 },
  { rank: 4, name: 'async_await', tokens: 1_567_230, model: 'gemini-2.5-pro', sessions: 29 },
  { rank: 5, name: 'kernel_panic', tokens: 1_245_678, model: 'claude-4-sonnet', sessions: 25 },
  { rank: 6, name: 'malloc_free', tokens: 987_432, model: 'gpt-4.1', sessions: 21 },
  { rank: 7, name: 'git_rebase', tokens: 876_321, model: 'deepseek-r1', sessions: 18 },
  { rank: 8, name: 'null_ptr', tokens: 654_219, model: 'claude-4-sonnet', sessions: 14 },
  { rank: 9, name: 'sudo_rm_rf', tokens: 543_210, model: 'gemini-2.5-pro', sessions: 12 },
  { rank: 10, name: 'vim_btw', tokens: 432_198, model: 'gpt-4.1', sessions: 9 },
]

const allTimeLeaderboard: LeaderboardEntry[] = [
  { rank: 1, name: 'rust_enjoyer', tokens: 48_293_412, model: 'claude-4-sonnet', sessions: 892 },
  { rank: 2, name: 'phantom_dev', tokens: 41_234_567, model: 'gpt-4.1', sessions: 743 },
  { rank: 3, name: 'nix_wizard', tokens: 37_891_234, model: 'claude-4-sonnet', sessions: 681 },
  { rank: 4, name: 'kernel_panic', tokens: 29_876_543, model: 'gemini-2.5-pro', sessions: 534 },
  { rank: 5, name: 'async_await', tokens: 24_567_890, model: 'claude-4-sonnet', sessions: 467 },
  { rank: 6, name: 'git_rebase', tokens: 19_345_678, model: 'deepseek-r1', sessions: 389 },
  { rank: 7, name: 'sudo_rm_rf', tokens: 15_234_567, model: 'gpt-4.1', sessions: 312 },
  { rank: 8, name: 'malloc_free', tokens: 12_876_543, model: 'claude-4-sonnet', sessions: 256 },
  { rank: 9, name: 'null_ptr', tokens: 9_432_100, model: 'gemini-2.5-pro', sessions: 198 },
  { rank: 10, name: 'vim_btw', tokens: 7_654_321, model: 'gpt-4.1', sessions: 145 },
]

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
          data={dailyLeaderboard}
        />

        <LeaderboardTable
          title="All Time"
          subtitle="Cumulative token usage since launch"
          icon={<Trophy size={20} class="text-[#fbbf24]" />}
          data={allTimeLeaderboard}
        />
      </div>
    </div>
  )
}
