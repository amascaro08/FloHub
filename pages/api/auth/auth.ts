import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const authOptions = {
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { type: "text" },
        password: { type: "password" }
      },
      async authorize(credentials) {
        // Add your authentication logic here
        // Example:
        if (credentials?.username === "test" && credentials?.password === "test") {
          const user = { id: "1", name: "Test User", email: "test@example.com" };
          return user;
        }
        return null;
      },
    }),
  ],
  callbacks: {
    async session({ session, token, user }: { session: any; token: any; user: any }) {
      // Add user properties to the session
      session.user = user;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
