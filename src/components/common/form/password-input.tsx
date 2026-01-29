"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FieldError, Merge, FieldErrorsImpl } from "react-hook-form";

interface PasswordInputProps {
    id: string;
    label: string;
    placeholder?: string;
    disabled?: boolean;
    error?: FieldError | Merge<FieldError, FieldErrorsImpl<any>>;
    register: any;
    showForgotPassword?: boolean;
    forgotPasswordLink?: string;
}

/**
 * Wspólny komponent dla pola hasła z możliwością pokazania/ukrycia
 */
export function PasswordInput({
    id,
    label,
    placeholder = "••••••••",
    disabled,
    error,
    register,
    showForgotPassword,
    forgotPasswordLink = "/zapomnialem-hasla",
}: PasswordInputProps) {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <Label htmlFor={id}>{label}</Label>
                {showForgotPassword && (
                    <a
                        href={forgotPasswordLink}
                        className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
                    >
                        Zapomniałem hasła
                    </a>
                )}
            </div>

            <div className="relative">
                <Input
                    id={id}
                    type={showPassword ? "text" : "password"}
                    placeholder={placeholder}
                    className="pr-10"
                    disabled={disabled}
                    {...register}
                />
                <button
                    type="button"
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

            {error && "message" in error && error.message && (
                <p className="text-sm text-destructive">
                    {String(error.message)}
                </p>
            )}
        </div>
    );
}
