"use client";

import { Badge } from "@/components/ui/badge";
import {
    Sparkles,
    Brain,
    Scale,
    ShieldCheck,
    BarChart3,
    ArrowRight,
    Clock,
    Users,
    CheckCircle2,
    Cpu,
    Layers,
    RefreshCw,
} from "lucide-react";

const algorithmSteps = [
    {
        icon: Layers,
        title: "Zbieranie danych wejściowych",
        description:
            "Algorytm analizuje listę pracowników, ich dostępność, preferencje godzinowe, umiejętności, urlopy i wcześniejsze grafiki. Im więcej danych — tym lepszy wynik.",
        details: [
            "Dostępność każdego pracownika",
            "Preferencje dni i godzin",
            "Kwalifikacje i uprawnienia",
            "Historia poprzednich grafików",
        ],
        color: "blue",
    },
    {
        icon: Scale,
        title: "Walidacja przepisów prawa pracy",
        description:
            "Przed generowaniem grafiku system weryfikuje wszystkie ograniczenia wynikające z Kodeksu Pracy: 11-godzinny odpoczynek dobowy, 35-godzinny odpoczynek tygodniowy, limity nadgodzin i zakazy pracy w niedziele.",
        details: [
            "Min. 11h odpoczynku dobowego",
            "Min. 35h odpoczynku tygodniowego",
            "Limit 150h nadgodzin rocznie",
            "Zakaz pracy w niedziele handlowe",
        ],
        color: "emerald",
    },
    {
        icon: Cpu,
        title: "Optymalizacja harmonogramu",
        description:
            "Algorytm constraint-satisfaction rozwiązuje problem planowania jako zadanie optymalizacyjne. Minimalizuje konflikty, równoważy obciążenie pracowników i maksymalizuje pokrycie zmian.",
        details: [
            "Równomierne rozłożenie godzin",
            "Minimalizacja nadgodzin",
            "Optymalne pokrycie zmian",
            "Sprawiedliwy podział weekendów",
        ],
        color: "violet",
    },
    {
        icon: RefreshCw,
        title: "Iteracyjne doskonalenie",
        description:
            "Po wygenerowaniu grafiku możesz go ręcznie skorygować — a system na bieżąco waliduje zmiany i informuje o ewentualnych naruszeniach. Każda poprawka jest natychmiast weryfikowana.",
        details: [
            "Walidacja w czasie rzeczywistym",
            "Sugestie alternatywnych zmian",
            "Wykrywanie konfliktów na żywo",
            "Zapis historii zmian",
        ],
        color: "amber",
    },
];

const colorClasses: Record<
    string,
    { bg: string; text: string; border: string; iconBg: string }
> = {
    blue: {
        bg: "bg-blue-50",
        text: "text-blue-700",
        border: "border-blue-200",
        iconBg: "bg-blue-100 text-blue-600",
    },
    emerald: {
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        border: "border-emerald-200",
        iconBg: "bg-emerald-100 text-emerald-600",
    },
    violet: {
        bg: "bg-violet-50",
        text: "text-violet-700",
        border: "border-violet-200",
        iconBg: "bg-violet-100 text-violet-600",
    },
    amber: {
        bg: "bg-amber-50",
        text: "text-amber-700",
        border: "border-amber-200",
        iconBg: "bg-amber-100 text-amber-600",
    },
};

export function HowAIWorksSection() {
    return (
        <section className="py-16 sm:py-24 bg-white" id="jak-dziala-ai">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center mb-12 sm:mb-16 animate-fade-in-up">
                    <Badge className="mb-4 bg-violet-500/10 text-violet-700 border-violet-200/50">
                        <Brain className="w-4 h-4 mr-2" />
                        Jak działa generator AI
                    </Badge>
                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                        Inteligentne układanie grafiku pracy
                    </h2>
                    <p className="text-base sm:text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
                        Nasz algorytm AI analizuje dziesiątki zmiennych
                        jednocześnie — dostępność pracowników, przepisy prawa,
                        preferencje i historię — aby w{"\u00A0"}kilka sekund
                        stworzyć optymalny harmonogram.
                    </p>
                </div>

                {/* Key metrics bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto mb-12 sm:mb-16">
                    {[
                        {
                            icon: Clock,
                            value: "~2s",
                            label: "czas generowania",
                        },
                        {
                            icon: Users,
                            value: "200+",
                            label: "pracowników naraz",
                        },
                        {
                            icon: ShieldCheck,
                            value: "100%",
                            label: "zgodność z KP",
                        },
                        { icon: BarChart3, value: "90%", label: "mniej czasu" },
                    ].map((metric) => (
                        <div
                            key={metric.label}
                            className="text-center p-3 sm:p-4 rounded-xl bg-slate-50 border border-slate-100"
                        >
                            <metric.icon className="w-5 h-5 text-blue-600 mx-auto mb-2" />
                            <div className="text-xl sm:text-2xl font-bold text-gray-900">
                                {metric.value}
                            </div>
                            <div className="text-xs text-gray-500">
                                {metric.label}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Algorithm steps */}
                <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8 stagger-children">
                    {algorithmSteps.map((step, index) => {
                        const colors = colorClasses[step.color];
                        return (
                            <div
                                key={step.title}
                                className={`relative rounded-2xl border ${colors.border} ${colors.bg} p-5 sm:p-8 transition-shadow hover:shadow-lg`}
                            >
                                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                                    {/* Step number + icon */}
                                    <div className="flex sm:flex-col items-center sm:items-start gap-3 sm:gap-2 shrink-0">
                                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                            Krok {index + 1}
                                        </div>
                                        <div
                                            className={`w-12 h-12 rounded-xl ${colors.iconBg} flex items-center justify-center`}
                                        >
                                            <step.icon className="w-6 h-6" />
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                                            {step.title}
                                        </h3>
                                        <p className="text-sm sm:text-base text-gray-600 leading-relaxed mb-4">
                                            {step.description}
                                        </p>

                                        {/* Detail chips */}
                                        <div className="flex flex-wrap gap-2">
                                            {step.details.map((detail) => (
                                                <div
                                                    key={detail}
                                                    className="flex items-center gap-1.5 text-xs sm:text-sm bg-white/80 border border-white rounded-lg px-3 py-1.5 text-gray-700"
                                                >
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                                    {detail}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Connector arrow */}
                                {index < algorithmSteps.length - 1 && (
                                    <div className="hidden sm:flex absolute -bottom-5 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-white border border-gray-200 shadow-sm items-center justify-center z-10">
                                        <ArrowRight className="w-4 h-4 text-gray-400 rotate-90" />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Bottom summary */}
                <div className="mt-12 sm:mt-16 max-w-3xl mx-auto text-center">
                    <div className="bg-linear-to-r from-blue-50 via-violet-50 to-emerald-50 rounded-2xl p-6 sm:p-8 border border-blue-100">
                        <Sparkles className="w-8 h-8 text-blue-600 mx-auto mb-4" />
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                            Rezultat? Optymalny grafik w kilka sekund.
                        </h3>
                        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                            Zamiast spędzać godziny na ręcznym układaniu,
                            kliknij jeden przycisk. Algorytm przeanalizuje
                            wszystkie zmienne i zaproponuje najlepszy możliwy
                            harmonogram — zgodny z prawem, sprawiedliwy i
                            optymalny kosztowo.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
