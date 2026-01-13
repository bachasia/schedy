import { DefaultSession } from "next-auth";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            role: "ADMIN" | "MANAGER" | "EMPLOYEE";
            isActive: boolean;
        } & DefaultSession["user"];
    }

    interface User {
        id: string;
        role: "ADMIN" | "MANAGER" | "EMPLOYEE";
        isActive: boolean;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        userId: string;
        role: "ADMIN" | "MANAGER" | "EMPLOYEE";
        isActive: boolean;
    }
}
