// types/next-auth.d.ts
import { Defaultuser } from "next-auth";

declare module "next-auth" {
  interface user {
    user: Defaultuser["user"] & {
      accessToken?: string;
      refreshToken?: string;
    };
  }
}
