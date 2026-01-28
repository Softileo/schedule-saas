"use client";

import { useState, useEffect, memo } from "react";
import { GoogleSpinnerSVG, GoogleSpinnerStyles } from "./page-loader";
import { useAnimatedDots } from "@/lib/hooks/use-animated-dots";

const LOADING_STAGES = [
    { text: "Analizuję dostępność pracowników", duration: 350 },
    { text: "Sprawdzam preferencje godzinowe", duration: 700 },
    { text: "Uwzględniam nieobecności i urlopy", duration: 700 },
    { text: "Rozdzielam zmiany", duration: 500 },
    { text: "Balansuję weekendy między pracownikami", duration: 500 },
    { text: "Optymalizuję rozkład godzin", duration: 200 },
    { text: "Finalizuję grafik", duration: 3000 },
];

interface AILoadingSpinnerProps {
    size?: number;
    stroke?: number;
}

/**
 * Spinner AI do generowania grafiku.
 * Używa współdzielonych stylów Google z page-loader.
 */
const GoogleSpinner = memo(function GoogleSpinner({
    size = 40,
    stroke = 3,
}: AILoadingSpinnerProps) {
    const [stageIndex, setStageIndex] = useState(0);
    const dots = useAnimatedDots();

    // Zmiana etapów
    useEffect(() => {
        const currentStage = LOADING_STAGES[stageIndex];
        if (!currentStage) return;

        const timeout = setTimeout(() => {
            setStageIndex((prev) =>
                prev < LOADING_STAGES.length - 1 ? prev + 1 : prev
            );
        }, currentStage.duration);

        return () => clearTimeout(timeout);
    }, [stageIndex]);

    const currentText = LOADING_STAGES[stageIndex]?.text || "Generuję grafik";

    return (
        <div className="flex flex-col items-center justify-center gap-6 py-8">
            {/* Spinner Google */}
            <GoogleSpinnerSVG size={size} stroke={stroke} />

            {/* Animowany tekst */}
            <div className="text-center space-y-2 min-h-15">
                <p className="text-base font-medium text-slate-800 transition-all duration-300">
                    {currentText}
                    <span className="inline-block w-6 text-left">{dots}</span>
                </p>

                {/* Progress indicators */}
                <div className="flex items-center justify-center gap-1.5 pt-6">
                    {LOADING_STAGES.map((_, idx) => (
                        <div
                            key={idx}
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                                idx < stageIndex
                                    ? "w-4 bg-blue-500"
                                    : idx === stageIndex
                                    ? "w-6 bg-blue-400 animate-pulse"
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

export default GoogleSpinner;
