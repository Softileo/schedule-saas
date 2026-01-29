"use client";

import { useState } from "react";
import { parseISO } from "date-fns";
import {
    SEOPageLayout,
    UniversalHero,
    FAQSectionDynamic,
    CTABanner,
    YearCalendarGrid,
} from "@/components/features/seo";
import { CalendarLegend } from "@/components/common/marketing/calendar-legend";
import { Breadcrumbs } from "@/components/features/seo/breadcrumbs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Calendar,
    Briefcase,
    Clock,
    Gift,
    Sun,
    PartyPopper,
    Download,
    Loader2,
    TrendingUp,
    Info,
} from "lucide-react";
import { useWorkCalendarData } from "@/lib/hooks/use-work-calendar-data";

const YEAR = 2026;

// FAQ
const faqs = [
    {
        question: "Ile dni roboczych jest w 2026 roku?",
        answer: "W 2026 roku jest 251 dni roboczych. Rok ma 365 dni, z czego 104 to soboty i niedziele, a 13 dni to święta państwowe (niektóre przypadają w weekendy).",
    },
    {
        question: "Jakie święta są w 2026 roku?",
        answer: "W 2026 roku obchodzimy 13 świąt państwowych: Nowy Rok (1.01), Trzech Króli (6.01), Wielkanoc i Poniedziałek Wielkanocny (5-6.04), Święto Pracy (1.05), Święto Konstytucji (3.05), Zielone Świątki (24.05), Boże Ciało (4.06), Wniebowzięcie NMP (15.08), Wszystkich Świętych (1.11), Święto Niepodległości (11.11), Boże Narodzenie (25-26.12).",
    },
    {
        question: "Kiedy są długie weekendy w 2026?",
        answer: "Długie weekendy w 2026: maj (1-3 maja, piątek-niedziela), czerwiec (4-7 czerwca przy urlopie w piątek), sierpień (15-16 sierpnia, sobota-niedziela), listopad (11 listopada, środa - możliwość przedłużenia).",
    },
    {
        question: "Ile godzin pracy jest w 2026 roku?",
        answer: "Dla pełnego etatu (8h/dzień) wymiar czasu pracy w 2026 roku wynosi 2008 godzin (251 dni × 8h). Dla 1/2 etatu to 1004 godziny.",
    },
];

// Długie weekendy z sugestiami urlopowymi
interface LongWeekend {
    name: string;
    dates: string;
    holidayDates: string[]; // ISO dates for calendar marking
    tip: string;
    vacationDays: number; // dni urlopu do wzięcia
    totalDays: number; // łączna liczba dni wolnych
}

const LONG_WEEKENDS: LongWeekend[] = [
    {
        name: "Święto Trzech Króli",
        dates: "6 stycznia (wt)",
        holidayDates: ["2026-01-06"],
        tip: "Weź 4 dni urlopu (7-9.01), zyskaj 5 dni wolnych",
        vacationDays: 3,
        totalDays: 5,
    },
    {
        name: "Wielkanoc",
        dates: "5-6 kwietnia (nd-pn)",
        holidayDates: ["2026-04-05", "2026-04-06"],
        tip: "Weź 3 dni urlopu (7-9.04), zyskaj 5 dni wolnych",
        vacationDays: 3,
        totalDays: 5,
    },
    {
        name: "Majówka",
        dates: "1-3 maja (pt-nd)",
        holidayDates: ["2026-05-01", "2026-05-03"],
        tip: "Automatyczne 3 dni wolne! Bez urlopu",
        vacationDays: 0,
        totalDays: 3,
    },
    {
        name: "Zielone Świątki",
        dates: "24 maja (nd)",
        holidayDates: ["2026-05-24"],
        tip: "Weź 1 dzień urlopu (22.05), zyskaj 3 dni wolne",
        vacationDays: 1,
        totalDays: 3,
    },
    {
        name: "Boże Ciało",
        dates: "4 czerwca (cz)",
        holidayDates: ["2026-06-04"],
        tip: "Weź 1 dzień urlopu (5.06), zyskaj 4 dni wolne",
        vacationDays: 1,
        totalDays: 4,
    },
    {
        name: "Wniebowzięcie NMP",
        dates: "15 sierpnia (sb)",
        holidayDates: ["2026-08-15"],
        tip: "Weekend przedłużony o dodatkowy dzień wolny w poniedziałek",
        vacationDays: 0,
        totalDays: 3,
    },
    {
        name: "Święto Niepodległości",
        dates: "11 listopada (śr)",
        holidayDates: ["2026-11-11"],
        tip: "Weź 2 dni urlopu (12-13.11), zyskaj 5 dni wolnych",
        vacationDays: 2,
        totalDays: 5,
    },
    {
        name: "Boże Narodzenie",
        dates: "25-26 grudnia (pt-sb)",
        holidayDates: ["2026-12-25", "2026-12-26"],
        tip: "Weź 4 dni urlopu (21-24.12), zyskaj 9 dni wolnych",
        vacationDays: 4,
        totalDays: 9,
    },
];

export default function KalendarzDniRoboczychPage() {
    const {
        workData,
        holidays,
        isLoading,
        totalWorkingDays,
        totalHours,
        totalHolidays,
        totalFreeDays,
    } = useWorkCalendarData(YEAR, 8);

    // Oblicz łączne dni urlopu potrzebne dla wszystkich długich weekendów
    const totalVacationDaysNeeded = LONG_WEEKENDS.reduce(
        (sum, w) => sum + w.vacationDays,
        0,
    );
    const totalLongWeekendDays = LONG_WEEKENDS.reduce(
        (sum, w) => sum + w.totalDays,
        0,
    );

    // Funkcja do oznaczania dni w kalendarzu
    const getMarkedDates = (month: number) => {
        const monthData = workData.find((m) => m.month === month);
        if (!monthData) return [];

        const markedDates = monthData.holidays.map((holiday) => ({
            date: holiday.date,
            type: "holiday" as const,
            name: holiday.name,
        }));

        // Dodaj oznaczenia dla długich weekendów
        LONG_WEEKENDS.forEach((weekend) => {
            weekend.holidayDates.forEach((date) => {
                const holidayMonth = parseISO(date).getMonth() + 1;
                if (holidayMonth === month) {
                    // Sprawdź czy to święto już nie jest oznaczone
                    const alreadyMarked = markedDates.find(
                        (d) => d.date === date,
                    );
                    if (!alreadyMarked) {
                        markedDates.push({
                            date,
                            type: "holiday" as const,
                            name: weekend.name,
                        });
                    }
                }
            });
        });

        return markedDates;
    };

    // Funkcja do statystyk miesiąca
    const getMonthStats = (month: number) => {
        const monthData = workData.find((m) => m.month === month);
        if (!monthData) return undefined;

        return {
            hours: monthData.hours,
            workingDays: monthData.workingDays,
            freeDays: monthData.freeDays,
        };
    };

    // Pokaż loader podczas ładowania
    if (isLoading) {
        return (
            <SEOPageLayout>
                <div className="container mx-auto px-4 py-32 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
                    <p className="mt-4 text-gray-600">
                        Ładuję kalendarz dni roboczych 2026...
                    </p>
                </div>
            </SEOPageLayout>
        );
    }

    return (
        <SEOPageLayout>
            {/* Breadcrumbs */}
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-8">
                <Breadcrumbs
                    items={[
                        { label: "Narzędzia", href: "/narzedzia" },
                        { label: "Kalendarz dni roboczych 2026" },
                    ]}
                />
            </div>

            {/* Hero */}
            <UniversalHero
                badge={{ icon: Calendar, text: "Kalendarz 2026" }}
                title="Kalendarz Dni Roboczych"
                titleHighlight="2026"
                subtitle="Pełny kalendarz dni roboczych, świąt i długich weekendów w 2026 roku. Planuj urlopy z wyprzedzeniem i wykorzystaj długie weekendy."
            />

            {/* Podsumowanie roku */}
            <section className="pb-12">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid sm:grid-cols-4 gap-4 max-w-4xl mx-auto">
                        <Card className="p-5 rounded-xl bg-blue-50 border-blue-100 text-center">
                            <Briefcase className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                            <div className="text-2xl font-bold text-blue-600 mb-1">
                                {totalWorkingDays}
                            </div>
                            <div className="text-sm text-blue-700">
                                Dni roboczych
                            </div>
                        </Card>
                        <Card className="p-5 rounded-xl bg-emerald-50 border-emerald-100 text-center">
                            <Clock className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                            <div className="text-2xl font-bold text-emerald-600 mb-1">
                                {totalHours}
                            </div>
                            <div className="text-sm text-emerald-700">
                                Godzin pracy
                            </div>
                        </Card>
                        <Card className="p-5 rounded-xl bg-amber-50 border-amber-100 text-center">
                            <Gift className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                            <div className="text-2xl font-bold text-amber-600 mb-1">
                                {totalHolidays}
                            </div>
                            <div className="text-sm text-amber-700">
                                Dni świątecznych
                            </div>
                        </Card>
                        <Card className="p-5 rounded-xl bg-violet-50 border-violet-100 text-center">
                            <Sun className="w-6 h-6 text-violet-500 mx-auto mb-2" />
                            <div className="text-2xl font-bold text-violet-600 mb-1">
                                {totalFreeDays}
                            </div>
                            <div className="text-sm text-violet-700">
                                Dni wolnych
                            </div>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Kalendarz roczny z mini kalendarzami */}
            <section className="pt-8">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-6xl mx-auto">
                        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 text-center">
                            Kalendarz{" "}
                            <span className="bg-linear-to-r from-blue-600 to-violet-500 bg-clip-text text-transparent">
                                2026
                            </span>
                        </h2>
                        <p className="text-gray-600 text-center mb-8 flex items-center justify-center gap-4 flex-wrap">
                            <span className="inline-flex items-center gap-2">
                                <span className="w-4 h-4 rounded bg-red-100 border border-red-200"></span>
                                <span className="text-sm">
                                    Święto (najedź kursorem)
                                </span>
                            </span>
                            <span className="inline-flex items-center gap-2">
                                <span className="w-4 h-4 rounded text-red-400 text-xs flex items-center justify-center font-medium">
                                    N
                                </span>
                                <span className="text-sm">Niedziela</span>
                            </span>
                        </p>

                        <YearCalendarGrid
                            year={YEAR}
                            getMarkedDates={getMarkedDates}
                            getMonthStats={getMonthStats}
                        />
                    </div>
                </div>
            </section>

            {/* Długie weekendy - NOWA SEKCJA Z PLANOWANIEM */}
            <section className="py-12 bg-linear-to-br from-violet-50 via-purple-50 to-blue-50">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-4xl mx-auto">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                                Sprytne Planowanie{" "}
                                <span className="bg-linear-to-r from-violet-600 to-purple-500 bg-clip-text text-transparent">
                                    Długich Weekendów
                                </span>
                            </h2>
                            <p className="text-gray-600 max-w-2xl mx-auto">
                                Dowiedz się, jak wykorzystać święta w 2026 roku,
                                aby maksymalnie przedłużyć swój wypoczynek
                            </p>
                        </div>

                        {/* Statystyki długich weekendów */}
                        <div className="grid sm:grid-cols-3 gap-4 mb-8">
                            <Card className="p-5 rounded-xl bg-white/80 backdrop-blur text-center border-violet-100">
                                <PartyPopper className="w-6 h-6 text-violet-500 mx-auto mb-2" />
                                <div className="text-2xl font-bold text-violet-600 mb-1">
                                    {LONG_WEEKENDS.length}
                                </div>
                                <div className="text-sm text-violet-700">
                                    Długich weekendów
                                </div>
                            </Card>
                            <Card className="p-5 rounded-xl bg-white/80 backdrop-blur text-center border-blue-100">
                                <TrendingUp className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                                <div className="text-2xl font-bold text-blue-600 mb-1">
                                    {totalVacationDaysNeeded}
                                </div>
                                <div className="text-sm text-blue-700">
                                    Dni urlopu potrzeba
                                </div>
                            </Card>
                            <Card className="p-5 rounded-xl bg-white/80 backdrop-blur text-center border-emerald-100">
                                <Sun className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                                <div className="text-2xl font-bold text-emerald-600 mb-1">
                                    {totalLongWeekendDays}
                                </div>
                                <div className="text-sm text-emerald-700">
                                    Łącznie dni wolnych
                                </div>
                            </Card>
                        </div>

                        {/* Lista długich weekendów */}
                        <div className="space-y-4">
                            {LONG_WEEKENDS.map((weekend, index) => {
                                const isAutomatic = weekend.vacationDays === 0;
                                const efficiency =
                                    weekend.vacationDays > 0
                                        ? (
                                              weekend.totalDays /
                                              weekend.vacationDays
                                          ).toFixed(1)
                                        : null;

                                return (
                                    <Card
                                        key={index}
                                        className="p-5 rounded-xl bg-white/90 backdrop-blur border-violet-100 hover:border-violet-300 transition-all hover:shadow-md"
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-linear-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0 shadow-lg">
                                                <PartyPopper className="w-6 h-6 text-white" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-start justify-between gap-4 mb-2">
                                                    <div>
                                                        <h3 className="font-semibold text-gray-900 text-lg">
                                                            {weekend.name}
                                                        </h3>
                                                        <p className="text-sm text-gray-500">
                                                            {weekend.dates}
                                                        </p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        {isAutomatic ? (
                                                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                                                                🎉 Bez urlopu!
                                                            </Badge>
                                                        ) : (
                                                            <>
                                                                <Badge
                                                                    variant="secondary"
                                                                    className="bg-blue-100 text-blue-700"
                                                                >
                                                                    {
                                                                        weekend.vacationDays
                                                                    }{" "}
                                                                    dni urlopu
                                                                </Badge>
                                                                {efficiency && (
                                                                    <Badge className="bg-violet-100 text-violet-700 hover:bg-violet-100">
                                                                        ×
                                                                        {
                                                                            efficiency
                                                                        }{" "}
                                                                        zwrot
                                                                    </Badge>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="rounded-lg bg-linear-to-r from-emerald-50 to-blue-50 p-3 border border-emerald-100">
                                                    <p className="text-sm text-emerald-700 font-medium flex items-center gap-2">
                                                        <span className="text-lg">
                                                            💡
                                                        </span>
                                                        {weekend.tip}
                                                    </p>
                                                </div>

                                                <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
                                                    <span className="flex items-center gap-1">
                                                        <Sun className="w-4 h-4 text-amber-500" />
                                                        Łącznie{" "}
                                                        <strong className="text-gray-700">
                                                            {weekend.totalDays}{" "}
                                                            dni
                                                        </strong>{" "}
                                                        wolnych
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>

                        {/* Wskazówka */}
                        <Card className="mt-6 p-4 rounded-xl bg-linear-to-r from-blue-500 to-violet-600 text-white border-0">
                            <p className="text-sm text-center">
                                <strong>Protip:</strong> Weź tylko{" "}
                                {totalVacationDaysNeeded} dni urlopu, a zyskasz{" "}
                                {totalLongWeekendDays} dni wolnych! To efekt{" "}
                                {(
                                    totalLongWeekendDays /
                                    totalVacationDaysNeeded
                                ).toFixed(1)}
                                × zwrotu z inwestycji w urlop 🚀
                            </p>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Tabela miesięczna */}
            <section className="py-12 bg-gray-50/50">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-4xl mx-auto">
                        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8 text-center">
                            Dni robocze w każdym miesiącu
                        </h2>

                        <div className="overflow-x-auto">
                            <table className="w-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                                            Miesiąc
                                        </th>
                                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">
                                            Dni robocze
                                        </th>
                                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">
                                            Dni wolne
                                        </th>
                                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">
                                            Godzin
                                        </th>
                                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">
                                            Święta
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {workData.map((month) => (
                                        <tr
                                            key={month.month}
                                            className="hover:bg-gray-50 transition-colors"
                                        >
                                            <td className="px-4 py-3 font-medium text-gray-900">
                                                {month.name}
                                            </td>
                                            <td className="px-4 py-3 text-center text-gray-700">
                                                {month.workingDays}
                                            </td>
                                            <td className="px-4 py-3 text-center text-gray-700">
                                                {month.freeDays}
                                            </td>
                                            <td className="px-4 py-3 text-center text-gray-700 font-semibold">
                                                {month.hours}h
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {month.holidays.length > 0 ? (
                                                    <Badge
                                                        variant="secondary"
                                                        className="bg-amber-100 text-amber-700"
                                                    >
                                                        {month.holidays.length}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-gray-400">
                                                        -
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-blue-50 border-t-2">
                                    <tr>
                                        <td className="px-4 py-3 font-bold text-blue-900">
                                            Razem 2026
                                        </td>
                                        <td className="px-4 py-3 text-center font-bold text-blue-900">
                                            {totalWorkingDays}
                                        </td>
                                        <td className="px-4 py-3 text-center font-bold text-blue-900">
                                            {totalFreeDays}
                                        </td>
                                        <td className="px-4 py-3 text-center font-bold text-blue-900">
                                            {totalHours}h
                                        </td>
                                        <td className="px-4 py-3 text-center font-bold text-blue-900">
                                            {totalHolidays}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>
            </section>

            {/* Święta w 2026 */}
            <section className="py-12">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-5xl mx-auto">
                        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 text-center">
                            Wszystkie święta państwowe{" "}
                            <span className="bg-linear-to-r from-blue-600 to-violet-500 bg-clip-text text-transparent">
                                2026
                            </span>
                        </h2>
                        <p className="text-gray-600 text-center mb-10">
                            {totalHolidays} dni świątecznych w Polsce, z czego{" "}
                            {
                                holidays.filter(
                                    (h) =>
                                        new Date(h.date).getDay() !== 0 &&
                                        new Date(h.date).getDay() !== 6,
                                ).length
                            }{" "}
                            w dni robocze
                        </p>

                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {holidays.map((holiday) => {
                                const date = new Date(holiday.date);
                                const dayOfWeek = date.toLocaleDateString(
                                    "pl-PL",
                                    { weekday: "long" },
                                );
                                const day = date.getDate();
                                const monthShort = date.toLocaleDateString(
                                    "pl-PL",
                                    { month: "short" },
                                );
                                const isWeekend =
                                    date.getDay() === 0 || date.getDay() === 6;

                                return (
                                    <Card
                                        key={holiday.date}
                                        className={`p-5 rounded-2xl border-2 ${
                                            isWeekend
                                                ? "bg-gray-50 border-gray-200"
                                                : "bg-blue-50 border-blue-200"
                                        }`}
                                    >
                                        {/* Calendar Date Badge */}
                                        <div className="flex items-start justify-between mb-4">
                                            <div
                                                className={`${
                                                    isWeekend
                                                        ? "bg-gray-400"
                                                        : "bg-blue-500"
                                                } text-white px-4 py-2 rounded-xl shadow-sm`}
                                            >
                                                <div className="text-xs font-semibold uppercase opacity-90">
                                                    {monthShort}
                                                </div>
                                                <div className="text-2xl font-bold leading-none">
                                                    {day}
                                                </div>
                                            </div>

                                            {isWeekend && (
                                                <Badge
                                                    variant="outline"
                                                    className="bg-white/80 text-gray-600 border-gray-300"
                                                >
                                                    Weekend
                                                </Badge>
                                            )}
                                        </div>

                                        {/* Holiday Name */}
                                        <h3 className="text-lg font-bold text-gray-900 mb-2">
                                            {holiday.name}
                                        </h3>

                                        {/* Day of week */}
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <Calendar className="w-4 h-4" />
                                            <span className="capitalize">
                                                {dayOfWeek}
                                            </span>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>

                        {/* Info box */}
                        <Card className="mt-8 p-6 bg-blue-50 border-blue-200">
                            <div className="flex gap-4">
                                <Info className="w-6 h-6 text-blue-600 shrink-0 mt-1" />
                                <div>
                                    <h3 className="font-semibold text-blue-900 mb-2">
                                        Informacja o świętach przypadających w
                                        weekend
                                    </h3>
                                    <p className="text-sm text-blue-800 leading-relaxed">
                                        Gdy święto wypada w sobotę, pracownicy
                                        mają prawo do dodatkowego dnia wolnego w
                                        innym terminie. Dotyczy to{" "}
                                        {
                                            holidays.filter(
                                                (h) =>
                                                    new Date(
                                                        h.date,
                                                    ).getDay() === 6,
                                            ).length
                                        }{" "}
                                        świąt w 2026 roku.
                                    </p>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Pobierz PDF */}
            <section className="py-12 bg-gray-50/50">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-2xl mx-auto">
                        <Card className="p-8 rounded-2xl bg-linear-to-br from-blue-600 to-violet-600 text-white text-center">
                            <Download className="w-12 h-12 mx-auto mb-4 opacity-80" />
                            <h3 className="text-xl font-bold mb-2">
                                Pobierz kalendarz 2026
                            </h3>
                            <p className="text-blue-100 mb-6">
                                Wydrukuj kalendarz z dniami roboczymi i świętami
                                na cały rok.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                <Button
                                    variant="secondary"
                                    className="bg-white text-blue-600 hover:bg-blue-50"
                                    disabled
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    PDF do druku (wkrótce)
                                </Button>
                                <Button
                                    variant="secondary"
                                    className="bg-white/10 text-white hover:bg-white/20 border-white/20"
                                    asChild
                                >
                                    <a
                                        href="/api/calendar/trading-sundays/2026"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <Download className="w-4 h-4 mr-2" />
                                        Eksport ICS
                                    </a>
                                </Button>
                            </div>
                        </Card>
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <FAQSectionDynamic title="Pytania o dni robocze 2026" faqs={faqs} />

            {/* CTA */}
            <CTABanner
                variant="gradient"
                title="Planuj grafiki pracy na 2026"
                description="Calenda automatycznie uwzględnia święta i dni wolne przy tworzeniu grafików."
                primaryButton={{
                    text: "Rozpocznij za darmo",
                    href: "/rejestracja",
                }}
                secondaryButton={{
                    text: "Zobacz kalkulator",
                    href: "/narzedzia/wymiar-czasu-pracy-2026",
                }}
            />
        </SEOPageLayout>
    );
}
