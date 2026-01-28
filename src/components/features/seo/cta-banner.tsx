import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, LucideIcon } from "lucide-react";

interface ButtonConfig {
    text: string;
    href: string;
    icon?: LucideIcon;
}

export interface CTABannerProps {
    title: string;
    subtitle?: string;
    description?: string; // alias dla subtitle
    buttonText?: string;
    buttonHref?: string;
    buttonIcon?: LucideIcon;
    variant?: "default" | "gradient" | "subtle";
    primaryButton?: ButtonConfig;
    secondaryButton?: ButtonConfig;
}

/**
 * Banner CTA wielokrotnego użytku
 */
export function CTABanner({
    title,
    subtitle,
    description,
    buttonText = "Rozpocznij za darmo",
    buttonHref = "/rejestracja",
    buttonIcon: ButtonIcon = ArrowRight,
    variant = "default",
    primaryButton,
    secondaryButton,
}: CTABannerProps) {
    const variants = {
        default: "bg-white border border-gray-100 shadow-lg",
        gradient:
            "bg-linear-to-r from-blue-600 to-violet-600 text-white border-0",
        subtle: "bg-gray-50 border border-gray-100",
    };

    const textColor = variant === "gradient" ? "text-white" : "text-gray-900";
    const subtitleColor =
        variant === "gradient" ? "text-white/80" : "text-gray-600";

    // Użyj description jako alias dla subtitle
    const displaySubtitle = subtitle || description;

    // Przycisk główny - z primaryButton lub domyślnych wartości
    const mainButtonText = primaryButton?.text || buttonText;
    const mainButtonHref = primaryButton?.href || buttonHref;
    const MainButtonIcon = primaryButton?.icon || ButtonIcon;

    return (
        <div
            className={`rounded-t-4xl p-8 md:p-12 text-center ${variants[variant]}`}
        >
            <h3 className={`text-2xl md:text-3xl font-bold mb-3 ${textColor}`}>
                {title}
            </h3>
            {displaySubtitle && (
                <p className={`text-base md:text-lg mb-6 ${subtitleColor}`}>
                    {displaySubtitle}
                </p>
            )}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                    asChild
                    size="lg"
                    variant={variant === "gradient" ? "secondary" : "default"}
                    className={
                        variant === "gradient"
                            ? "h-12 px-8 bg-white text-blue-600 hover:bg-gray-100 rounded-xl"
                            : "h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/25"
                    }
                >
                    <Link href={mainButtonHref}>
                        {mainButtonText}
                        <MainButtonIcon className="ml-2 w-5 h-5" />
                    </Link>
                </Button>
                {secondaryButton && (
                    <Button
                        asChild
                        size="lg"
                        variant="outline"
                        className={
                            variant === "gradient"
                                ? "h-12 px-8 border-white/30 text-blue-800 hover:bg-violet-100 rounded-xl"
                                : "h-12 px-8 border-gray-200 hover:bg-violet-100 text-gray-700 rounded-xl"
                        }
                    >
                        <Link href={secondaryButton.href}>
                            {secondaryButton.text}
                        </Link>
                    </Button>
                )}
            </div>
        </div>
    );
}
