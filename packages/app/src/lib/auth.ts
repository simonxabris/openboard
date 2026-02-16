import { env } from "cloudflare:workers";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start/solid";
import { createDb } from "../db";
import { apiKey } from "better-auth/plugins";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  database: drizzleAdapter(createDb(), {
    provider: "sqlite",
  }),
  account: {
    accountLinking: {
      updateUserInfoOnLink: true,
    },
  },
  emailAndPassword: {
    enabled: false,
  },
  socialProviders: {
    twitter: {
      clientId: env.X_CLIENT_ID,
      clientSecret: env.X_CLIENT_SECRET,
      overrideUserInfoOnSignIn: true,
      mapProfileToUser: (profile: { data?: { username?: string } }) => {
        const rawUsername = profile?.data?.username?.trim();
        if (!rawUsername) return {};

        const username = rawUsername.startsWith("@") ? rawUsername.slice(1) : rawUsername;
        if (!username) return {};

        return {
          name: username,
        };
      },
    },
  },
  plugins: [apiKey({ rateLimit: { enabled: false } }), tanstackStartCookies()],
});
