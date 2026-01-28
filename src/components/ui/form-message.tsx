"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormMessageProps {
    /** Treść wiadomości */
    message: string | null | undefined;
    /** Dodatkowe klasy CSS */
    className?: string;
}

/**
 * Komponent błędu formularza
 *
 * @example
 * {error && <FormError message={error} />}
 */
export function FormError({ message, className }: FormMessageProps) {
    if (!message) return null;

    return (
        <div
            className={cn(
                "flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md",
                className
            )}
        >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{message}</span>
        </div>
    );
}

/**
 * Komponent sukcesu formularza
 *
 * @example
 * {success && <FormSuccess message="Zapisano pomyślnie!" />}
 */
export function FormSuccess({ message, className }: FormMessageProps) {
    if (!message) return null;

    return (
        <div
            className={cn(
                "flex items-center gap-2 p-3 text-sm text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-md",
                className
            )}
        >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{message}</span>
        </div>
    );
}

/**
 * Generyczna wiadomość dla formularza z wariantami
 */
export function FormMessage({
    message,
    variant = "error",
    className,
}: FormMessageProps & {
    variant?: "error" | "success" | "warning" | "info";
}) {
    if (!message) return null;

    const variants = {
        error: {
            bg: "bg-red-50 border-red-200",
            text: "text-red-600",
            Icon: AlertCircle,
        },
        success: {
            bg: "bg-emerald-50 border-emerald-200",
            text: "text-emerald-600",
            Icon: CheckCircle2,
        },
        warning: {
            bg: "bg-amber-50 border-amber-200",
            text: "text-amber-600",
            Icon: AlertCircle,
        },
        info: {
            bg: "bg-blue-50 border-blue-200",
            text: "text-blue-600",
            Icon: AlertCircle,
        },
    };

    const { bg, text, Icon } = variants[variant];

    return (
        <div
            className={cn(
                "flex items-center gap-2 p-3 text-sm border rounded-md",
                bg,
                text,
                className
            )}
        >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{message}</span>
        </div>
    );
}
