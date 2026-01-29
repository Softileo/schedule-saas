"use client";
import { useState, useEffect, useRef, startTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    ArrowRight,
    Play,
    Sparkles,
    Check,
    Calendar,
    Users,
    Zap,
    Clock,
    X,
    Flag,
    Settings,
    UserX,
    FileDown,
    Trash2,
    AlertTriangle,
    AlertCircle,
} from "lucide-react";
import { ROUTES } from "@/lib/constants/routes";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

// Dane grafiku - identyczne jak w prawdziwej aplikacji (tylko dane, bez state'u)
const employees = [
    {
        name: "Anna Kowalska",
        initials: "AK",
        color: "#3b82f6",
        scheduled: 40,
        required: 40,
    }, // Dokładnie - zielony
    {
        name: "Tomasz Nowak",
        initials: "TN",
        color: "#10b981",
        scheduled: 40,
        required: 40,
    }, // Nadgodziny - pomarańczowy
    {
        name: "Magda Wisniewska",
        initials: "MW",
        color: "#8b5cf6",
        scheduled: 40,
        required: 40,
    }, // Naruszenie - czerwony
    {
        name: "Piotr Zielinski",
        initials: "PZ",
        color: "#f59e0b",
        scheduled: 24,
        required: 40,
    }, // Za mało - szary
    {
        name: "Kasia Dabrowska",
        initials: "KD",
        color: "#ec4899",
        scheduled: 16,
        required: 40,
    }, // Dokładnie z nieobecnością
];

const days = DAY_NAMES;
const dayNumbers = [6, 7, 8, 9, 10, 11, 12];

// Nieobecności
const initialAbsences = [
    {
        emp: 4, // Kasia
        day: 2, // Środa (ma zmianę ale jest nieobecna - L4)
        type: "sick_leave",
        label: "L4",
    },
];

// Kolory typów zmian
const SHIFT_COLORS = {
    morning: "#3b82f6", // blue-500
    afternoon: "#32a850", // green-600
    evening: "#8b5cf6", // violet-500
    custom: "#ef4444", // red-500
};

// Initial shifts state - rozsypane zmiany różnych typów
const initialShifts = [
    // Anna - mix zmian rannych i popołudniowych (40h)
    {
        emp: 0,
        days: [0, 5],
        time: "06:00-14:00",
        type: "morning",
        color: SHIFT_COLORS.morning,
    },
    {
        emp: 0,
        days: [4],
        time: "10:00-18:00",
        type: "afternoon",
        color: SHIFT_COLORS.afternoon,
    },
    {
        emp: 0,
        days: [1, 3],
        time: "14:00-22:00",
        type: "evening",
        color: SHIFT_COLORS.evening,
    },

    // Tomek - głównie własne godziny + 1 ranna (40h)
    {
        emp: 1,
        days: [0, 2, 4],
        time: "10:00-18:00",
        type: "afternoon",
        color: SHIFT_COLORS.afternoon,
    },
    {
        emp: 1,
        days: [1],
        time: "06:00-14:00",
        type: "morning",
        color: SHIFT_COLORS.morning,
    },
    {
        emp: 1,
        days: [3],
        time: "14:00-22:00",
        type: "evening",
        color: SHIFT_COLORS.evening,
    },

    // Magda - NARUSZENIA! (brak odpoczynku między zmianami)
    {
        emp: 2,
        days: [0],
        time: "14:00-22:00",
        type: "evening",
        color: SHIFT_COLORS.evening,
    },
    {
        emp: 2,
        days: [2],
        time: "14:00-22:00",
        type: "evening",
        color: SHIFT_COLORS.evening,
    },
    {
        emp: 2,
        days: [3],
        time: "06:00-14:00",
        type: "morning",
        color: SHIFT_COLORS.morning,
    },
    {
        emp: 2,
        days: [4, 6],
        time: "10:00-18:00",
        type: "afternoon",
        color: SHIFT_COLORS.afternoon,
    },

    // Piotr - za mało godzin (24h) - mix
    {
        emp: 3,
        days: [0],
        time: "06:00-14:00",
        type: "morning",
        color: SHIFT_COLORS.morning,
    },
    {
        emp: 3,
        days: [1],
        time: "14:00-22:00",
        type: "evening",
        color: SHIFT_COLORS.evening,
    },
    {
        emp: 3,
        days: [5],
        time: "10:00-18:00",
        type: "afternoon",
        color: SHIFT_COLORS.afternoon,
    },

    // Kasia - nieobecność na środę (L4) - mix zmian
    {
        emp: 4,
        days: [0],
        time: "06:00-14:00",
        type: "morning",
        color: SHIFT_COLORS.morning,
    },
    {
        emp: 4,
        days: [1, 3],
        time: "14:00-22:00",
        type: "evening",
        color: SHIFT_COLORS.evening,
    },
];

interface DemoShift {
    emp: number;
    days: number[];
    time: string;
    type: string;
    color: string;
}

interface DemoAbsence {
    emp: number;
    day: number;
    type: string;
    label: string;
}

import { BackgroundEffects } from "@/components/ui/background-effects";
import { cn } from "@/lib/utils";
import { DAY_NAMES } from "@/lib/utils/date-helpers";

export function HeroSection() {
    const [demoShifts, setDemoShifts] = useState<DemoShift[]>(initialShifts);
    const [demoAbsences, setDemoAbsences] =
        useState<DemoAbsence[]>(initialAbsences);
    const [selectedCell, setSelectedCell] = useState<{
        empIdx: number;
        dayIdx: number;
        rect: DOMRect;
    } | null>(null);

    // Stan dla panelu wyboru zmian - identyczny jak TemplateSelector
    const [showCustomForm, setShowCustomForm] = useState(false);
    const [customStartTime, setCustomStartTime] = useState("09:00");
    const [customEndTime, setCustomEndTime] = useState("17:00");
    const [customBreakMinutes, setCustomBreakMinutes] = useState(0);
    const [panelCoords, setPanelCoords] = useState<{
        top: number;
        left: number;
    } | null>(null);
    const selectorRef = useRef<HTMLDivElement>(null);

    // Funkcja do sprawdzenia czy pracownik ma zmiane w danym dniu
    function getShiftsForCell(empIndex: number, dayIndex: number) {
        return demoShifts.filter(
            (s) => s.emp === empIndex && s.days.includes(dayIndex),
        );
    }

    // Reset formularza i pozycji przy zmianie komórki
    useEffect(() => {
        if (!selectedCell) {
            startTransition(() => {
                setShowCustomForm(false);
                setPanelCoords(null);
            });
            return;
        }

        // Reset custom form values when cell changes
        const cellShifts = demoShifts.filter(
            (s) =>
                s.emp === selectedCell.empIdx &&
                s.days.includes(selectedCell.dayIdx),
        );
        startTransition(() => {
            if (cellShifts.length > 0) {
                const [start, end] = cellShifts[0].time.split("-");
                setCustomStartTime(start);
                setCustomEndTime(end);
            } else {
                setCustomStartTime("09:00");
                setCustomEndTime("17:00");
            }
            setCustomBreakMinutes(0);
            setShowCustomForm(false);
        });
    }, [selectedCell, demoShifts]);

    // Obliczanie pozycji panelu - identyczne jak w TemplateSelector
    useEffect(() => {
        if (!selectedCell?.rect || !selectorRef.current) return;

        const cellRect = selectedCell.rect;
        const selectorHeight = selectorRef.current.offsetHeight;
        const selectorWidth = selectorRef.current.offsetWidth;

        let top: number;
        let left: number;

        // Domyślnie na dole
        top = cellRect.bottom + 8;
        // Jeśli wykracza poza dół ekranu, pokaż na górze
        if (top + selectorHeight > window.innerHeight - 10) {
            top = cellRect.top - selectorHeight - 8;
        }
        // Jeśli wykracza poza górę ekranu, pokaż na dole
        if (top < 10) {
            top = cellRect.bottom + 8;
        }

        // Pozycjonowanie w poziomie (wycentrowane względem komórki)
        left = cellRect.left + cellRect.width / 2 - selectorWidth / 2;

        // Upewnij się, że nie wykracza poza ekran
        if (left < 10) left = 10;
        if (left + selectorWidth > window.innerWidth - 10) {
            left = window.innerWidth - selectorWidth - 10;
        }

        if (
            !panelCoords ||
            panelCoords.top !== top ||
            panelCoords.left !== left
        ) {
            setTimeout(() => {
                setPanelCoords({ top, left });
            }, 0);
        }
    }, [selectedCell?.rect, panelCoords]);

    // Funkcja do sprawdzenia nieobecności
    function getAbsenceForCell(empIndex: number, dayIndex: number) {
        return demoAbsences.find(
            (a) => a.emp === empIndex && a.day === dayIndex,
        );
    }

    // Funkcja do obliczania naruszeń dla pracownika
    function calculateViolations(empIdx: number) {
        const employeeShifts = demoShifts.filter((s) => s.emp === empIdx);
        const violations: {
            type: string;
            description: string;
            details?: string;
        }[] = [];

        // Zlicz godziny
        const totalHours = employeeShifts.reduce(
            (total, shift) => total + shift.days.length * 8,
            0,
        );

        // Naruszenie 1: Przekroczenie tygodniowej normy (>48h)
        if (totalHours > 48) {
            violations.push({
                type: "weekly_limit",
                description: "Przekroczenie tygodniowej normy czasu pracy",
                details: `${totalHours}h zaplanowane, maksymalnie 48h`,
            });
        }

        // Naruszenie 2: Brak odpoczynku dobowego (mniej niż 11h między zmianami)
        // Sortujemy zmiany chronologicznie
        const sortedShifts: {
            day: number;
            endHour: number;
            startHour: number;
        }[] = [];
        employeeShifts.forEach((shift) => {
            shift.days.forEach((dayIdx) => {
                const [start, end] = shift.time.split("-");
                const startHour = parseInt(start.split(":")[0]);
                const endHour = parseInt(end.split(":")[0]);
                sortedShifts.push({ day: dayIdx, startHour, endHour });
            });
        });
        sortedShifts.sort((a, b) => {
            if (a.day !== b.day) return a.day - b.day;
            return a.startHour - b.startHour;
        });

        // Sprawdź przerwy między kolejnymi zmianami
        for (let i = 0; i < sortedShifts.length - 1; i++) {
            const current = sortedShifts[i];
            const next = sortedShifts[i + 1];

            // Sprawdź tylko między kolejnymi dniami lub tego samego dnia
            const dayDiff = next.day - current.day;
            if (dayDiff === 0) {
                // Ten sam dzień - sprawdź przerwę między zmianami
                const restHours = next.startHour - current.endHour;
                if (restHours < 11 && restHours >= 0) {
                    violations.push({
                        type: "insufficient_rest",
                        description: "Brak odpoczynku dobowego",
                        details: `${
                            days[current.day]
                        }: tylko ${restHours}h przerwy (min. 11h)`,
                    });
                }
            } else if (dayDiff === 1) {
                // Kolejny dzień
                const restHours = 24 - current.endHour + next.startHour;
                if (restHours < 11) {
                    violations.push({
                        type: "insufficient_rest",
                        description: "Brak odpoczynku dobowego",
                        details: `${days[current.day]}-${
                            days[next.day]
                        }: tylko ${restHours}h przerwy (min. 11h)`,
                    });
                }
            }
        }

        return violations;
    }

    // Funkcja do sprawdzenia czy konkretna komórka ma naruszenie
    function cellHasViolation(empIdx: number, dayIdx: number) {
        const violations = calculateViolations(empIdx);

        // Sprawdź czy którekolwiek naruszenie odnosi się do tego dnia
        return violations.some((v) => {
            if (v.details) {
                const dayName = days[dayIdx];
                return v.details.includes(dayName);
            }
            return false;
        });
    }

    // Funkcja do pobrania naruszeń dla konkretnej komórki
    function getViolationsForCell(empIdx: number, dayIdx: number) {
        const violations = calculateViolations(empIdx);
        const dayName = days[dayIdx];

        return violations.filter((v) => {
            if (v.details) {
                return v.details.includes(dayName);
            }
            return false;
        });
    }

    const handleAddShift = (time: string, type: string, color?: string) => {
        if (!selectedCell) return;

        // Użyj koloru typu zmiany zamiast koloru pracownika
        const shiftColor =
            color ||
            SHIFT_COLORS[type as keyof typeof SHIFT_COLORS] ||
            SHIFT_COLORS.custom;

        // Usuń istniejące zmiany z tego dnia dla tego pracownika
        const filteredShifts = demoShifts.filter(
            (s) =>
                !(
                    s.emp === selectedCell.empIdx &&
                    s.days.includes(selectedCell.dayIdx)
                ),
        );

        const newShift = {
            emp: selectedCell.empIdx,
            days: [selectedCell.dayIdx],
            time,
            type,
            color: shiftColor,
        };

        setDemoShifts([...filteredShifts, newShift]);
        setSelectedCell(null);
    };

    const handleCustomSubmit = () => {
        if (customStartTime && customEndTime) {
            handleAddShift(`${customStartTime}-${customEndTime}`, "custom");
            setShowCustomForm(false);
        }
    };

    const handleDeleteShift = (shiftIndex?: number) => {
        if (!selectedCell) return;

        if (shiftIndex !== undefined) {
            // Usuń konkretny dzień z konkretnej zmiany
            const cellShifts = getShiftsForCell(
                selectedCell.empIdx,
                selectedCell.dayIdx,
            );
            const shiftToModify = cellShifts[shiftIndex];

            setDemoShifts((prev) =>
                prev
                    .map((s) => {
                        // Jeśli to ta zmiana, usuń z niej ten konkretny dzień
                        if (s === shiftToModify) {
                            return {
                                ...s,
                                days: s.days.filter(
                                    (d) => d !== selectedCell.dayIdx,
                                ),
                            };
                        }
                        return s;
                    })
                    // Usuń zmiany, które nie mają już żadnych dni
                    .filter((s) => s.days.length > 0),
            );
        } else {
            // Usuń wszystkie zmiany z tego dnia (fallback)
            setDemoShifts((prev) =>
                prev
                    .map((s) => {
                        // Jeśli zmiana dotyczy tego pracownika i ma ten dzień
                        if (
                            s.emp === selectedCell.empIdx &&
                            s.days.includes(selectedCell.dayIdx)
                        ) {
                            return {
                                ...s,
                                days: s.days.filter(
                                    (d) => d !== selectedCell.dayIdx,
                                ),
                            };
                        }
                        return s;
                    })
                    .filter((s) => s.days.length > 0),
            );
        }
        setSelectedCell(null);
    };

    const currentCellShifts = selectedCell
        ? getShiftsForCell(selectedCell.empIdx, selectedCell.dayIdx)
        : [];

    return (
        <section
            className="relative min-h-screen overflow-hidden bg-linear-to-b from-slate-50 via-white to-slate-50/50"
            onClick={() => setSelectedCell(null)}
        >
            <BackgroundEffects />

            <div className="container relative mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 lg:pt-32">
                <div className="max-w-6xl mx-auto">
                    {/* Badge */}
                    <div className="flex justify-center mb-8 animate-fade-in-up">
                        <Badge className="px-4 py-2 text-sm font-medium bg-blue-500/10 text-blue-700 border-blue-200/50 hover:bg-blue-500/20 transition-colors">
                            <Sparkles className="w-4 h-4 mr-2" />
                            Oszczedz 90% czasu z AI
                        </Badge>
                    </div>

                    {/* Headline */}
                    <div className="text-center mb-8 animate-fade-in-up animate-delay-100">
                        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-gray-900 leading-[1.1]">
                            Grafik pracy
                            <br />
                            <span className="bg-linear-to-r from-blue-600 via-blue-500 to-violet-500 bg-clip-text text-transparent">
                                gotowy w sekunde
                            </span>
                        </h1>
                    </div>

                    {/* Subheadline */}
                    <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto text-center mb-10 leading-relaxed animate-fade-in-up animate-delay-200">
                        Jeden klik. Algorytm AI tworzy optymalny grafik
                        <br className="hidden sm:block" />
                        zgodny z Kodeksem Pracy. Bez stresu, bez bledow.
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8 animate-fade-in-up animate-delay-300">
                        <Button
                            asChild
                            size="lg"
                            className="h-12 px-8 text-base font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5 w-3/4 sm:w-auto"
                        >
                            <Link href={ROUTES.REJESTRACJA}>
                                Rozpocznij za darmo
                                <ArrowRight className="ml-2 w-5 h-5" />
                            </Link>
                        </Button>
                        <Button
                            variant="outline"
                            size="lg"
                            className="h-12 px-8 text-base font-medium border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl w-3/4 sm:w-auto"
                            onClick={() => {
                                const demoEl = document.getElementById("demo");
                                if (demoEl) {
                                    const rect = demoEl.getBoundingClientRect();
                                    const scrollTop =
                                        window.pageYOffset +
                                        rect.top +
                                        rect.height / 2 -
                                        window.innerHeight / 2;
                                    window.scrollTo({
                                        top: scrollTop,
                                        behavior: "smooth",
                                    });
                                }
                            }}
                        >
                            <Play className="mr-2 w-5 h-5 fill-current" />
                            Zobacz demo
                        </Button>
                    </div>

                    {/* Trust badges */}
                    <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-gray-500 mb-16 animate-fade-in animate-delay-400">
                        {[
                            "Darmowy grafik AI",
                            "Bez karty kredytowej",
                            "Polskie prawo pracy",
                        ].map((text) => (
                            <div key={text} className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-emerald-500" />
                                <span>{text}</span>
                            </div>
                        ))}
                    </div>

                    {/* Schedule Preview - IDENTYCZNY jak compact view */}
                    <div
                        id="demo"
                        className="relative mx-auto max-w-5xl animate-scale-in animate-delay-500"
                    >
                        {/* Floating elements */}
                        <div
                            className="
                        absolute -right-24 z-10 top-42 hidden lg:block animate-fade-in-right animate-delay-1200"
                        >
                            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                                        <Zap className="w-5 h-5 text-emerald-600" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-semibold text-gray-900">
                                            Wygenerowano!
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            w 2.3 sekundy
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="absolute -left-32 top-32 hidden lg:block animate-fade-in-left animate-delay-1000">
                            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                        <Users className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-semibold text-gray-900">
                                            5 pracownikow
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            160h zaplanowane
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Browser mockup */}
                        <div className="bg-white rounded-2xl shadow-2xl shadow-gray-200/50 border border-gray-200/60 overflow-hidden">
                            {/* Browser bar */}
                            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
                                <div className="flex gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-red-400" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                                    <div className="w-3 h-3 rounded-full bg-green-400" />
                                </div>
                                <div className="flex-1 flex justify-center">
                                    <div className="flex items-center gap-2 px-4 py-1.5 bg-white rounded-lg border border-gray-200 text-sm text-gray-500">
                                        <Calendar className="w-4 h-4" />
                                        calenda.pl
                                    </div>
                                </div>
                            </div>

                            {/* Schedule Content - jak compact-view */}
                            <div className="p-4 sm:p-6 bg-linear-to-b from-slate-50/50 to-white">
                                {/* Header with month and action toolbar */}
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-lg font-semibold text-gray-900">
                                            Styczen 2026
                                        </h3>
                                        <Badge
                                            variant="secondary"
                                            className="bg-emerald-50 text-emerald-700 border-emerald-100"
                                        >
                                            DEMO
                                        </Badge>
                                    </div>

                                    {/* Demo Action Toolbar */}
                                    <div className="hidden lg:flex items-center gap-2 bg-white/95 border border-slate-200 rounded-xl p-1.5">
                                        <TooltipProvider delayDuration={0}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0"
                                                    >
                                                        <Settings className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="bottom">
                                                    Zarządzaj zmianami
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                        <TooltipProvider delayDuration={0}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0"
                                                    >
                                                        <UserX className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="bottom">
                                                    Dodaj nieobecność
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                        <TooltipProvider delayDuration={0}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0"
                                                    >
                                                        <FileDown className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="bottom">
                                                    Eksportuj PDF
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                        <div className="relative animate-pulse">
                                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-violet-500 text-white text-[9px] font-semibold px-2 py-1 rounded-full shadow-lg whitespace-nowrap  z-10">
                                                <div className="absolute  -bottom-1 left-1/2 -translate-x-1/2 h-2 w-2 rotate-45 bg-violet-500" />
                                                Generowanie AI
                                            </div>
                                            <TooltipProvider delayDuration={0}>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0 relative"
                                                        >
                                                            <Sparkles className="h-4 w-4 text-violet-600" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="bottom">
                                                        Generuj grafik AI
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </div>
                                        <TooltipProvider delayDuration={0}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="bottom">
                                                    Wyczyść grafik
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                </div>

                                {/* Calendar grid - identyczny jak schedule hero view */}
                                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs w-full overflow-x-auto">
                                    <div className="min-w-200">
                                        {/* Day headers */}
                                        <div className="grid grid-cols-[180px_repeat(7,1fr)] h-14 bg-linear-to-b from-slate-50 to-slate-100/50 border-b border-slate-200/80">
                                            <div className="flex flex-col items-center justify-center border-r border-slate-200/80 p-2">
                                                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                                    Pracownik
                                                </span>
                                            </div>
                                            {days.map((day, idx) => (
                                                <div
                                                    key={day}
                                                    className={`flex flex-col items-center justify-center text-center relative ${
                                                        idx < 6
                                                            ? "border-r border-slate-200/80"
                                                            : ""
                                                    } ${
                                                        idx >= 5
                                                            ? "bg-linear-to-b from-slate-50 to-slate-100/50"
                                                            : ""
                                                    }`}
                                                >
                                                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                                        {day}
                                                    </div>
                                                    <div className="text-sm font-bold text-slate-800">
                                                        {dayNumbers[idx]}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Employee rows - IDENTYCZNE jak w schedule-hero-view.tsx */}
                                        {employees.map((emp, empIdx) => {
                                            // Zliczanie godzin tylko z aktualnych zmian
                                            const employeeShifts =
                                                demoShifts.filter(
                                                    (s) => s.emp === empIdx,
                                                );
                                            // Każda zmiana to 8 godzin (06-14 lub 14-22)
                                            const currentHours =
                                                employeeShifts.reduce(
                                                    (total, shift) => {
                                                        return (
                                                            total +
                                                            shift.days.length *
                                                                8
                                                        );
                                                    },
                                                    0,
                                                );

                                            // Status kolorów jak w oryginalnym komponencie
                                            const required = emp.required;
                                            const isExact =
                                                Math.abs(
                                                    currentHours - required,
                                                ) <= 2;
                                            const hasSignificantOvertime =
                                                currentHours > required + 2;

                                            // Dynamiczne obliczanie naruszeń
                                            const violations =
                                                calculateViolations(empIdx);
                                            const hasViolations =
                                                violations.length > 0;

                                            // Statystyki zmian po typach
                                            const shiftStats: {
                                                type: string;
                                                count: number;
                                                color: string;
                                            }[] = [];
                                            const typeCounts: {
                                                [key: string]: number;
                                            } = {};
                                            employeeShifts.forEach((shift) => {
                                                typeCounts[shift.type] =
                                                    (typeCounts[shift.type] ||
                                                        0) + shift.days.length;
                                            });
                                            // Konwersja na array z kolorami
                                            if (typeCounts["morning"]) {
                                                shiftStats.push({
                                                    type: "morning",
                                                    count: typeCounts[
                                                        "morning"
                                                    ],
                                                    color: "#3b82f6",
                                                });
                                            }
                                            if (typeCounts["afternoon"]) {
                                                shiftStats.push({
                                                    type: "afternoon",
                                                    count: typeCounts[
                                                        "afternoon"
                                                    ],
                                                    color: "#32a850",
                                                });
                                            }
                                            if (typeCounts["evening"]) {
                                                shiftStats.push({
                                                    type: "evening",
                                                    count: typeCounts[
                                                        "evening"
                                                    ],
                                                    color: "#8b5cf6",
                                                });
                                            }
                                            if (typeCounts["custom"]) {
                                                shiftStats.push({
                                                    type: "custom",
                                                    count: typeCounts["custom"],
                                                    color: "#ef4444",
                                                });
                                            }

                                            // Klasy dla wiersza - IDENTYCZNE jak w employee-row.tsx
                                            const rowBgClass = hasViolations
                                                ? "bg-red-50/80 border-l-red-500"
                                                : hasSignificantOvertime
                                                  ? "bg-amber-50/50 border-l-amber-400"
                                                  : isExact
                                                    ? "bg-emerald-50/50 border-l-emerald-400"
                                                    : "bg-white border-l-transparent hover:bg-slate-50/50";

                                            const hoursColor = hasViolations
                                                ? "text-red-600"
                                                : hasSignificantOvertime
                                                  ? "text-amber-600"
                                                  : isExact
                                                    ? "text-emerald-600"
                                                    : "text-slate-400";

                                            return (
                                                <div
                                                    key={emp.name}
                                                    className={`grid grid-cols-[180px_repeat(7,1fr)] min-h-20 transition-colors ${
                                                        empIdx <
                                                        employees.length - 1
                                                            ? "border-b border-slate-200/80"
                                                            : ""
                                                    }`}
                                                >
                                                    {/* Employee cell - Kopia stylu z EmployeeRowMemo */}
                                                    <div
                                                        className={`px-2.5 py-3 border-r border-slate-200/80 flex items-center gap-2.5 transition-colors border-l-4 ${rowBgClass}`}
                                                    >
                                                        <div
                                                            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shadow-sm shrink-0"
                                                            style={{
                                                                backgroundColor:
                                                                    emp.color,
                                                            }}
                                                        >
                                                            {emp.initials}
                                                        </div>
                                                        <div className="min-w-0 flex flex-1 flex-col justify-start items-start gap-0.5">
                                                            {/* Linia 1: Imię + Ikony */}
                                                            <div className="flex items-center w-full">
                                                                <span className="text-xs font-semibold text-slate-700 truncate leading-tight">
                                                                    {emp.name}
                                                                </span>
                                                                {hasViolations && (
                                                                    <TooltipProvider
                                                                        delayDuration={
                                                                            0
                                                                        }
                                                                    >
                                                                        <Tooltip>
                                                                            <TooltipTrigger
                                                                                asChild
                                                                            >
                                                                                <div className="cursor-help shrink-0 ml-1">
                                                                                    <AlertTriangle className="h-3 w-3 text-red-500" />
                                                                                </div>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent
                                                                                side="right"
                                                                                align="start"
                                                                                className="bg-white border-red-200 max-w-70 p-0 overflow-hidden shadow-xl z-50"
                                                                            >
                                                                                <div className="bg-red-50/80 px-3 py-2 border-b border-red-100 flex items-center gap-2">
                                                                                    <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                                                                                    <span className="text-xs font-bold text-red-900">
                                                                                        Wykryto
                                                                                        naruszenia
                                                                                        (
                                                                                        {
                                                                                            violations.length
                                                                                        }

                                                                                        )
                                                                                    </span>
                                                                                </div>
                                                                                <div className="p-2.5 space-y-2.5 bg-white">
                                                                                    {violations.map(
                                                                                        (
                                                                                            v,
                                                                                            i,
                                                                                        ) => (
                                                                                            <div
                                                                                                key={
                                                                                                    i
                                                                                                }
                                                                                                className="flex gap-2 items-start"
                                                                                            >
                                                                                                <div className="w-1 h-1 rounded-full bg-red-400 mt-1.5 shrink-0" />
                                                                                                <div className="text-xs space-y-0.5">
                                                                                                    <div className="font-semibold text-slate-800 leading-tight">
                                                                                                        {
                                                                                                            v.description
                                                                                                        }
                                                                                                    </div>
                                                                                                    {v.details && (
                                                                                                        <div className="text-slate-500 leading-tight">
                                                                                                            {
                                                                                                                v.details
                                                                                                            }
                                                                                                        </div>
                                                                                                    )}
                                                                                                </div>
                                                                                            </div>
                                                                                        ),
                                                                                    )}
                                                                                </div>
                                                                            </TooltipContent>
                                                                        </Tooltip>
                                                                    </TooltipProvider>
                                                                )}
                                                            </div>
                                                            {/* Linia 2: Godziny */}
                                                            <div className="w-full -mt-2">
                                                                <span
                                                                    className={`text-[10px] font-medium tabular-nums ${hoursColor}`}
                                                                >
                                                                    {
                                                                        currentHours
                                                                    }
                                                                    /{required}h
                                                                    {empIdx ===
                                                                        4 && (
                                                                        <span className="text-amber-600 ml-0.5">
                                                                            +L4
                                                                        </span>
                                                                    )}
                                                                </span>
                                                            </div>
                                                            {/* Linia 3: Statystyki zmian (pigułki) */}
                                                            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar w-full">
                                                                {shiftStats.map(
                                                                    (
                                                                        stat,
                                                                        idx,
                                                                    ) => (
                                                                        <span
                                                                            key={
                                                                                idx
                                                                            }
                                                                            className="text-[9px] font-bold px-1 rounded-[3px] leading-none py-0.5 whitespace-nowrap shrink-0"
                                                                            style={{
                                                                                backgroundColor: `${stat.color}15`,
                                                                                color: stat.color,
                                                                                border: `1px solid ${stat.color}40`,
                                                                            }}
                                                                        >
                                                                            {
                                                                                stat.count
                                                                            }
                                                                        </span>
                                                                    ),
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Day cells - IDENTYCZNE jak HeroDayCell */}
                                                    {days.map((_, dayIdx) => {
                                                        const cellShifts =
                                                            getShiftsForCell(
                                                                empIdx,
                                                                dayIdx,
                                                            );
                                                        const absence =
                                                            getAbsenceForCell(
                                                                empIdx,
                                                                dayIdx,
                                                            );
                                                        const hasViolation =
                                                            cellHasViolation(
                                                                empIdx,
                                                                dayIdx,
                                                            );
                                                        const isSelected =
                                                            selectedCell?.empIdx ===
                                                                empIdx &&
                                                            selectedCell?.dayIdx ===
                                                                dayIdx;

                                                        return (
                                                            <div
                                                                key={dayIdx}
                                                                className={`relative overflow-visible min-h-20 p-1.5 group/cell flex items-center justify-center ${
                                                                    dayIdx < 6
                                                                        ? "border-r border-slate-200/80"
                                                                        : ""
                                                                } ${
                                                                    dayIdx >= 5
                                                                        ? "bg-slate-50/30"
                                                                        : "bg-white"
                                                                } ${
                                                                    hasViolation &&
                                                                    !absence
                                                                        ? "bg-red-50/60"
                                                                        : ""
                                                                } ${
                                                                    absence
                                                                        ? "bg-amber-50/80"
                                                                        : ""
                                                                } ${
                                                                    isSelected
                                                                        ? "ring-2 ring-blue-400 ring-inset bg-blue-50 z-10"
                                                                        : ""
                                                                }`}
                                                                onClick={(
                                                                    e,
                                                                ) => {
                                                                    e.stopPropagation();
                                                                    setSelectedCell(
                                                                        {
                                                                            empIdx,
                                                                            dayIdx,
                                                                            rect: e.currentTarget.getBoundingClientRect(),
                                                                        },
                                                                    );
                                                                }}
                                                            >
                                                                {/* Nieobecność - identyczny styl jak w HeroDayCell */}
                                                                {absence && (
                                                                    <div className="w-full h-full rounded-lg flex items-center justify-center gap-0.5 bg-amber-100/80 border-amber-300/50 border">
                                                                        <Flag className="w-2.5 h-2.5 text-amber-600" />
                                                                        <span className="text-[10px] font-bold text-amber-600">
                                                                            {
                                                                                absence.label
                                                                            }
                                                                        </span>
                                                                    </div>
                                                                )}
                                                                {!absence &&
                                                                    cellShifts.map(
                                                                        (
                                                                            shift,
                                                                            sIdx,
                                                                        ) => {
                                                                            // Różne style dla różnych typów zmian

                                                                            const [
                                                                                startTime,
                                                                                endTime,
                                                                            ] =
                                                                                shift.time.split(
                                                                                    "-",
                                                                                );

                                                                            const empData =
                                                                                employees[
                                                                                    shift
                                                                                        .emp
                                                                                ];

                                                                            // Użyj koloru zmiany
                                                                            const shiftColor =
                                                                                shift.color ||
                                                                                empData.color;

                                                                            // Pobierz naruszenia dla tej komórki
                                                                            const cellViolations =
                                                                                getViolationsForCell(
                                                                                    empIdx,
                                                                                    dayIdx,
                                                                                );

                                                                            const shiftButton =
                                                                                (
                                                                                    <button
                                                                                        key={
                                                                                            sIdx
                                                                                        }
                                                                                        className={`w-full h-full rounded-lg p-1 text-[10px] font-medium flex flex-col items-center justify-center border shadow-sm relative overflow-visible transition-transform duration-200 hover:scale-[1.02] cursor-pointer ${
                                                                                            hasViolation
                                                                                                ? "ring-2 ring-red-400 ring-offset-1"
                                                                                                : ""
                                                                                        }`}
                                                                                        style={{
                                                                                            backgroundColor: `${shiftColor}20`,
                                                                                            borderColor: `${shiftColor}40`,
                                                                                            color: shiftColor,
                                                                                        }}
                                                                                        onClick={(
                                                                                            e,
                                                                                        ) => {
                                                                                            e.stopPropagation();
                                                                                            setSelectedCell(
                                                                                                {
                                                                                                    empIdx,
                                                                                                    dayIdx,
                                                                                                    rect: e.currentTarget.getBoundingClientRect(),
                                                                                                },
                                                                                            );
                                                                                        }}
                                                                                    >
                                                                                        {hasViolation && (
                                                                                            <div className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[8px] font-bold w-4 h-4 flex items-center justify-center rounded-full shadow-lg z-30 animate-pulse">
                                                                                                !
                                                                                            </div>
                                                                                        )}
                                                                                        <span className="font-bold leading-none">
                                                                                            {
                                                                                                startTime
                                                                                            }
                                                                                        </span>
                                                                                        <span className="opacity-80 leading-none mt-0.5 text-[9px]">
                                                                                            {
                                                                                                endTime
                                                                                            }
                                                                                        </span>
                                                                                    </button>
                                                                                );

                                                                            // Jeśli ma naruszenie, opakuj w Tooltip
                                                                            if (
                                                                                hasViolation &&
                                                                                cellViolations.length >
                                                                                    0
                                                                            ) {
                                                                                return (
                                                                                    <TooltipProvider
                                                                                        key={
                                                                                            sIdx
                                                                                        }
                                                                                        delayDuration={
                                                                                            0
                                                                                        }
                                                                                    >
                                                                                        <Tooltip>
                                                                                            <TooltipTrigger
                                                                                                asChild
                                                                                            >
                                                                                                {
                                                                                                    shiftButton
                                                                                                }
                                                                                            </TooltipTrigger>
                                                                                            <TooltipContent
                                                                                                side="top"
                                                                                                className="bg-red-50 border-red-200 p-2 max-w-60 [&_[data-radix-popper-content-wrapper]]:bg-red-50"
                                                                                                style={{
                                                                                                    ["--tooltip-arrow-bg" as string]:
                                                                                                        "#fef2f2",
                                                                                                }}
                                                                                            >
                                                                                                <div className="space-y-1">
                                                                                                    {cellViolations.map(
                                                                                                        (
                                                                                                            v,
                                                                                                            vIdx,
                                                                                                        ) => (
                                                                                                            <div
                                                                                                                key={
                                                                                                                    vIdx
                                                                                                                }
                                                                                                                className="text-xs"
                                                                                                            >
                                                                                                                <div className="font-semibold text-red-700">
                                                                                                                    {
                                                                                                                        v.description
                                                                                                                    }
                                                                                                                </div>
                                                                                                                {v.details && (
                                                                                                                    <div className="text-red-600">
                                                                                                                        {
                                                                                                                            v.details
                                                                                                                        }
                                                                                                                    </div>
                                                                                                                )}
                                                                                                            </div>
                                                                                                        ),
                                                                                                    )}
                                                                                                </div>
                                                                                            </TooltipContent>
                                                                                        </Tooltip>
                                                                                    </TooltipProvider>
                                                                                );
                                                                            }

                                                                            return shiftButton;
                                                                        },
                                                                    )}
                                                                {!cellShifts.length &&
                                                                    !absence && (
                                                                        <div className="w-full min-h-[60px] flex items-center justify-center rounded-lg border-2 border-dashed border-slate-200/60 transition-all duration-200 group-hover/cell:border-blue-300 group-hover/cell:bg-blue-50/30 cursor-pointer">
                                                                            <span className="text-2xl leading-none text-slate-300 group-hover/cell:text-blue-400 transition-colors">
                                                                                +
                                                                            </span>
                                                                        </div>
                                                                    )}

                                                                {/* Panel zmian został przeniesiony na poziom główny komponentu (z-9999 fixed) */}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Footer stats */}
                                <div className="flex items-center gap-4 text-sm text-slate-600 mt-4 pt-4 border-t border-slate-100">
                                    <span>
                                        <strong className="text-slate-900">
                                            {demoShifts.reduce(
                                                (total, shift) =>
                                                    total + shift.days.length,
                                                0,
                                            )}
                                        </strong>{" "}
                                        zmian
                                    </span>
                                    <span>
                                        <strong className="text-slate-900">
                                            {demoShifts.reduce(
                                                (total, shift) =>
                                                    total +
                                                    shift.days.length * 8,
                                                0,
                                            )}
                                            h
                                        </strong>{" "}
                                        zaplanowane
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* Kliknięcie poza zamyka dropdown - identyczne jak w schedule-hero-view */}
            {selectedCell && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setSelectedCell(null)}
                />
            )}

            {/* Panel wyboru zmian - identyczny jak TemplateSelector */}
            {selectedCell && selectedCell.rect && (
                <div
                    ref={selectorRef}
                    className={cn(
                        "fixed z-9999 animate-in fade-in zoom-in-95 duration-200",
                        !panelCoords && "opacity-0 pointer-events-none",
                    )}
                    style={
                        panelCoords
                            ? {
                                  top: `${panelCoords.top}px`,
                                  left: `${panelCoords.left}px`,
                              }
                            : {
                                  top: selectedCell.rect.bottom + 8,
                                  left:
                                      selectedCell.rect.left +
                                      selectedCell.rect.width / 2,
                                  transform: "translateX(-50%)",
                              }
                    }
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="bg-white rounded-xl shadow-2xl border border-slate-200/80 p-2 min-w-40 backdrop-blur-sm">
                        {/* Panel dla nieobecności */}
                        {getAbsenceForCell(
                            selectedCell.empIdx,
                            selectedCell.dayIdx,
                        ) ? (
                            <>
                                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2 pb-1.5 mb-1.5 border-b border-slate-100">
                                    Nieobecność
                                </div>
                                <div className="px-2 py-2 mb-1.5">
                                    <div className="flex items-center gap-2 text-amber-700">
                                        <Flag className="w-4 h-4" />
                                        <span className="text-sm font-bold">
                                            {
                                                getAbsenceForCell(
                                                    selectedCell.empIdx,
                                                    selectedCell.dayIdx,
                                                )?.label
                                            }
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">
                                        {employees[selectedCell.empIdx].name}
                                    </p>
                                </div>
                                <div className="border-t border-slate-100 my-1.5" />
                                <button
                                    onClick={() => {
                                        setDemoAbsences((prev) =>
                                            prev.filter(
                                                (a) =>
                                                    !(
                                                        a.emp ===
                                                            selectedCell.empIdx &&
                                                        a.day ===
                                                            selectedCell.dayIdx
                                                    ),
                                            ),
                                        );
                                        setSelectedCell(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold text-red-500 hover:bg-red-50 hover:text-red-600 transition-all duration-150"
                                >
                                    <X className="w-3.5 h-3.5" />
                                    <span>Usuń nieobecność</span>
                                </button>
                            </>
                        ) : !showCustomForm ? (
                            <>
                                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2 pb-1.5 mb-1.5 border-b border-slate-100">
                                    Wybierz zmianę
                                </div>
                                <div className="space-y-0.5">
                                    <button
                                        onClick={() =>
                                            handleAddShift(
                                                "06:00-14:00",
                                                "morning",
                                            )
                                        }
                                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-semibold hover:bg-slate-50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 text-slate-700"
                                    >
                                        <div className="w-3.5 h-3.5 rounded-md shrink-0 shadow-sm bg-blue-500" />
                                        <span className="whitespace-nowrap">
                                            Ranna 06:00-14:00
                                        </span>
                                    </button>
                                    <button
                                        onClick={() =>
                                            handleAddShift(
                                                "10:00-18:00",
                                                "afternoon",
                                            )
                                        }
                                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-semibold hover:bg-slate-50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 text-slate-700"
                                    >
                                        <div className="w-3.5 h-3.5 rounded-md shrink-0 shadow-sm bg-green-500" />
                                        <span className="whitespace-nowrap">
                                            Dzienna 10:00-18:00
                                        </span>
                                    </button>
                                    <button
                                        onClick={() =>
                                            handleAddShift(
                                                "14:00-22:00",
                                                "evening",
                                            )
                                        }
                                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-semibold hover:bg-slate-50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 text-slate-700"
                                    >
                                        <div className="w-3.5 h-3.5 rounded-md shrink-0 shadow-sm bg-violet-500" />
                                        <span className="whitespace-nowrap">
                                            Wieczorna 14:00-22:00
                                        </span>
                                    </button>
                                </div>

                                <div className="border-t border-slate-100 my-1.5" />

                                <button
                                    onClick={() => setShowCustomForm(true)}
                                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold text-blue-600 hover:bg-blue-50 hover:text-blue-700 transition-all duration-150"
                                >
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>Własne godziny</span>
                                </button>

                                <button className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold text-amber-600 hover:bg-amber-50 hover:text-amber-700 transition-all duration-150">
                                    <Flag className="w-3.5 h-3.5" />
                                    <span>Dodaj nieobecność</span>
                                </button>

                                {currentCellShifts.length > 0 && (
                                    <button
                                        onClick={() => handleDeleteShift(0)}
                                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold text-red-500 hover:bg-red-50 hover:text-red-600 transition-all duration-150"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                        <span>Usuń zmianę</span>
                                    </button>
                                )}
                            </>
                        ) : showCustomForm ? (
                            <>
                                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2 pb-1.5 mb-1.5 border-b border-slate-100">
                                    Własne godziny
                                </div>
                                <div className="space-y-2 p-1">
                                    <div>
                                        <label className="text-[11px] font-medium text-slate-600 block mb-1">
                                            Początek
                                        </label>
                                        <input
                                            type="time"
                                            value={customStartTime}
                                            onChange={(e) =>
                                                setCustomStartTime(
                                                    e.target.value,
                                                )
                                            }
                                            className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-medium text-slate-600 block mb-1">
                                            Koniec
                                        </label>
                                        <input
                                            type="time"
                                            value={customEndTime}
                                            onChange={(e) =>
                                                setCustomEndTime(e.target.value)
                                            }
                                            className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-medium text-slate-600 block mb-1">
                                            Przerwa (min)
                                        </label>
                                        <input
                                            type="number"
                                            value={customBreakMinutes}
                                            onChange={(e) =>
                                                setCustomBreakMinutes(
                                                    Number(e.target.value),
                                                )
                                            }
                                            min="0"
                                            max="120"
                                            step="15"
                                            className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                                <div className="border-t border-slate-100 my-1.5" />
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => setShowCustomForm(false)}
                                        className="flex-1 px-2.5 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all duration-150"
                                    >
                                        Anuluj
                                    </button>
                                    <button
                                        onClick={handleCustomSubmit}
                                        className="flex-1 px-2.5 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all duration-150"
                                    >
                                        Zapisz
                                    </button>
                                </div>
                            </>
                        ) : null}
                    </div>
                </div>
            )}
        </section>
    );
}
