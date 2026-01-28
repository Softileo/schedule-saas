"use client";

import { Spinner } from "@/components/ui/spinner";
import { Check } from "lucide-react";

/**
 * Separator między OAuth a formularzem email
 */
interface OAuthSeparatorProps {
    text?: string;
}

export function OAuthSeparator({
    text = "lub kontynuuj z email",
}: OAuthSeparatorProps) {
    return (
        <div className="relative">
            <div className="relative flex justify-center text-xs">
                <span className="px-2 text-muted-foreground">{text}</span>
            </div>
        </div>
    );
}

/**
 * Ekran ładowania dla auth
 */
interface AuthLoadingScreenProps {
    title: string;
    subtitle?: string;
    children?: React.ReactNode;
}

export function AuthLoadingScreen({
    title,
    subtitle,
    children,
}: AuthLoadingScreenProps) {
    return (
        <div className="space-y-6">
            <div className="flex flex-col items-center justify-center py-12">
                <div className="mb-6">
                    <Spinner size="lg" className="text-blue-600" />
                </div>
                <p className="text-xl font-semibold text-gray-900">{title}</p>
                {subtitle && (
                    <p className="text-sm text-gray-500 mt-2">{subtitle}</p>
                )}
                {children}
            </div>
        </div>
    );
}

/**
 * Ekran sukcesu dla auth
 */
interface AuthSuccessScreenProps {
    title: string;
    subtitle?: string;
}

export function AuthSuccessScreen({ title, subtitle }: AuthSuccessScreenProps) {
    return (
        <div className="space-y-6">
            <div className="flex flex-col items-center justify-center py-12">
                <div className="mb-6 w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center animate-in zoom-in duration-300">
                    <Check className="w-7 h-7 text-white" strokeWidth={3} />
                </div>
                <p className="text-xl font-semibold text-gray-900">{title}</p>
                {subtitle && (
                    <p className="text-sm text-gray-500 mt-2">{subtitle}</p>
                )}
            </div>
        </div>
    );
}
