// pages/api/auth/[...nextauth].ts
// ───────────────────────────────────────────────────────────────────────────
// Disable TS in this file so we don’t fight the internal AuthOptions types.
// Once the v5 typings stabilize, you can remove this.
// @ts-nocheck

import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { PostgresAdapter } from "@auth/pg-adapter";
import { db } from "@/lib/drizzle"; // Import the Drizzle client

// Function to refresh the Google access token
async function refreshAccessToken(token) {
  try {
    const url =
      "https://oauth2.googleapis.com/token?" +
      new URLSearchParams({
        client_id:     process.env.GOOGLE_OAUTH_ID!,
        client_secret: process.env.GOOGLE_OAUTH_SECRET!,
        grant_type:    "refresh_token",
        refresh_token: token.refreshToken,
      });

    const response = await fetch(url, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      method:  "POST",
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw refreshedTokens;
    }

    return {
      ...token,
      accessToken:  refreshedTokens.access_token,
      expires_at:   Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken, // Fall back to old refresh token
    };
  } catch (error) {
    console.error("Error refreshing access token", error);
    // Indicate error and clear tokens to force re-login
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}


export const authOptions = {
  adapter: PostgresAdapter(db), // Use Drizzle adapter
  // 1) OAuth providers
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_OAUTH_ID!,
      clientSecret: process.env.GOOGLE_OAUTH_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/calendar",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // Query PostgreSQL for the user
          const { rows } = await query('SELECT id, email, name, password FROM users WHERE email = $1', [credentials.email]);

          if (rows.length === 0) {
            return null;
          }

          const user = rows[0];

          // Verify password
          const isValid = await compare(credentials.password, user.password);

          if (!isValid) {
            return null;
          }

          return {
            id: user.id.toString(), // Convert numeric ID to string
            email: user.email,
            name: user.name || user.email.split('@')[0],
            image: null // Assuming no image field in PostgreSQL for now
          };
        } catch (error) {
          console.error("Error authenticating user:", error);
          return null;
        }
      }
    }),
  ],

  // 2) JWT‐based sessions
  session: {
    strategy: "jwt",         // literal string is fine at runtime
    maxAge:   30 * 24 * 60 * 60,
  },

  pages: {
    signIn: "/login",
    error: "/auth/error",
  },

  // 3) Secret for signing tokens
  secret: process.env.NEXTAUTH_SECRET,

  // 4) Callbacks to persist & expose tokens
  callbacks: {
    jwt: async ({ token, user, account }) => {
      // Initial sign in
      if (account && user) {
        token.accessToken  = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expires_at   = account.expires_at * 1000; // Convert seconds to milliseconds
        return token;
      }

      // Return previous token if the access token has not expired yet
      // Add a 60-second buffer before expiry
      if (Date.now() < token.expires_at - 60000) {
        return token;
      }

      // Access token has expired, try to update it
      return refreshAccessToken(token);
    },
    session: async ({ session, token }) => {
      // Expose necessary properties to the client
      session.user.accessToken  = token.accessToken;
      session.user.refreshToken = token.refreshToken; // Be cautious exposing refresh tokens client-side
      session.error = token.error; // Pass error state to client
      return session;
    },
  },

  debug: process.env.NODE_ENV === "development",
};

export default NextAuth(authOptions);
