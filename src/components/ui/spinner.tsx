"use client";

import { cn } from "@/lib/utils";

interface SpinnerProps {
    /** Rozmiar spinnera: sm, md, lg lub custom className */
    size?: "sm" | "md" | "lg";
    /** Dodatkowe klasy CSS */
    className?: string;
    /** Czy dodać margines po prawej (dla buttonów) */
    withMargin?: boolean;
}

const sizeConfig = {
    sm: { size: 16, stroke: 2 },
    md: { size: 20, stroke: 2.5 },
    lg: { size: 48, stroke: 4 },
};

/**
 * Google-style spinner ładowania z animowanymi kolorami.
 * Używaj zamiast bezpośredniego <Loader2 className="animate-spin" />
 *
 * @example
 * // W przycisku
 * <Button disabled={isLoading}>
 *   {isLoading && <Spinner withMargin />}
 *   Zapisz
 * </Button>
 *
 * @example
 * // Standalone
 * <Spinner size="lg" />
 */
export function Spinner({
    size = "md",
    className,
    withMargin = false,
}: SpinnerProps) {
    const config = sizeConfig[size];

    return (
        <>
            <svg
                className={cn(
                    "google-spinner inline-block",
                    withMargin && "mr-2",
                    className
                )}
                width={config.size}
                height={config.size}
                viewBox="0 0 50 50"
            >
                <circle
                    className="google-spinner-track"
                    cx="25"
                    cy="25"
                    r="20"
                    fill="none"
                    strokeWidth={config.stroke}
                />
                <circle
                    className="google-spinner-path"
                    cx="25"
                    cy="25"
                    r="20"
                    fill="none"
                    strokeWidth={config.stroke}
                />
            </svg>
            <style jsx>{`
                .google-spinner {
                    animation: google-rotate 1.4s linear infinite;
                }

                .google-spinner-track {
                    stroke: #e8e9eb;
                }

                .google-spinner-path {
                    stroke-linecap: round;
                    stroke-dasharray: 1, 200;
                    stroke-dashoffset: 0;
                    animation: google-dash 1.4s ease-in-out infinite,
                        google-colors 5.6s ease-in-out infinite;
                }

                @keyframes google-rotate {
                    100% {
                        transform: rotate(360deg);
                    }
                }

                @keyframes google-dash {
                    0% {
                        stroke-dasharray: 1, 200;
                        stroke-dashoffset: 0;
                    }
                    50% {
                        stroke-dasharray: 89, 200;
                        stroke-dashoffset: -35;
                    }
                    100% {
                        stroke-dasharray: 89, 200;
                        stroke-dashoffset: -124;
                    }
                }

                @keyframes google-colors {
                    0%,
                    100% {
                        stroke: #4285f4;
                    }
                    25% {
                        stroke: #ea4335;
                    }
                    50% {
                        stroke: #fbbc05;
                    }
                    75% {
                        stroke: #34a853;
                    }
                }
            `}</style>
        </>
    );
}
