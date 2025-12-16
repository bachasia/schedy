import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";

export const authConfig: NextAuthConfig = {
  secret: process.env.NEXTAUTH_SECRET ?? "development-secret-change-in-production",
  session: {
    strategy: "jwt",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) {
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image ?? undefined,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user && "id" in user && typeof user.id === "string") {
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.userId && session.user) {
        (session.user as typeof session.user & { id: string }).id = token.userId as string;
      }
      return session;
    },
  },
};

// Backwards-compatible name expected by many helpers
export const authOptions = authConfig;

// Export NextAuth helpers (auth, signIn, signOut) and route handlers
export const { auth, signIn, signOut, handlers } = NextAuth(authConfig);


