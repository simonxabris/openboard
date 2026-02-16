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
  emailAndPassword: {
    enabled: false,
  },
  socialProviders: {
    twitter: {
      clientId: env.X_CLIENT_ID,
      clientSecret: env.X_CLIENT_SECRET,
    },
  },
  plugins: [apiKey({ rateLimit: { enabled: false } }), tanstackStartCookies()],
});
