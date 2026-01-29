import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import type { FieldError, UseFormRegisterReturn } from "react-hook-form";

/**
 * Wspólny komponent dla pola email z obsługą błędów
 */
export interface EmailFieldProps {
    id?: string;
    label?: string;
    placeholder?: string;
    disabled?: boolean;
    error?: FieldError;
    register: UseFormRegisterReturn;
    optional?: boolean;
}

export function EmailField({
    id = "email",
    label = "Email",
    placeholder = "jan@example.com",
    disabled = false,
    error,
    register,
    optional = false,
}: EmailFieldProps) {
    return (
        <div className="space-y-2">
            <Label htmlFor={id}>
                {label}
                {optional && " (opcjonalnie)"}
            </Label>
            <Input
                id={id}
                type="email"
                placeholder={placeholder}
                disabled={disabled}
                {...register}
            />
            {error && (
                <p className="text-sm text-destructive">{error.message}</p>
            )}
        </div>
    );
}

/**
 * Wspólny komponent dla pola hasła z możliwością pokazania/ukrycia
 */
export interface PasswordFieldProps {
    id?: string;
    label?: string;
    placeholder?: string;
    disabled?: boolean;
    error?: FieldError;
    register: UseFormRegisterReturn;
    showToggle?: boolean;
    showForgotLink?: boolean;
}

export function PasswordField({
    id = "password",
    label = "Hasło",
    placeholder = "••••••••",
    disabled = false,
    error,
    register,
    showToggle = false,
    showForgotLink = false,
}: PasswordFieldProps) {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <Label htmlFor={id}>{label}</Label>
                {showForgotLink && (
                    <a
                        href="/zapomnialem-hasla"
                        className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
                    >
                        Zapomniałem hasła
                    </a>
                )}
            </div>

            <div className="relative">
                <Input
                    id={id}
                    type={showToggle && showPassword ? "text" : "password"}
                    placeholder={placeholder}
                    className={showToggle ? "pr-10" : undefined}
                    disabled={disabled}
                    {...register}
                />
                {showToggle && (
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                        aria-label={
                            showPassword ? "Ukryj hasło" : "Pokaż hasło"
                        }
                    >
                        {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                        ) : (
                            <Eye className="h-4 w-4" />
                        )}
                    </button>
                )}
            </div>

            {error && (
                <p className="text-sm text-destructive">{error.message}</p>
            )}
        </div>
    );
}

/**
 * Wspólny komponent dla zwykłego pola tekstowego
 */
export interface TextFieldProps {
    id: string;
    label: string;
    type?: "text" | "tel";
    placeholder?: string;
    disabled?: boolean;
    error?: FieldError;
    register: UseFormRegisterReturn;
    optional?: boolean;
}

export function TextField({
    id,
    label,
    type = "text",
    placeholder,
    disabled = false,
    error,
    register,
    optional = false,
}: TextFieldProps) {
    return (
        <div className="space-y-2">
            <Label htmlFor={id}>
                {label}
                {optional && " (opcjonalnie)"}
            </Label>
            <Input
                id={id}
                type={type}
                placeholder={placeholder}
                disabled={disabled}
                {...register}
            />
            {error && (
                <p className="text-sm text-destructive">{error.message}</p>
            )}
        </div>
    );
}
