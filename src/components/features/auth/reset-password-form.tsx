"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { FormError } from "@/components/ui/form-message";
import { ROUTES } from "@/lib/constants/routes";
import Link from "next/link";

const resetSchema = z
    .object({
        code: z
            .string()
            .min(6, "Kod musi mieć 6 cyfr")
            .max(6, "Kod musi mieć 6 cyfr")
            .regex(/^\d+$/, "Kod może zawierać tylko cyfry"),
        password: z
            .string()
            .min(8, "Hasło musi mieć minimum 8 znaków")
            .regex(/[A-Z]/, "Hasło musi zawierać wielką literę")
            .regex(/[a-z]/, "Hasło musi zawierać małą literę")
            .regex(/[0-9]/, "Hasło musi zawierać cyfrę"),
        confirmPassword: z.string().min(1, "Potwierdzenie hasła jest wymagane"),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Hasła nie są identyczne",
        path: ["confirmPassword"],
    });

type ResetInput = z.infer<typeof resetSchema>;

export function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get("email");

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ResetInput>({
        resolver: zodResolver(resetSchema),
    });

    if (!email) {
        return (
            <div className="text-center">
                <FormError message="Brak adresu email. Rozpocznij proces od początku." />
                <Link
                    href={ROUTES.LOGOWANIE + "/zapomnialem-hasla"}
                    className="text-blue-600 hover:underline mt-4 inline-block"
                >
                    Wróć do formularza
                </Link>
            </div>
        );
    }

    async function onSubmit(data: ResetInput) {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email,
                    code: data.code,
                    password: data.password,
                    confirmPassword: data.confirmPassword,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                setError(result.error || "Nie udało się zresetować hasła");
                return;
            }

            setSuccess(true);

            // Przekieruj do logowania po 2 sekundach
            setTimeout(() => {
                router.push(ROUTES.LOGOWANIE);
            }, 2000);
        } catch {
            setError("Wystąpił błąd podczas resetowania hasła");
        } finally {
            setIsLoading(false);
        }
    }

    if (success) {
        return (
            <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <svg
                        className="w-8 h-8 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                        />
                    </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                    Hasło zostało zmienione!
                </h2>
                <p className="text-gray-600">
                    Możesz się teraz zalogować używając nowego hasła.
                </p>
                <p className="text-sm text-gray-500">
                    Przekierowanie za chwilę...
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Ustaw nowe hasło
                </h2>
                <p className="text-gray-600">
                    Wprowadź kod z email i nowe hasło dla:{" "}
                    <strong>{email}</strong>
                </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Kod weryfikacyjny */}
                <div>
                    <Label htmlFor="code">Kod z email (6 cyfr)</Label>
                    <Input
                        id="code"
                        type="text"
                        placeholder="123456"
                        maxLength={6}
                        {...register("code")}
                        disabled={isLoading}
                        className="text-center text-2xl tracking-widest"
                    />
                    {errors.code && (
                        <FormError message={errors.code.message || ""} />
                    )}
                </div>

                {/* Nowe hasło */}
                <div>
                    <Label htmlFor="password">Nowe hasło</Label>
                    <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        {...register("password")}
                        disabled={isLoading}
                    />
                    {errors.password && (
                        <FormError message={errors.password.message || ""} />
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                        Min. 8 znaków, wielka litera, mała litera, cyfra
                    </p>
                </div>

                {/* Potwierdzenie hasła */}
                <div>
                    <Label htmlFor="confirmPassword">Powtórz hasło</Label>
                    <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="••••••••"
                        {...register("confirmPassword")}
                        disabled={isLoading}
                    />
                    {errors.confirmPassword && (
                        <FormError
                            message={errors.confirmPassword.message || ""}
                        />
                    )}
                </div>

                {error && <FormError message={error} />}

                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                        <>
                            <Spinner className="mr-2" />
                            Resetowanie...
                        </>
                    ) : (
                        "Zmień hasło"
                    )}
                </Button>
            </form>

            <div className="text-center text-sm">
                <Link
                    href={ROUTES.LOGOWANIE}
                    className="text-blue-600 hover:underline"
                >
                    ← Wróć do logowania
                </Link>
            </div>
        </div>
    );
}
