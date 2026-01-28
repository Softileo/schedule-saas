"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { createClient } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/constants/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleButton } from "./google-button";
import { Spinner } from "@/components/ui/spinner";
import { FormError } from "@/components/ui/form-message";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import {
    OAuthSeparator,
    AuthLoadingScreen,
    AuthSuccessScreen,
} from "./auth-screens";

type LoginStep = "idle" | "authenticating" | "success";

export function LoginForm() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
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

                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="jan@example.com"
                        disabled={isLoading}
                        {...register("email")}
                    />
                    {errors.email && (
                        <p className="text-sm text-destructive">
                            {errors.email.message}
                        </p>
                    )}
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="password">Hasło</Label>
                         <Link
                            href="/zapomnialem-hasla"
                            className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
                        >
                            Zapomniałem hasła
                        </Link>
                    </div>

                    <div className="relative">
                        <Input
                            id="password"
                            // 3. Dynamiczny typ: password lub text
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            className="pr-10" // Dodaj padding z prawej, by tekst nie nachodził na ikonę
                            disabled={isLoading}
                            {...register("password")}
                        />
                        {/* 4. Przycisk przełączający */}
                        <button
                            type="button" // Ważne: musi być type="button", żeby nie wysłał formularza
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                            aria-label={showPassword ? "Ukryj hasło" : "Pokaż hasło"}
                        >
                            {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                            ) : (
                                <Eye className="h-4 w-4" />
                            )}
                        </button>
                    </div>
                    
                    {errors.password && (
                        <p className="text-sm text-destructive">
                            {errors.password.message}
                        </p>
                    )}
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Spinner withMargin />}
                    Zaloguj się
                </Button>
            </form>
        </div>
    );
}
