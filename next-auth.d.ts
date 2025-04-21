// types/next-auth.d.ts
import NextAuth, { DefaultSession, DefaultUser, JWT } from "next-auth";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      /** Your other user fields… */
      accessToken?: string;
      refreshToken?: string;
      idToken?: string;
    } & DefaultSession["user"];
  }

  interface JWT extends DefaultUser {
    accessToken?: string;
    refreshToken?: string;
  }
}
