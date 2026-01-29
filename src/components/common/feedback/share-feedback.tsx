"use client";

import { useState, useEffect } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import clsx from "clsx";

export function ShareFeedback() {
    const [rating, setRating] = useState<number | null>(null);
    const [hovered, setHovered] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    // Stany kontrolujące znikanie
    const [isFading, setIsFading] = useState(false);
    const [isMounted, setIsMounted] = useState(false); // Zapobiega miganiu przy przeładowaniu
    const [shouldRender, setShouldRender] = useState(true);

    // Sprawdzenie localStorage dopiero po zamontowaniu (klient)
    useEffect(() => {
        const hasSent = localStorage.getItem("feedbackSent") === "true";
        if (hasSent) {
            setShouldRender(false);
        }
        setIsMounted(true);
    }, []);

    // Efekt wyzwalający animację i usunięcie z DOM
    useEffect(() => {
        if (submitted) {
            // Po 2 sekundach od wysłania zacznij wygaszać (opacity)
            const fadeTimer = setTimeout(() => setIsFading(true), 2000);

            // Po kolejnej 1 sekundzie (czas trwania transition) usuń całkowicie
            const removeTimer = setTimeout(() => setShouldRender(false), 3000);

            return () => {
                clearTimeout(fadeTimer);
                clearTimeout(removeTimer);
            };
        }
    }, [submitted]);

    // Jeśli jeszcze nie wiemy czy użytkownik wysłał opinię (SSR), nie renderuj nic
    if (!isMounted || !shouldRender) return null;

    const activeValue = hovered ?? rating ?? 0;

    const handleSubmit = async () => {
        if (!rating) return;
        setLoading(true);
        try {
            const res = await fetch("/api/feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "suggestion", // Musi być "bug" lub "suggestion" zgodnie z interfejsem API
                    title: `Ocena aplikacji: ${rating}/5`, // To jest wymagane
                    description: `Użytkownik ocenił aplikację na ${rating} gwiazdek w module ShareFeedback.`, // TO BYŁO BRAKUJĄCE POLE
                    priority: "low", // Opcjonalnie, Twoje API przyjmuje "low" | "medium" | "high"
                }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || "Błąd API");
            }

            localStorage.setItem("feedbackSent", "true");
            setSubmitted(true);
        } catch (err) {
            console.error(err);
            alert("Nie udało się wysłać opinii.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className={clsx(
                "w-full max-w-md mx-auto [perspective:1200px] transition-all duration-2000 ease-in-out",
                isFading
                    ? "opacity-0 scale-95 pointer-events-none"
                    : "opacity-100 scale-100",
            )}
        >
            {/* Kontener flip */}
            <div
                className={clsx(
                    "relative w-full h-[300px] transition-transform duration-700 [transform-style:preserve-3d] rounded-2xl shadow-lg",
                    submitted && "[transform:rotateY(180deg)]",
                )}
            >
                {/* FRONT */}
                <div className="absolute inset-0 w-full h-full bg-white border border-slate-200 rounded-2xl p-8 flex flex-col gap-6 items-center justify-center [backface-visibility:hidden]">
                    <div className="text-center space-y-2">
                        <p className="text-lg font-semibold text-slate-900">
                            Oceń swoje doświadczenie
                        </p>
                        <p className="text-sm text-slate-500 max-w-md mx-auto">
                            Pomóż nam rozwijać aplikację, zostawiając swoją
                            opinię.
                        </p>
                    </div>

                    <div className="flex gap-2 justify-center">
                        {Array.from({ length: 5 }).map((_, idx) => {
                            const value = idx + 1;
                            const isActive = value <= activeValue;
                            return (
                                <button
                                    key={value}
                                    type="button"
                                    onMouseEnter={() => setHovered(value)}
                                    onMouseLeave={() => setHovered(null)}
                                    onClick={() => setRating(value)}
                                    className="focus:outline-none"
                                >
                                    <Star
                                        className={clsx(
                                            "h-8 w-8 transition-transform duration-200",
                                            isActive
                                                ? "fill-yellow-400 text-yellow-400 scale-110"
                                                : "text-slate-300 hover:text-slate-400",
                                        )}
                                    />
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex items-center justify-between w-full mt-4">
                        <p className="text-xs text-slate-400">
                            {rating ? `Ocena: ${rating}/5` : "Wybierz ocenę"}
                        </p>
                        <Button
                            size="sm"
                            disabled={!rating || loading}
                            onClick={handleSubmit}
                        >
                            {loading ? "Wysyłanie..." : "Wyślij opinię"}
                        </Button>
                    </div>
                </div>

                {/* BACK */}
                <div className="absolute inset-0 w-full h-full bg-green-50 border border-green-200 rounded-2xl p-8 flex flex-col gap-3 items-center justify-center [backface-visibility:hidden] [transform:rotateY(180deg)]">
                    <p className="text-lg font-bold text-green-700 text-center">
                        Dziękujemy za Twoją opinię! 🎉
                    </p>
                    <p className="text-sm text-green-800 text-center max-w-sm px-2 mt-2">
                        Dzięki Tobie możemy rozwijać aplikację w jeszcze lepszym
                        kierunku.
                    </p>
                </div>
            </div>
        </div>
    );
}
