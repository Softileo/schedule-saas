"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { createClient } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/constants/routes";
import { Button } from "@/components/ui/button";
import { GoogleButton } from "./google-button";
import { Spinner } from "@/components/ui/spinner";
import { FormError } from "@/components/ui/form-message";
import { EmailInput } from "@/components/common/form/email-input";
import { PasswordInput } from "@/components/common/form/password-input";
import {
    OAuthSeparator,
    AuthLoadingScreen,
    AuthSuccessScreen,
} from "./auth-screens";

type LoginStep = "idle" | "authenticating" | "success";

export function LoginForm() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState<LoginStep>("idle");
    const [error, setError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginInput>({
        resolver: zodResolver(loginSchema),
    });

    async function onSubmit(data: LoginInput) {
        setIsLoading(true);
        setError(null);
        setStep("authenticating");

        try {
            const supabase = createClient();
            const { error: signInError } =
                await supabase.auth.signInWithPassword({
                    email: data.email,
                    password: data.password,
                });

            if (signInError) {
                if (signInError.message.includes("Invalid login credentials")) {
                    setError("Nieprawidłowy email lub hasło");
                } else if (
                    signInError.message.includes("Email not confirmed")
                ) {
                    setError(
                        "Email nie został potwierdzony. Sprawdź swoją skrzynkę.",
                    );
                } else {
                    setError(signInError.message);
                }
                setStep("idle");
                return;
            }

            setStep("success");
            await new Promise((r) => setTimeout(r, 600));

            router.push(ROUTES.PANEL);
            router.refresh();
        } catch {
            setError("Wystąpił błąd podczas logowania");
            setStep("idle");
        } finally {
            setIsLoading(false);
        }
    }

    // Ekran ładowania
    if (step === "authenticating") {
        return (
            <AuthLoadingScreen
                title="Logowanie..."
                subtitle="Weryfikacja danych..."
            />
        );
    }

    // Ekran sukcesu
    if (step === "success") {
        return (
            <AuthSuccessScreen
                title="Zalogowano pomyślnie!"
                subtitle="Przekierowywanie do panelu..."
            />
        );
    }

    return (
        <div className="space-y-6">
            <GoogleButton />

            <OAuthSeparator />

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <FormError message={error} />

                <EmailInput
                    disabled={isLoading}
                    error={errors.email}
                    register={register("email")}
                />

                <PasswordInput
                    id="password"
                    label="Hasło"
                    disabled={isLoading}
                    error={errors.password}
                    register={register("password")}
                    showForgotPassword
                />

                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Spinner withMargin />}
                    Zaloguj się
                </Button>
            </form>
        </div>
    );
}
