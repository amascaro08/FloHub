// pages/api/auth/[...nextauth].ts
// ───────────────────────────────────────────────────────────────────────────
// Disable TS in this file so we don’t fight the internal AuthOptions types.
// Once the v5 typings stabilize, you can remove this.
// @ts-nocheck

import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions = {
  // 1) OAuth providers
  providers: [
    GoogleProvider({
      clientId:     process.env.GOOGLE_OAUTH_ID!,
      clientSecret: process.env.GOOGLE_OAUTH_SECRET!,
      authorization: {
        params: {
          scope:       "openid email profile https://www.googleapis.com/auth/calendar",
          access_type: "offline",
          prompt:      "consent",
        },
      },
    }),
  ],

  // 2) JWT‐based sessions
  session: {
    strategy: "jwt",         // literal string is fine at runtime
    maxAge:   30 * 24 * 60 * 60,
  },

  // 3) Secret for signing tokens
  secret: process.env.NEXTAUTH_SECRET,

  // 4) Callbacks to persist & expose tokens
  callbacks: {
    jwt: async ({ token, account }) => {
      if (account?.access_token)  token.accessToken  = account.access_token;
      if (account?.refresh_token) token.refreshToken = account.refresh_token;
      return token;
    },
    session: async ({ session, token }) => {
      // Attach our custom props onto session.user
      (session.user as any).accessToken  = token.accessToken;
      (session.user as any).refreshToken = token.refreshToken;
      return session;
    },
  },
};

export default NextAuth(authOptions);
