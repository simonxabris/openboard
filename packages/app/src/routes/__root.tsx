import { HeadContent, Outlet, Scripts, createRootRouteWithContext } from "@tanstack/solid-router";

import { HydrationScript } from "solid-js/web";
import { Suspense } from "solid-js";

import Header from "../components/Header";

import styleCss from "../styles.css?url";
import type { QueryClient } from "@tanstack/solid-query";

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  head: () => ({
    links: [{ rel: "stylesheet", href: styleCss }],
  }),
  shellComponent: RootComponent,
});

function RootComponent() {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>OpenBoard — OpenCode Leaderboard</title>
        <HydrationScript />
      </head>
      <body class="min-h-screen bg-[#0a0a0a]">
        <HeadContent />
        <Suspense>
          <Header />
          <Outlet />
        </Suspense>
        <Scripts />
      </body>
    </html>
  );
}
