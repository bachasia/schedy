'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const userFormSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters').optional(),
    role: z.enum(['ADMIN', 'MANAGER', 'EMPLOYEE']),
    isActive: z.boolean(),
});

type UserFormValues = z.infer<typeof userFormSchema>;

interface UserFormDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    user?: {
        id: string;
        email: string;
        name: string | null;
        role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
        isActive: boolean;
    } | null;
}

export function UserFormDialog({ open, onClose, onSuccess, user }: UserFormDialogProps) {
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const isEdit = !!user;

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<UserFormValues>({
        resolver: zodResolver(userFormSchema),
        defaultValues: {
            name: '',
            email: '',
            password: '',
            role: 'EMPLOYEE',
            isActive: true,
        },
    });

    useEffect(() => {
        if (user) {
            reset({
                name: user.name || '',
                email: user.email,
                password: '',
                role: user.role,
                isActive: user.isActive,
            });
        } else {
            reset({
                name: '',
                email: '',
                password: '',
                role: 'EMPLOYEE',
                isActive: true,
            });
        }
    }, [user, reset]);

    const onSubmit = async (data: UserFormValues) => {
        setError(null);
        setSubmitting(true);

        try {
            const url = isEdit ? `/api/admin/users/${user.id}` : '/api/admin/users';
            const method = isEdit ? 'PATCH' : 'POST';

            // Don't send empty password on edit
            const payload = { ...data };
            if (isEdit && !data.password) {
                delete payload.password;
            }

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save user');
            }

            onSuccess();
            reset();
        } catch (err: any) {
            setError(err.message || 'An error occurred');
        } finally {
            setSubmitting(false);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
                {/* Header */}
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                        {isEdit ? 'Edit User' : 'Create New User'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-md p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {/* Name */}
                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
                            Name
                        </label>
                        <input
                            type="text"
                            {...register('name')}
                            className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-300"
                            placeholder="John Doe"
                        />
                        {errors.name && (
                            <p className="text-xs text-red-600 dark:text-red-400">
                                {errors.name.message}
                            </p>
                        )}
                    </div>

                    {/* Email */}
                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
                            Email
                        </label>
                        <input
                            type="email"
                            {...register('email')}
                            disabled={isEdit}
                            className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-300"
                            placeholder="john@company.com"
                        />
                        {errors.email && (
                            <p className="text-xs text-red-600 dark:text-red-400">
                                {errors.email.message}
                            </p>
                        )}
                    </div>

                    {/* Password */}
                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
                            Password {isEdit && <span className="text-xs text-zinc-500">(leave blank to keep current)</span>}
                        </label>
                        <input
                            type="password"
                            {...register('password')}
                            className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-300"
                            placeholder="••••••••"
                        />
                        {errors.password && (
                            <p className="text-xs text-red-600 dark:text-red-400">
                                {errors.password.message}
                            </p>
                        )}
                    </div>

                    {/* Role */}
                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
                            Role
                        </label>
                        <select
                            {...register('role')}
                            className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-300"
                        >
                            <option value="EMPLOYEE">Employee</option>
                            <option value="MANAGER">Manager</option>
                            <option value="ADMIN">Admin</option>
                        </select>
                        {errors.role && (
                            <p className="text-xs text-red-600 dark:text-red-400">
                                {errors.role.message}
                            </p>
                        )}
                    </div>

                    {/* Active Status */}
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="isActive"
                            {...register('isActive')}
                            className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900"
                        />
                        <label htmlFor="isActive" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                            Active
                        </label>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="rounded-md bg-red-50 p-3 dark:bg-red-900/20">
                            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="flex-1"
                            disabled={submitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1"
                            disabled={submitting}
                        >
                            {submitting ? 'Saving...' : isEdit ? 'Update' : 'Create'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
