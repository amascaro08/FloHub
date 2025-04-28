// pages/api/auth/[...nextauth].ts
// ───────────────────────────────────────────────────────────────────────────
// Disable TS in this file so we don’t fight the internal AuthOptions types.
// Once the v5 typings stabilize, you can remove this.
// @ts-nocheck

import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

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
};

export default NextAuth(authOptions);
