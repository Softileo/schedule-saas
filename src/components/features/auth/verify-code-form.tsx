"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { verifyCodeSchema, type VerifyCodeInput } from "@/lib/validations/auth";
import { ROUTES } from "@/lib/constants/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { FormError, FormSuccess } from "@/components/ui/form-message";

export function VerifyCodeForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const email = searchParams.get("email") || "";

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors },
    } = useForm<VerifyCodeInput>({
        resolver: zodResolver(verifyCodeSchema),
        defaultValues: {
            email,
            code: "",
        },
    });

    useEffect(() => {
        if (email) {
            setValue("email", email);
        }
    }, [email, setValue]);

    async function onSubmit(data: VerifyCodeInput) {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/auth/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            const result = await response.json();

            if (!response.ok) {
                setError(result.error || "Nieprawidłowy kod weryfikacyjny");
                return;
            }

            router.push(ROUTES.PANEL);
            router.refresh();
        } catch {
            setError("Wystąpił błąd podczas weryfikacji");
        } finally {
            setIsLoading(false);
        }
    }

    async function handleResendCode() {
        if (!email) return;

        setIsResending(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch("/api/auth/resend-code", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            const result = await response.json();

            if (!response.ok) {
                setError(result.error || "Nie udało się wysłać kodu");
                return;
            }

            setSuccess("Nowy kod został wysłany na Twój email");
        } catch {
            setError("Wystąpił błąd podczas wysyłania kodu");
        } finally {
            setIsResending(false);
        }
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormError message={error} />
            <FormSuccess message={success} />

            <input type="hidden" {...register("email")} />

            <div className="space-y-2">
                <Label htmlFor="code">Kod weryfikacyjny</Label>
                <Input
                    id="code"
                    type="text"
                    placeholder="000000"
                    maxLength={6}
                    disabled={isLoading}
                    className="text-center text-2xl tracking-widest"
                    {...register("code")}
                />
                {errors.code && (
                    <p className="text-sm text-destructive">
                        {errors.code.message}
                    </p>
                )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Spinner withMargin />}
                Weryfikuj
            </Button>

            <div className="text-center">
                <Button
                    type="button"
                    variant="link"
                    onClick={handleResendCode}
                    disabled={isResending || !email}
                    className="text-sm"
                >
                    {isResending && <Spinner withMargin />}
                    Wyślij kod ponownie
                </Button>
            </div>
        </form>
    );
}
