import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import type { Session } from "next-auth";
import type { JWT }     from "next-auth/jwt";

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
    strategy: "jwt",
    maxAge:   30 * 24 * 60 * 60, // 30 days
  },

  // 3) Secret for signing tokens
  secret: process.env.NEXTAUTH_SECRET,

  // 4) Callbacks to store OAuth tokens in the JWT & expose them on session.user
  callbacks: {
    // Persist tokens in the JWT
    jwt: async ({
      token,
      account,
    }: {
      token: JWT;
      account?: { access_token?: string; refresh_token?: string };
    }) => {
      if (account?.access_token)  token.accessToken  = account.access_token;
      if (account?.refresh_token) token.refreshToken = account.refresh_token;
      return token;
    },

    // Expose tokens on session.user
    session: async ({
      session,
      token,
    }: {
      session: Session;
      token: JWT;
    }) => {
      // session.user already has name/email—augment it:
      (session.user as any).accessToken  = token.accessToken;
      (session.user as any).refreshToken = token.refreshToken;
      return session;
    },
  },
};

export default NextAuth(authOptions);
