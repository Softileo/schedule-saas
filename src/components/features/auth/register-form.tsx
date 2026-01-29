"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterInput } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { cn } from "@/lib/utils";
import { Check, Mail, Shield, User } from "lucide-react";
import { ROUTES } from "@/lib/constants/routes";

type RegistrationStep = "idle" | "creating" | "sending-email" | "success";

const STEP_MESSAGES: Record<RegistrationStep, string> = {
    idle: "",
    creating: "Przygotowujemy Twoje konto",
    "sending-email": "Wysyłamy kod weryfikacyjny",
    success: "Gotowe! Przekierowujemy...",
};

export function RegisterForm() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState<RegistrationStep>("idle");
    const [error, setError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<RegisterInput>({
        resolver: zodResolver(registerSchema),
    });

    async function onSubmit(data: RegisterInput) {
        setIsLoading(true);
        setError(null);
        setStep("creating");

        try {
            // Symuluj minimalny czas dla lepszego UX
            await new Promise((r) => setTimeout(r, 500));
            setStep("sending-email");

            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: data.email,
                    password: data.password,
                    fullName: data.fullName,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                setError(result.error || "Wystąpił błąd podczas rejestracji");
                setStep("idle");
                return;
            }

            setStep("success");
            // Małe opóźnienie żeby użytkownik zobaczył sukces
            await new Promise((r) => setTimeout(r, 800));

            // Przekieruj do weryfikacji kodu
            router.push(
                `${ROUTES.WERYFIKACJA}?email=${encodeURIComponent(String(data.email))}`,
            );
        } catch {
            setError("Wystąpił błąd podczas rejestracji");
            setStep("idle");
        } finally {
            setIsLoading(false);
        }
    }

    // Overlay ładowania
    if (step !== "idle" && step !== "success") {
        return (
            <AuthLoadingScreen
                title={STEP_MESSAGES[step]}
                subtitle="Chwilkę..."
            >
                {/* Progress indicators */}
                <div className="flex items-center gap-3 mt-6">
                    <StepIndicator
                        icon={User}
                        isActive={step === "creating"}
                        isComplete={step === "sending-email"}
                        label="Tworzenie"
                    />
                    <div className="w-8 h-0.5 bg-slate-200" />
                    <StepIndicator
                        icon={Mail}
                        isActive={step === "sending-email"}
                        isComplete={false}
                        label="Email"
                    />
                    <div className="w-8 h-0.5 bg-slate-200" />
                    <StepIndicator
                        icon={Shield}
                        isActive={false}
                        isComplete={false}
                        label="Weryfikacja"
                    />
                </div>
            </AuthLoadingScreen>
        );
    }

    // Ekran sukcesu
    if (step === "success") {
        return (
            <AuthSuccessScreen
                title="Konto utworzone!"
                subtitle="Przekierowywanie do weryfikacji..."
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
                    <Label htmlFor="fullName">Imię i nazwisko</Label>
                    <Input
                        id="fullName"
                        type="text"
                        placeholder="Jan Kowalski"
                        disabled={isLoading}
                        {...register("fullName")}
                    />
                    {errors.fullName && (
                        <p className="text-sm text-destructive">
                            {errors.fullName.message}
                        </p>
                    )}
                </div>

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
                />

                <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Potwierdź hasło</Label>
                    <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="••••••••"
                        disabled={isLoading}
                        {...register("confirmPassword")}
                    />
                    {errors.confirmPassword && (
                        <p className="text-sm text-destructive">
                            {errors.confirmPassword.message}
                        </p>
                    )}
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Spinner withMargin />}
                    Zarejestruj się
                </Button>
            </form>
        </div>
    );
}

// Komponent wskaźnika kroku
function StepIndicator({
    icon: Icon,
    isActive,
    isComplete,
    label,
}: {
    icon: React.ComponentType<{ className?: string }>;
    isActive: boolean;
    isComplete: boolean;
    label: string;
}) {
    return (
        <div className="flex flex-col items-center gap-1">
            <div
                className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300",
                    isComplete
                        ? "bg-green-100 text-green-600"
                        : isActive
                          ? "bg-primary/10 text-primary animate-pulse"
                          : "bg-slate-100 text-slate-400",
                )}
            >
                {isComplete ? (
                    <Check className="w-4 h-4" />
                ) : (
                    <Icon className="w-4 h-4" />
                )}
            </div>
            <span
                className={cn(
                    "text-[10px] font-medium",
                    isActive || isComplete
                        ? "text-slate-700"
                        : "text-slate-400",
                )}
            >
                {label}
            </span>
        </div>
    );
}
