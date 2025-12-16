/* eslint-disable @typescript-eslint/no-misused-promises */
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);
    setIsSubmitting(true);

    try {
      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        setServerError("Invalid email or password.");
        setIsSubmitting(false);
        return;
      }

      // Successful login
      router.push(callbackUrl);
      router.refresh();
    } catch (error) {
      console.error(error);
      setServerError("Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Welcome back
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Sign in to continue to your dashboard.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-300 dark:focus:ring-zinc-300/20"
            placeholder="you@example.com"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-red-600 dark:text-red-400">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-300 dark:focus:ring-zinc-300/20"
            placeholder="••••••••"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs text-red-600 dark:text-red-400">
              {errors.password.message}
            </p>
          )}
        </div>

        {serverError && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {serverError}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-md transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
        Don&apos;t have an account?{" "}
        <a
          href="/register"
          className="font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-100"
        >
          Register
        </a>
      </p>
    </div>
  );
}


