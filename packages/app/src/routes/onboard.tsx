import { createFileRoute, Link } from "@tanstack/solid-router";
import { queryOptions, useQuery } from "@tanstack/solid-query";
import { Show, createSignal } from "solid-js";

import openboardPluginTemplate from "../opencode-plugin.ts?raw";
import { authClient } from "../lib/auth-client";
import { getOnboardSetup } from "../server/functions";

const onboardSetupQueryOptions = queryOptions({
  queryKey: ["onboard", "setup"],
  queryFn: () => getOnboardSetup(),
  staleTime: 1000 * 60 * 15,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
});

export const Route = createFileRoute("/onboard")({
  loader: ({ context }) => context.queryClient.ensureQueryData(onboardSetupQueryOptions),
  component: Onboard,
});

function Onboard() {
  const setupQuery = useQuery(() => onboardSetupQueryOptions);
  const [isSigningIn, setIsSigningIn] = createSignal(false);
  const [setupScriptCopied, setSetupScriptCopied] = createSignal(false);
  const [copyError, setCopyError] = createSignal<string | null>(null);

  const generatedPluginCode = () => {
    const data = setupQuery.data;
    if (!data?.ok) return "";

    const apiKeyLiteral = JSON.stringify(data.apiKey);

    return openboardPluginTemplate.replace(
      /const USAGE_EVENTS_API_KEY = .+;/,
      `const USAGE_EVENTS_API_KEY = ${apiKeyLiteral};`,
    );
  };

  const generatedSetupScript = () => {
    const pluginCode = generatedPluginCode();
    if (!pluginCode) return "";

    const encoded = btoa(unescape(encodeURIComponent(pluginCode)));

    return `#!/usr/bin/env bash
set -euo pipefail

mkdir -p "$HOME/.config/opencode/plugins"

printf '%s' '${encoded}' | base64 --decode > "$HOME/.config/opencode/plugins/openboard-usage.ts"

echo "OpenBoard usage plugin written to ~/.config/opencode/plugins/openboard-usage.ts"`;
  };

  const onCopySetupScript = async () => {
    const script = generatedSetupScript();
    if (!script) return;

    setCopyError(null);

    try {
      await navigator.clipboard.writeText(script);
      setSetupScriptCopied(true);
    } catch {
      setCopyError("Unable to copy automatically. Copy the setup script manually.");
    }
  };

  const onSignInWithX = async () => {
    if (isSigningIn()) return;

    setIsSigningIn(true);

    try {
      await authClient.signIn.social({
        provider: "twitter",
        callbackURL: "/onboard",
      });
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div class="max-w-5xl mx-auto px-6 py-12">
      <div class="mb-8">
        <p class="text-xs uppercase tracking-[0.16em] text-[var(--accent)] m-0">Onboarding</p>
        <h1 class="text-3xl md:text-4xl font-bold text-[#e5e5e5] tracking-tight mt-2 mb-3">
          Install OpenBoard in OpenCode
        </h1>
        <p class="text-[#737373] text-base m-0 max-w-3xl">
          Copy the setup script and run it in your terminal to install the OpenBoard usage plugin.
        </p>
      </div>

      <Show when={setupQuery.isPending}>
        <div class="border border-[#262626] bg-[#111111] p-5">
          <p class="text-[#a3a3a3] text-sm m-0">Generating your plugin key...</p>
        </div>
      </Show>

      <Show
        when={setupQuery.data && !setupQuery.data.ok && setupQuery.data.error === "unauthorized"}
      >
        <div class="border border-[#262626] bg-[#111111] p-5 flex flex-col gap-3">
          <p class="text-[#a3a3a3] text-sm m-0">Sign in with X to generate your OpenBoard plugin key.</p>
          <button
            type="button"
            onClick={() => void onSignInWithX()}
            disabled={isSigningIn()}
            class="w-fit px-4 py-2 bg-[var(--accent)] text-[#0a0a0a] text-sm font-semibold hover:bg-[#67e8f9] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSigningIn() ? "Redirecting..." : "Sign in with X"}
          </button>
        </div>
      </Show>

      <Show
        when={setupQuery.data && !setupQuery.data.ok && setupQuery.data.error !== "unauthorized"}
      >
        <div class="border border-[#7f1d1d] bg-[#111111] p-5 flex flex-col gap-3">
          <p class="text-[#f87171] text-sm m-0">{setupQuery.data?.message ?? "Failed to load onboarding."}</p>
          <button
            type="button"
            onClick={() => void setupQuery.refetch()}
            class="w-fit px-3 py-1.5 border border-[#f87171] text-[#f87171] text-xs font-semibold hover:bg-[#f87171]/10"
          >
            Try again
          </button>
        </div>
      </Show>

      <Show when={setupQuery.data?.ok}>
        {(result) => (
          <div class="border border-[#262626] bg-[#111111] p-5 flex flex-col gap-4">
            <div>
              <p class="text-[#a3a3a3] text-sm m-0 mb-3">
                Copy and run this script in your terminal to install the plugin. It will be placed
                in <code class="text-[#e5e5e5] text-xs bg-[#0a0a0a] px-1.5 py-0.5 border border-[#262626]">~/.config/opencode/plugins</code> so
                it loads globally across all your projects.
              </p>
              <div class="flex flex-col gap-2 items-start">
                <button
                  type="button"
                  onClick={onCopySetupScript}
                  class="px-3 py-1.5 border border-[var(--accent)] text-[var(--accent)] text-xs font-semibold hover:bg-[var(--accent)]/10"
                >
                  {setupScriptCopied() ? "Setup script copied \u2713" : "Copy setup script"}
                </button>

                <Show when={copyError()}>
                  {(error) => <p class="text-[#f87171] text-xs m-0">{error()}</p>}
                </Show>
              </div>
            </div>

            <div>
              <p class="text-[#525252] text-xs m-0 mb-2">Plugin source</p>
              <pre class="overflow-x-auto text-[#e5e5e5] text-xs bg-[#0a0a0a] p-3 border border-[#262626]">
                <code>{generatedPluginCode()}</code>
              </pre>
            </div>
          </div>
        )}
      </Show>

      <div class="mt-6">
        <Link to="/" class="text-sm text-[#a3a3a3] hover:text-[#e5e5e5]">
          Back to leaderboard
        </Link>
      </div>
    </div>
  );
}
