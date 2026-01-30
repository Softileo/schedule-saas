"use client";

import { useState, useEffect, useRef } from "react";
import { logger } from "@/lib/utils/logger";
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, AlertCircle, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import type { Employee } from "@/types";
import {
    getEmployeeColor,
    getEmployeeInitials,
} from "@/lib/core/employees/utils";
import { SIGNIFICANT_HOURS_SURPLUS } from "@/lib/constants/labor-code";
import { NoIssuesMessage } from "./components/no-issues-message";
import { AI_GENERATION_LIMIT_PER_MONTH } from "@/lib/constants/ai";

// Wydzielone komponenty i typy
import {
    type GeneratedShift,
    type EmployeeStats,
    type OptimizationInfo,
    type ScheduleQuality,
} from "./components";
import { GoogleSpinnerSVG } from "@/components/ui/page-loader";

interface AIGenerateDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    organizationId: string;
    year: number;
    month: number;
    onRefresh?: () => Promise<void>; // Odświeżenie danych z bazy po zapisie
}

export function AIGenerateDialog({
    open,
    onOpenChange,
    organizationId,
    year,
    month,
    onRefresh,
}: AIGenerateDialogProps) {
    const [mode] = useState<"fast" | "balanced">("balanced");
    const [step, setStep] = useState<"loading" | "preview" | "limit-check">(
        "limit-check",
    );
    const [progress, setProgress] = useState(0);
    const [loadingText, setLoadingText] = useState("Inicjalizacja...");
    const [error, setError] = useState<string | null>(null);
    const [, setGeneratedShifts] = useState<GeneratedShift[]>([]);
    const [stats, setStats] = useState<EmployeeStats[]>([]);
    const [optimization, setOptimization] = useState<OptimizationInfo | null>(
        null,
    );
    const [scheduleQuality, setScheduleQuality] =
        useState<ScheduleQuality | null>(null);

    // Nowe stany dla limitów AI
    const [aiUsage, setAiUsage] = useState<{
        current: number;
        limit: number;
        loading: boolean;
    }>({ current: 0, limit: AI_GENERATION_LIMIT_PER_MONTH, loading: true });

    const monthName = format(new Date(year, month - 1), "LLLL yyyy", {
        locale: pl,
    });

    // Ref zapobiegający podwójnemu wywołaniu (np. w StrictMode lub przy szybkim renderowaniu)
    const hasStartedRef = useRef(false);

    // Załaduj dane i od razu generuj przy otwarciu
    useEffect(() => {
        if (open) {
            // Upewnij się, że generowanie uruchamia się tylko raz dla danej sesji otwarcia
            if (!hasStartedRef.current) {
                hasStartedRef.current = true;
                loadEmployees();
                // Sprawdź limity AI przed generowaniem
                checkAIUsage();
            }
        } else {
            // Reset state when closing
            hasStartedRef.current = false;
            setStep("limit-check");
            setError(null);
            setGeneratedShifts([]);
            setStats([]);
            setAiUsage({
                current: 0,
                limit: AI_GENERATION_LIMIT_PER_MONTH,
                loading: true,
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    // Lista pracowników
    const [employees, setEmployees] = useState<Employee[]>([]);

    const loadEmployees = async () => {
        try {
            const response = await fetch(
                `/api/schedule/employee-data?organizationId=${organizationId}&year=${year}&month=${month}`,
            );
            if (response.ok) {
                const data = await response.json();
                if (data.employees) {
                    setEmployees(data.employees);
                }
            }
        } catch (err) {
            logger.error("Błąd ładowania pracowników:", err);
        }
    };

    const checkAIUsage = async () => {
        try {
            const response = await fetch(
                `/api/schedule/ai-usage?organizationId=${organizationId}`,
            );

            if (response.ok) {
                const data = await response.json();
                setAiUsage({
                    current: data.usage || 0,
                    limit: data.limit || 3,
                    loading: false,
                });
            } else {
                // W przypadku błędu założ że limit nie został przekroczony
                setAiUsage({
                    current: 0,
                    limit: AI_GENERATION_LIMIT_PER_MONTH,
                    loading: false,
                });
            }
        } catch (err) {
            logger.error("Błąd sprawdzania limitów AI:", err);
            setAiUsage({
                current: 0,
                limit: AI_GENERATION_LIMIT_PER_MONTH,
                loading: false,
            });
        }
    };

    const handleGenerate = async () => {
        setStep("loading");
        setError(null);
        setProgress(0);
        setLoadingText("Inicjalizacja środowiska...");

        // Symulacja paska postępu odzwierciedlająca kroki algorytmu
        const intervalId = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 95) return prev;

                // Fazy algorytmu (dopasowane do czasu trwania ~3-5s)
                if (prev < 20) {
                    setLoadingText("Pobieranie danych...");
                    return prev + 2;
                } else if (prev < 40) {
                    setLoadingText("Generowanie wstępne...");
                    return prev + 1.5;
                } else if (prev < 75) {
                    setLoadingText("Optymalizacja...");
                    return prev + 0.8;
                } else if (prev < 85) {
                    setLoadingText("Weryfikacja reguł Kodeksu Pracy...");
                    return prev + 0.5;
                } else {
                    setLoadingText("Zapisywanie grafiku...");
                    return prev + 0.2;
                }
            });
        }, 150);

        try {
            const response = await fetch("/api/schedule/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    organizationId,
                    year,
                    month,
                    mode,
                }),
            });

            clearInterval(intervalId);
            setProgress(100);
            setLoadingText("Gotowe!");

            const jsonResponse = await response.json();

            if (!response.ok) {
                // Sprawdź czy to błąd INFEASIBLE z Python API
                if (
                    jsonResponse.status === "INFEASIBLE" &&
                    jsonResponse.reasons
                ) {
                    const reasons = jsonResponse.reasons as string[];
                    const suggestions = jsonResponse.suggestions as string[];

                    // Parsuj główny powód (np. "Za mało godzin pracowniczych (480h) na pokrycie wymaganych zmian (2296h)")
                    const mainReason = reasons[0] || "";
                    const match = mainReason.match(
                        /Za mało godzin pracowniczych \((\d+)h\) na pokrycie wymaganych zmian \((\d+)h\)/,
                    );

                    if (match) {
                        const available = parseInt(match[1]);
                        const required = parseInt(match[2]);
                        const missingHours = required - available;
                        const missingEmployees = Math.ceil(missingHours / 160); // ~160h/miesiąc per pracownik

                        let userMessage = `🚫 Nie można wygenerować grafiku\n\n`;
                        userMessage += `Masz za mało pracowników na ten miesiąc.\n\n`;
                        userMessage += `📊 Sytuacja:\n`;
                        userMessage += `• Dostępne godziny: ${available}h\n`;
                        userMessage += `• Potrzebne godziny: ${required}h\n`;
                        userMessage += `• Brakuje: ${missingHours}h (~${missingEmployees} pracowników)\n\n`;
                        userMessage += `💡 Co możesz zrobić:\n\n`;
                        userMessage += `1️⃣ Dodaj więcej pracowników w zakładce "Pracownicy"\n`;
                        userMessage += `2️⃣ Zmniejsz "Min. pracowników" w szablonach zmian\n`;
                        userMessage += `3️⃣ Usuń niepotrzebne szablony zmian\n`;
                        userMessage += `4️⃣ Skróć godziny otwarcia w Ustawieniach`;

                        throw new Error(userMessage);
                    }
                }

                // Standardowa obsługa innych błędów
                const err = jsonResponse.error;
                const message =
                    err?.message || jsonResponse.error || "Wystąpił błąd";
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const hint = (err?.details as any)?.hint;
                const errorMsg = hint ? `${message}\n${hint}` : message;
                throw new Error(errorMsg);
            }

            const data = jsonResponse.data;

            setGeneratedShifts(data.shifts || []);

            // Mapuj metryki
            if (data.metrics) {
                setScheduleQuality({
                    qualityPercent: data.metrics.qualityPercent || 0,
                    totalFitness: data.metrics.fitness || 0,
                    emptyDays: data.metrics.emptyDays || 0,
                    understaffedShifts: data.metrics.understaffedShifts || 0,
                    hoursImbalance: data.metrics.balance?.hoursImbalance || 0,
                    weekendImbalance:
                        data.metrics.balance?.weekendImbalance || 0,
                    warnings: data.metrics.warnings || [],
                });

                // Ustaw statystyki pracowników z API
                if (data.metrics.employeeStats) {
                    setStats(data.metrics.employeeStats);
                }
            }

            // Optymalizacja info
            if (data.execution) {
                setOptimization({
                    enabled: true,
                    mode: data.execution.mode || mode,
                    executionTimeMs: data.execution.algorithmTimeMs,
                    improvementPercent: data.metrics?.qualityPercent,
                    explanations:
                        data.execution.layers?.map(
                            (l: string) => `Warstwa: ${l}`,
                        ) || [],
                });
            }

            // Odśwież dane z bazy (zmiany są już zapisane przez API)
            // Nie używamy onApply bo tworzy sztuczne ID - lepiej pobrać prawdziwe dane z bazy
            if (onRefresh) {
                await onRefresh();
            }

            // Zwiększ licznik użycia AI
            await incrementAIUsage();

            setStep("preview");
        } catch (err) {
            clearInterval(intervalId);
            setError(err instanceof Error ? err.message : "Wystąpił błąd");
            setStep("preview");
        }
    };

    const incrementAIUsage = async () => {
        try {
            await fetch("/api/schedule/ai-usage", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    organizationId,
                    year,
                    month,
                }),
            });
        } catch (err) {
            logger.error("Błąd aktualizacji limitu AI:", err);
        }
    };

    // Blokuj zamykanie podczas generowania lub sprawdzania limitu
    const canClose = step !== "loading" && !aiUsage.loading;

    // Funkcja zamykania - tylko przez X
    const handleCloseClick = () => {
        if (canClose) {
            onOpenChange(false);
        }
    };

    return (
        <Dialog
            open={open}
            onOpenChange={() => {}} // Wyłączamy domyślne zachowanie
        >
            <DialogContent
                className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
                onPointerDownOutside={(e) => e.preventDefault()} // Zawsze blokuj klik na zewnątrz
                onEscapeKeyDown={(e) => e.preventDefault()} // Zawsze blokuj ESC
                onInteractOutside={(e) => e.preventDefault()} // Zawsze blokuj
                showCloseButton={false} // Ukrywamy domyślny X
            >
                {/* Własny przycisk X - tylko gdy można zamknąć */}
                {canClose && (
                    <button
                        onClick={handleCloseClick}
                        className="absolute top-4 right-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                        <span className="sr-only">Zamknij</span>
                    </button>
                )}
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-violet-500" />
                        Automatyczne generowanie grafiku
                    </DialogTitle>
                    <DialogDescription>
                        {monthName} • {employees.length} pracowników
                    </DialogDescription>
                </DialogHeader>

                {/* Step: Limit Check */}
                {step === "limit-check" && (
                    <div className="flex flex-col items-center justify-center py-12 px-8 space-y-6">
                        {aiUsage.loading ? (
                            <>
                                <GoogleSpinnerSVG size={48} stroke={3} />
                                <p className="text-sm text-slate-600">
                                    Sprawdzanie limitów AI...
                                </p>
                            </>
                        ) : aiUsage.current >= aiUsage.limit ? (
                            <>
                                <div className="p-4 bg-red-50 rounded-full">
                                    <AlertCircle className="h-12 w-12 text-red-600" />
                                </div>
                                <div className="text-center space-y-2">
                                    <h3 className="text-lg font-semibold text-slate-900">
                                        Limit generowań AI wyczerpany
                                    </h3>
                                    <p className="text-sm text-slate-600 max-w-md">
                                        Wykorzystałeś już wszystkie{" "}
                                        {aiUsage.limit} generowania AI w tym
                                        miesiącu ({monthName}).
                                    </p>
                                    <p className="text-xs text-slate-500 pt-2">
                                        Limit zostanie odnowiony 1. dnia
                                        następnego miesiąca.
                                    </p>
                                </div>
                                <div className="flex flex-col items-center gap-3 w-full">
                                    <div className="w-full bg-slate-100 rounded-lg p-4">
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="font-medium text-slate-700">
                                                Wykorzystane generowania
                                            </span>
                                            <span className="font-bold text-red-600">
                                                {aiUsage.current}/
                                                {aiUsage.limit}
                                            </span>
                                        </div>
                                        <Progress
                                            value={100}
                                            className="h-2 bg-slate-200"
                                        />
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="p-4 bg-violet-50 rounded-full">
                                    <Sparkles className="h-12 w-12 text-violet-600" />
                                </div>
                                <div className="text-center space-y-2">
                                    <h3 className="text-lg font-semibold text-slate-900">
                                        Gotowy do generowania
                                    </h3>
                                    <p className="text-sm text-slate-600 max-w-md">
                                        Wykorzystaj algorytm AI do
                                        automatycznego utworzenia optymalnego
                                        grafiku dla {monthName}.
                                    </p>
                                </div>
                                <div className="flex flex-col items-center gap-3 w-full">
                                    <div className="w-full bg-violet-50 rounded-lg p-4 border border-violet-200">
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="font-medium text-violet-900">
                                                Pozostałe generowania w tym
                                                miesiącu
                                            </span>
                                            <span className="font-bold text-violet-600">
                                                {aiUsage.limit -
                                                    aiUsage.current}
                                                /{aiUsage.limit}
                                            </span>
                                        </div>
                                        <Progress
                                            value={
                                                ((aiUsage.limit -
                                                    aiUsage.current) /
                                                    aiUsage.limit) *
                                                100
                                            }
                                            className="h-2 bg-violet-100"
                                        />
                                    </div>
                                    <Button
                                        onClick={handleGenerate}
                                        className="w-full"
                                        size="lg"
                                    >
                                        <Sparkles className="h-4 w-4 mr-2" />
                                        Wygeneruj grafik
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Step: Loading */}
                {step === "loading" && (
                    <div className="flex flex-col items-center justify-center py-12 px-8 space-y-8">
                        <div className="relative">
                            <GoogleSpinnerSVG size={56} stroke={3} />
                        </div>

                        <div className="w-full space-y-3">
                            <div className="flex justify-between text-sm font-medium text-blue-700">
                                <span className="animate-pulse">
                                    {loadingText}
                                </span>
                                <span>{Math.round(progress)}%</span>
                            </div>
                            <Progress
                                value={progress}
                                className="h-2.5 bg-blue-50"
                            />
                        </div>

                        <div className="flex flex-col items-center gap-2 text-xs text-slate-500 max-w-sm text-center">
                            <p>
                                Algorytm analizuje miliony kombinacji w celu
                                znalezienia optymalnego grafiku...
                            </p>
                        </div>
                    </div>
                )}

                {/* Step: Preview */}
                {step === "preview" && (
                    <div className="flex-1 overflow-hidden flex flex-col">
                        {error ? (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                        <div className="text-sm text-red-900 whitespace-pre-line">
                                            {error}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 overflow-auto">
                                <div className="space-y-4">
                                    {/* Quality Score + Time */}
                                    {scheduleQuality && (
                                        <div className="bg-linear-to-r from-violet-50 to-purple-50 rounded-lg p-4 border border-violet-100">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <Sparkles className="h-5 w-5 text-violet-500" />
                                                    <div>
                                                        <span className="font-medium text-violet-900">
                                                            Jakość grafiku
                                                        </span>
                                                        {optimization?.executionTimeMs && (
                                                            <p className="text-xs text-violet-600 mt-0.5">
                                                                zoptymalizowało
                                                                w{" "}
                                                                {
                                                                    optimization.executionTimeMs
                                                                }
                                                                ms
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <span
                                                    className={cn(
                                                        "text-3xl font-bold",
                                                        scheduleQuality.qualityPercent >=
                                                            80
                                                            ? "text-emerald-600"
                                                            : scheduleQuality.qualityPercent >=
                                                                60
                                                              ? "text-amber-600"
                                                              : "text-red-600",
                                                    )}
                                                >
                                                    {scheduleQuality.qualityPercent.toFixed(
                                                        0,
                                                    )}
                                                    %
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Ostrzeżenia - luki w obsadzie, naruszenia i problemy */}
                                    {(() => {
                                        const employeesWithViolations =
                                            stats.filter(
                                                (s) =>
                                                    s.violations &&
                                                    s.violations.length > 0,
                                            );
                                        const employeesWithHoursDiff =
                                            stats.filter(
                                                (s) =>
                                                    s.hoursDiff !== undefined &&
                                                    Math.abs(s.hoursDiff) >
                                                        SIGNIFICANT_HOURS_SURPLUS *
                                                            2,
                                            );

                                        // Luki w obsadzie z warnings
                                        const staffingWarnings =
                                            scheduleQuality?.warnings || [];
                                        const hasStaffingIssues =
                                            scheduleQuality &&
                                            (scheduleQuality.understaffedShifts >
                                                0 ||
                                                scheduleQuality.emptyDays > 0 ||
                                                staffingWarnings.length > 0);

                                        if (
                                            employeesWithViolations.length ===
                                                0 &&
                                            employeesWithHoursDiff.length ===
                                                0 &&
                                            !hasStaffingIssues
                                        ) {
                                            return <NoIssuesMessage />;
                                        }

                                        return (
                                            <div className="space-y-2">
                                                {employeesWithViolations.length >
                                                    0 && (
                                                    <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                                                        <div className="flex items-center gap-2 text-red-700 font-medium text-sm mb-2">
                                                            <AlertCircle className="h-4 w-4" />
                                                            Naruszenia (
                                                            {
                                                                employeesWithViolations.length
                                                            }
                                                            )
                                                        </div>
                                                        <div className="space-y-1">
                                                            {employeesWithViolations
                                                                .slice(0, 5)
                                                                .map((stat) => (
                                                                    <p
                                                                        key={
                                                                            stat.employeeId
                                                                        }
                                                                        className="text-xs text-red-600"
                                                                    >
                                                                        <span className="font-medium">
                                                                            {
                                                                                stat.employeeName
                                                                            }
                                                                            :
                                                                        </span>{" "}
                                                                        {stat.violations
                                                                            .slice(
                                                                                0,
                                                                                2,
                                                                            )
                                                                            .join(
                                                                                ", ",
                                                                            )}
                                                                        {stat
                                                                            .violations
                                                                            .length >
                                                                            2 &&
                                                                            ` (+${
                                                                                stat
                                                                                    .violations
                                                                                    .length -
                                                                                2
                                                                            })`}
                                                                    </p>
                                                                ))}
                                                            {employeesWithViolations.length >
                                                                5 && (
                                                                <p className="text-xs text-red-500 italic">
                                                                    ...i{" "}
                                                                    {employeesWithViolations.length -
                                                                        5}{" "}
                                                                    więcej
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {employeesWithHoursDiff.length >
                                                    0 && (
                                                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                                                        <div className="flex items-center gap-2 text-amber-700 font-medium text-sm mb-2">
                                                            <AlertTriangle className="h-4 w-4" />
                                                            Duże różnice godzin
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {employeesWithHoursDiff.map(
                                                                (stat) => (
                                                                    <Badge
                                                                        key={
                                                                            stat.employeeId
                                                                        }
                                                                        variant="outline"
                                                                        className="text-xs bg-amber-100 border-amber-300 text-amber-800"
                                                                    >
                                                                        {
                                                                            stat.employeeName.split(
                                                                                " ",
                                                                            )[0]
                                                                        }
                                                                        :{" "}
                                                                        {stat.hoursDiff >
                                                                        0
                                                                            ? "+"
                                                                            : ""}
                                                                        {
                                                                            stat.hoursDiff
                                                                        }
                                                                        h
                                                                    </Badge>
                                                                ),
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Luki w obsadzie - za mało pracowników */}
                                                {hasStaffingIssues && (
                                                    <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                                                        <div className="flex items-center gap-2 text-orange-700 font-medium text-sm mb-2">
                                                            <AlertTriangle className="h-4 w-4" />
                                                            Luki w obsadzie
                                                            {scheduleQuality &&
                                                                (scheduleQuality.understaffedShifts >
                                                                    0 ||
                                                                    scheduleQuality.emptyDays >
                                                                        0) && (
                                                                    <span className="font-normal text-orange-600">
                                                                        (
                                                                        {
                                                                            scheduleQuality.understaffedShifts
                                                                        }{" "}
                                                                        zmian z
                                                                        niedoborem
                                                                        {scheduleQuality.emptyDays >
                                                                            0 &&
                                                                            `, ${scheduleQuality.emptyDays} dni bez obsady`}
                                                                        )
                                                                    </span>
                                                                )}
                                                        </div>
                                                        {staffingWarnings.length >
                                                            0 && (
                                                            <div className="space-y-1 mb-2">
                                                                {staffingWarnings
                                                                    .slice(0, 8)
                                                                    .map(
                                                                        (
                                                                            warning,
                                                                            idx,
                                                                        ) => (
                                                                            <p
                                                                                key={
                                                                                    idx
                                                                                }
                                                                                className="text-xs text-orange-600"
                                                                            >
                                                                                {
                                                                                    warning
                                                                                }
                                                                            </p>
                                                                        ),
                                                                    )}
                                                                {staffingWarnings.length >
                                                                    8 && (
                                                                    <p className="text-xs text-orange-500 italic">
                                                                        ...i{" "}
                                                                        {staffingWarnings.length -
                                                                            8}{" "}
                                                                        więcej
                                                                    </p>
                                                                )}
                                                            </div>
                                                        )}
                                                        <p className="text-xs text-orange-600 mt-2 border-t border-orange-200 pt-2">
                                                            💡{" "}
                                                            <strong>
                                                                Wskazówka:
                                                            </strong>{" "}
                                                            Dodaj więcej
                                                            pracowników lub
                                                            utwórz dodatkowe
                                                            szablony zmian
                                                            dopasowane do godzin
                                                            otwarcia (np. osobne
                                                            dla niedzieli).
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}

                                    {/* Pracownicy - lista z liczbą zmian */}
                                    <div className="space-y-2">
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                            {stats.map((stat) => {
                                                const emp = employees.find(
                                                    (e) =>
                                                        e.id ===
                                                        stat.employeeId,
                                                );
                                                const hasViolations =
                                                    stat.violations &&
                                                    stat.violations.length > 0;
                                                const hoursDiffOk =
                                                    Math.abs(stat.hoursDiff) <=
                                                    SIGNIFICANT_HOURS_SURPLUS;

                                                return (
                                                    <div
                                                        key={stat.employeeId}
                                                        className={cn(
                                                            "flex items-center gap-2 p-2 rounded-lg border",
                                                            hasViolations
                                                                ? "bg-red-50 border-red-200"
                                                                : !hoursDiffOk
                                                                  ? "bg-amber-50 border-amber-200"
                                                                  : "bg-emerald-50 border-emerald-200",
                                                        )}
                                                    >
                                                        {emp && (
                                                            <div
                                                                className="w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                                                                style={{
                                                                    backgroundColor:
                                                                        getEmployeeColor(
                                                                            emp,
                                                                        ),
                                                                }}
                                                            >
                                                                {getEmployeeInitials(
                                                                    emp,
                                                                )}
                                                            </div>
                                                        )}
                                                        <div className="min-w-0 flex-1 flex items-center justify-between">
                                                            <p className="text-xs font-medium text-slate-900 truncate">
                                                                {emp
                                                                    ? `${
                                                                          emp.first_name
                                                                      } ${emp.last_name.charAt(
                                                                          0,
                                                                      )}.`
                                                                    : stat.employeeName.split(
                                                                          " ",
                                                                      )[0]}
                                                            </p>

                                                            <span className="text-slate-600 text-xs">
                                                                {
                                                                    stat.totalHours
                                                                }
                                                                h
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <DialogFooter className="mt-4 pt-4 border-t">
                            <Button
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                            >
                                Zamknij
                            </Button>
                        </DialogFooter>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
