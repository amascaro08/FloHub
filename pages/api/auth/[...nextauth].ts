// pages/api/auth/[...nextauth].ts

import NextAuth, { NextAuthOptions, Session, User } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { JWT } from "next-auth/jwt";

export const authOptions: NextAuthOptions = {
  // 1) Configure one or more authentication providers
  providers: [
    GoogleProvider({
      clientId:     process.env.GOOGLE_OAUTH_ID!,
      clientSecret: process.env.GOOGLE_OAUTH_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/calendar",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],

  // 2) Use JSON Web Tokens for session instead of database sessions
  session: {
    strategy: "jwt",
    maxAge:   30 * 24 * 60 * 60, // 30 days
  },

  // 3) A secret is used to sign the JWT
  secret: process.env.NEXTAUTH_SECRET,

  // 4) Callbacks to persist the OAuth tokens into the JWT & session
  callbacks: {
    // Persist the OAuth access_token, refresh_token and expiry date to the token right after signin
    async jwt({ token, account }) {
      if (account) {
        token.accessToken  = account.access_token;
        token.refreshToken = account.refresh_token;
      }
      return token;
    },

    // Make the tokens available in the client’s session
    async session({ session, token }) {
      session.user = session.user || {};
      (session as Session & { user: any }).user.accessToken  = token.accessToken;
      (session as Session & { user: any }).user.refreshToken = token.refreshToken;
      return session;
    },
  },
};

export default NextAuth(authOptions);
