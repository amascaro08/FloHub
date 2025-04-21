// pages/api/auth/[...nextauth].ts

import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  // Configure one or more authentication providers
  providers: [
    GoogleProvider({
      clientId:     process.env.GOOGLE_OAUTH_ID!,
      clientSecret: process.env.GOOGLE_OAUTH_SECRET!,
      authorization: {
        params: {
          // Request access to the user’s calendar
          scope:
            "openid profile email https://www.googleapis.com/auth/calendar",
          access_type: "offline",
        },
      },
    }),
  ],

  // Callbacks to persist and expose tokens
  callbacks: {
    /**
     * @param token   - the current JWT token (initially contains only default claims)
     * @param account - contains OAuth provider tokens on first sign-in
     */
    async jwt({ token, account }) {
      console.log("JWT Callback - Token:", JSON.stringify(token, null, 2));
      console.log("JWT Callback - Account:", JSON.stringify(account, null, 2));
      // On initial sign in, save the access & refresh tokens into the JWT
      if (account) {
        token.accessToken  = account.access_token;
        token.refreshToken = account.refresh_token;
        token.idToken = account.id_token;
        console.log("JWT Callback - Added tokens to token");
      }
      
      return token;
    },

    /**
     * @param session - the session object that will be returned to the client
     * @param token   - the JWT payload, including our custom fields
     */
    async session({ session, token }) {
      console.log("Session Callback - Session:", JSON.stringify(session, null, 2));
      console.log("Session Callback - Token:", JSON.stringify(token, null, 2));
      // Expose the tokens to the client in session.user
      if (session?.user) {
        session.user.accessToken  = token.accessToken as string;
        session.user.idToken = token.idToken as string;
        console.log("Session Callback - Added tokens to session.user");
      } else {
        console.log("Session Callback - Could not add tokens to session.user", { hasSessionUser: !!session?.user, hasAccessToken: !!token.accessToken});
      }
      return session;
    },
  },

  // Optional: customize pages
  pages: {
    signIn: "/auth/signin",
    error:  "/auth/error", // Error code passed in query string as ?error=
  },

  // Optional: add a secret for encrypting the JWT (defaults to NEXTAUTH_SECRET)
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
