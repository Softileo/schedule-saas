"use client";

import { useState, useEffect, memo } from "react";
import { useAnimatedDots } from "@/lib/hooks/use-animated-dots";

interface LoadingStage {
    text: string;
    duration: number;
}

interface PageLoaderProps {
    /** Tytuł strony do wyświetlenia */
    title?: string;
    /** Opcjonalne etapy ładowania z czasem trwania */
    stages?: LoadingStage[];
    /** Rozmiar spinnera */
    size?: number;
    /** Grubość linii spinnera */
    stroke?: number;
}

// Domyślne etapy dla różnych stron
const DEFAULT_STAGES: LoadingStage[] = [
    { text: "Łączenie z serwerem", duration: 400 },
    { text: "Pobieranie danych", duration: 600 },
    { text: "Przygotowywanie widoku", duration: 800 },
];

const GRAFIK_STAGES: LoadingStage[] = [
    { text: "Łączenie z serwerem", duration: 300 },
    { text: "Pobieranie grafiku", duration: 500 },
    { text: "Ładowanie pracowników", duration: 400 },
    { text: "Sprawdzanie zmian", duration: 400 },
    { text: "Przygotowywanie kalendarza", duration: 600 },
];

const PANEL_STAGES: LoadingStage[] = [
    { text: "Łączenie z serwerem", duration: 300 },
    { text: "Pobieranie statystyk", duration: 500 },
    { text: "Analizowanie danych", duration: 400 },
    { text: "Przygotowywanie dashboardu", duration: 500 },
];

const PRACOWNICY_STAGES: LoadingStage[] = [
    { text: "Łączenie z serwerem", duration: 300 },
    { text: "Pobieranie listy pracowników", duration: 500 },
    { text: "Ładowanie preferencji", duration: 400 },
    { text: "Przygotowywanie widoku", duration: 400 },
];

const USTAWIENIA_STAGES: LoadingStage[] = [
    { text: "Łączenie z serwerem", duration: 300 },
    { text: "Pobieranie konfiguracji", duration: 500 },
    { text: "Ładowanie preferencji", duration: 400 },
    { text: "Przygotowywanie formularzy", duration: 400 },
];

// Eksportuj preset'y dla różnych stron
export const LOADER_PRESETS = {
    grafik: { title: "Grafik", stages: GRAFIK_STAGES },
    panel: { title: "Panel", stages: PANEL_STAGES },
    pracownicy: { title: "Pracownicy", stages: PRACOWNICY_STAGES },
    ustawienia: { title: "Ustawienia", stages: USTAWIENIA_STAGES },
    default: { title: "", stages: DEFAULT_STAGES },
} as const;

export type LoaderPreset = keyof typeof LOADER_PRESETS;

// ============================================
// GOOGLE SPINNER STYLES (współdzielone)
// ============================================
export const GoogleSpinnerStyles = `
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
        animation:
            google-dash 1.4s ease-in-out infinite,
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
        0%, 100% { stroke: #4285F4; }
        25% { stroke: #EA4335; }
        50% { stroke: #FBBC05; }
        75% { stroke: #34A853; }
    }

    @keyframes slide-up {
        0% {
            opacity: 0;
            transform: translateY(100%);
        }
        20% {
            opacity: 1;
            transform: translateY(0);
        }
        80% {
            opacity: 1;
            transform: translateY(0);
        }
        100% {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .animate-slide-up {
        animation: slide-up 0.4s ease-out forwards;
    }
`;

// ============================================
// GOOGLE SPINNER SVG (reużywalny)
// ============================================
interface GoogleSpinnerSVGProps {
    size?: number;
    stroke?: number;
    className?: string;
}

export const GoogleSpinnerSVG = memo(function GoogleSpinnerSVG({
    size = 48,
    stroke = 4,
    className = "",
}: GoogleSpinnerSVGProps) {
    return (
        <svg
            className={`google-spinner ${className}`}
            width={size}
            height={size}
            viewBox="0 0 50 50"
        >
            <circle
                className="google-spinner-track"
                cx="25"
                cy="25"
                r="20"
                fill="none"
                strokeWidth={stroke}
            />
            <circle
                className="google-spinner-path"
                cx="25"
                cy="25"
                r="20"
                fill="none"
                strokeWidth={stroke}
            />
        </svg>
    );
});

// ============================================
// BUTTON SPINNER (mały, do przycisków)
// ============================================
interface ButtonSpinnerProps {
    size?: number;
    className?: string;
}

export const ButtonSpinner = memo(function ButtonSpinner({
    size = 16,
    className = "mr-2",
}: ButtonSpinnerProps) {
    return (
        <>
            <GoogleSpinnerSVG size={size} stroke={2} className={className} />
            <style>{GoogleSpinnerStyles}</style>
        </>
    );
});

// ============================================
// INLINE LOADER (do ładowania w dialogach)
// ============================================
interface InlineLoaderProps {
    text?: string;
    size?: number;
}

export const InlineLoader = memo(function InlineLoader({
    text = "Ładowanie...",
    size = 32,
}: InlineLoaderProps) {
    return (
        <div className="flex flex-col items-center justify-center gap-3 py-8">
            <GoogleSpinnerSVG size={size} stroke={3} />
            {text && <p className="text-sm text-slate-500">{text}</p>}
            <style>{GoogleSpinnerStyles}</style>
        </div>
    );
});

// ============================================
// CONTENT LOADER (do ładowania sekcji)
// ============================================
interface ContentLoaderProps {
    text?: string;
    size?: number;
    minHeight?: string;
}

export const ContentLoader = memo(function ContentLoader({
    text = "Ładowanie danych...",
    size = 40,
    minHeight = "200px",
}: ContentLoaderProps) {
    const dots = useAnimatedDots();

    return (
        <div
            className="flex flex-col items-center justify-center gap-4"
            style={{ minHeight }}
        >
            <GoogleSpinnerSVG size={size} stroke={3} />
            {text && (
                <p className="text-sm text-slate-500">
                    {text}
                    <span className="inline-block w-4">{dots}</span>
                </p>
            )}
            <style>{GoogleSpinnerStyles}</style>
        </div>
    );
});

// ============================================
// PAGE LOADER (pełny, do stron)
// ============================================
/**
 * Uniwersalny loader w stylu Google z animowanymi kolorami.
 * Używaj z presetami lub własną konfiguracją.
 *
 * @example
 * // Z presetem
 * <PageLoader preset="grafik" />
 *
 * // Z własną konfiguracją
 * <PageLoader title="Moja strona" stages={[...]} />
 */
export const PageLoader = memo(function PageLoader({
    title,
    stages,
    size = 48,
    stroke = 4,
}: PageLoaderProps & { preset?: LoaderPreset }) {
    const [stageIndex, setStageIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const [prevStageIndex, setPrevStageIndex] = useState(-1);

    const activeStages = stages || DEFAULT_STAGES;
    const currentStage = activeStages[stageIndex];

    // Animacja wejścia
    useEffect(() => {
        const timeout = setTimeout(() => setIsVisible(true), 50);
        return () => clearTimeout(timeout);
    }, []);

    // Zmiana etapów z animacją
    useEffect(() => {
        if (!currentStage) return;

        const timeout = setTimeout(() => {
            if (stageIndex < activeStages.length - 1) {
                setPrevStageIndex(stageIndex);
                setStageIndex((prev) => prev + 1);
            }
        }, currentStage.duration);

        return () => clearTimeout(timeout);
    }, [stageIndex, currentStage, activeStages.length]);

    // Reset animacji po zmianie etapu
    useEffect(() => {
        if (prevStageIndex >= 0) {
            const timeout = setTimeout(() => setPrevStageIndex(-1), 300);
            return () => clearTimeout(timeout);
        }
    }, [prevStageIndex]);

    return (
        <div
            className={`flex items-center justify-center min-h-100 transition-opacity duration-500 ${
                isVisible ? "opacity-100" : "opacity-0"
            }`}
        >
            <div className="flex flex-col items-center gap-6">
                {/* Spinner Google */}
                <GoogleSpinnerSVG size={size} stroke={stroke} />

                {/* Tytuł strony */}
                {title && (
                    <h2 className="text-lg font-semibold text-slate-700">
                        {title}
                    </h2>
                )}

                {/* Animowany tekst - wchodzi od dołu */}
                <div className="h-8 overflow-hidden relative">
                    <div
                        key={stageIndex}
                        className="text-sm text-slate-500 animate-slide-up"
                    >
                        {currentStage?.text || "Ładowanie..."}
                    </div>
                </div>

                {/* Progress dots */}
                <div className="flex items-center gap-1.5">
                    {activeStages.map((_, idx) => (
                        <div
                            key={idx}
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                                idx < stageIndex
                                    ? "w-3 bg-blue-500"
                                    : idx === stageIndex
                                    ? "w-5 bg-linear-to-r from-blue-500 via-red-500 to-yellow-500 animate-pulse"
                                    : "w-2 bg-slate-200"
                            }`}
                        />
                    ))}
                </div>
            </div>

            <style>{GoogleSpinnerStyles}</style>
        </div>
    );
});

// Komponent pomocniczy z presetem
interface PageLoaderWithPresetProps
    extends Omit<PageLoaderProps, "title" | "stages"> {
    preset: LoaderPreset;
}

export function PageLoaderWithPreset({
    preset,
    ...props
}: PageLoaderWithPresetProps) {
    const config = LOADER_PRESETS[preset];
    return (
        <PageLoader title={config.title} stages={config.stages} {...props} />
    );
}

export default PageLoader;
