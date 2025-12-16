/* eslint-disable @typescript-eslint/no-misused-promises */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";

const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(
        /[^A-Za-z0-9]/,
        "Password must contain at least one special character",
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setServerError(null);
    setIsSubmitting(true);

    try {
      await axios.post("/api/auth/register", {
        name: values.name,
        email: values.email,
        password: values.password,
      });

      router.push("/login");
      router.refresh();
    } catch (error: unknown) {
      console.error(error);
      setServerError("Unable to register. This email may already be in use.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Create an account
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Fill in the details below to get started.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1">
          <label
            htmlFor="name"
            className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            Name
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-300 dark:focus:ring-zinc-300/20"
            placeholder="Jane Doe"
            {...register("name")}
          />
          {errors.name && (
            <p className="text-xs text-red-600 dark:text-red-400">
              {errors.name.message}
            </p>
          )}
        </div>

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
            autoComplete="new-password"
            className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-300 dark:focus:ring-zinc-300/20"
            placeholder="Strong password"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs text-red-600 dark:text-red-400">
              {errors.password.message}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            Confirm password
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-300 dark:focus:ring-zinc-300/20"
            placeholder="Repeat password"
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <p className="text-xs text-red-600 dark:text-red-400">
              {errors.confirmPassword.message}
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
          {isSubmitting ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
        Already have an account?{" "}
        <a
          href="/login"
          className="font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-100"
        >
          Sign in
        </a>
      </p>
    </div>
  );
}


