import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";

export const authConfig: NextAuthConfig = {
  secret: process.env.NEXTAUTH_SECRET ?? "development-secret-change-in-production",
  trustHost: true, // Trust all hosts in production (required for Docker/VPS)
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

        // Extract and type-narrow email and password
        const email = typeof credentials.email === "string" ? credentials.email : null;
        const password = typeof credentials.password === "string" ? credentials.password : null;

        if (!email || !password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.password) {
          return null;
        }

        // Check if user is active
        if (!user.isActive) {
          return null;
        }

        const isValid = await bcrypt.compare(password, user.password);
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

        // Fetch user role and active status
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true, isActive: true },
        });

        if (dbUser) {
          token.role = dbUser.role;
          token.isActive = dbUser.isActive;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.userId && session.user) {
        (session.user as typeof session.user & {
          id: string;
          role: string;
          isActive: boolean;
        }).id = token.userId as string;
        (session.user as typeof session.user & {
          id: string;
          role: string;
          isActive: boolean;
        }).role = token.role as string;
        (session.user as typeof session.user & {
          id: string;
          role: string;
          isActive: boolean;
        }).isActive = token.isActive as boolean;
      }
      return session;
    },
  },
};

// Backwards-compatible name expected by many helpers
export const authOptions = authConfig;

// Export NextAuth helpers (auth, signIn, signOut) and route handlers
export const { auth, signIn, signOut, handlers } = NextAuth(authConfig);


