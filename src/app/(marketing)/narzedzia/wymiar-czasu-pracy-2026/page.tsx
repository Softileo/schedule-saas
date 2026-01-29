"use client";

import { useState } from "react";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Calendar, Loader2 } from "lucide-react";
import {
    useWorkCalendarData,
    type MonthData,
} from "@/lib/hooks/use-work-calendar-data";

// FAQ dla kalkulatora
const faqs = [
    {
        question: "Jak obliczany jest wymiar czasu pracy?",
        answer: "Wymiar czasu pracy obliczany jest zgodnie z art. 130 Kodeksu Pracy: mnożymy 40 godzin przez liczbę pełnych tygodni w okresie rozliczeniowym, dodajemy 8 godzin za każdy dzień roboczy powyżej pełnych tygodni, a następnie odejmujemy 8 godzin za każde święto przypadające w innym dniu niż niedziela.",
    },
    {
        question: "Ile godzin pracy jest w 2026 roku?",
        answer: "W 2026 roku jest 2008 godzin pracy dla pełnego etatu (251 dni roboczych × 8 godzin). Dla 1/2 etatu to 1004 godziny, a dla 3/4 etatu - 1506 godzin.",
    },
    {
        question: "Czy kalkulator uwzględnia święta?",
        answer: "Tak, kalkulator automatycznie uwzględnia wszystkie święta państwowe w Polsce. Dni świąteczne przypadające w dni robocze zmniejszają wymiar czasu pracy.",
    },
    {
        question: "Jak liczyć wymiar dla niepełnego etatu?",
        answer: "Dla niepełnego etatu mnożymy standardowy wymiar przez ułamek etatu. Np. dla 1/2 etatu w styczniu 2026 (160h) wymiar wynosi 80h.",
    },
];

const EMPLOYMENT_TYPES = [
    { value: "1", label: "Pełny etat", multiplier: 1 },
    { value: "0.75", label: "3/4 etatu", multiplier: 0.75 },
    { value: "0.5", label: "1/2 etatu", multiplier: 0.5 },
    { value: "0.25", label: "1/4 etatu", multiplier: 0.25 },
];

const YEAR = 2026;

export default function WymiarCzasuPracyPage() {
    const [employmentType, setEmploymentType] = useState<string>("1");

    const multiplier =
        EMPLOYMENT_TYPES.find((e) => e.value === employmentType)?.multiplier ||
        1;

    const {
        workData,
        isLoading,
        totalWorkingDays,
        totalHours,
        totalHolidays,
        totalFreeDays,
    } = useWorkCalendarData(YEAR, 8);

    // Funkcja do oznaczania dni w kalendarzu
    const getMarkedDates = (month: number) => {
        const monthData = workData.find((m) => m.month === month);
        if (!monthData) return [];

        return monthData.holidays.map((holiday) => ({
            date: holiday.date,
            type: "holiday" as const,
            name: holiday.name, // Dodaj nazwę święta
        }));
    };

    // Funkcja do statystyk miesiąca
    const getMonthStats = (month: number) => {
        const monthData = workData.find((m) => m.month === month);
        if (!monthData) return undefined;

        return {
            hours: Math.round(monthData.hours * multiplier),
            workingDays: monthData.workingDays,
            freeDays: monthData.freeDays, // Dodaj dni wolne
        };
    };

    // Pokaż loader podczas ładowania
    if (isLoading) {
        return (
            <SEOPageLayout>
                <div className="container mx-auto px-4 py-32 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
                    <p className="mt-4 text-gray-600">
                        Obliczam wymiar czasu pracy...
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
                        { label: "Wymiar czasu pracy 2026" },
                    ]}
                />
            </div>

            {/* Hero */}
            <UniversalHero
                badge={{ icon: Calendar, text: "Kalendarz 2026" }}
                title="Wymiar Czasu Pracy"
                titleHighlight="2026"
                subtitle="Ile godzin pracy w każdym miesiącu? Sprawdź wymiar czasu pracy dla całego roku 2026."
            />

            {/* Podsumowanie roku */}
            <section className="pb-8">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-3 gap-4 max-w-xl mx-auto">
                        <Card className="p-4 rounded-xl bg-blue-50 border-blue-100 text-center">
                            <div className="text-3xl font-bold text-blue-600 mb-1">
                                {Math.round(totalHours * multiplier)}
                            </div>
                            <div className="text-xs text-blue-700">
                                Godzin w roku
                            </div>
                        </Card>
                        <Card className="p-4 rounded-xl bg-emerald-50 border-emerald-100 text-center">
                            <div className="text-3xl font-bold text-emerald-600 mb-1">
                                {totalWorkingDays}
                            </div>
                            <div className="text-xs text-emerald-700">
                                Dni roboczych
                            </div>
                        </Card>
                        <Card className="p-4 rounded-xl bg-red-50 border-red-100 text-center">
                            <div className="text-3xl font-bold text-red-600 mb-1">
                                {totalHolidays}
                            </div>
                            <div className="text-xs text-red-700">
                                Świąt w tygodniu
                            </div>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Kalendarz roczny z godzinami */}
            <section className="py-8">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-6xl mx-auto">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
                            Kalendarz {YEAR}
                        </h2>
                        <CalendarLegend />

                        <YearCalendarGrid
                            year={YEAR}
                            getMarkedDates={getMarkedDates}
                            getMonthStats={getMonthStats}
                        />
                    </div>
                </div>
            </section>

            {/* Tabela szczegółowa */}
            <section className="py-12 bg-gray-50">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-3xl mx-auto">
                        <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">
                            Szczegółowe dane {YEAR}
                        </h3>

                        {/* Filtr etatu */}
                        <div className="max-w-xs mx-auto mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
                                Wymiar etatu
                            </label>
                            <Select
                                value={employmentType}
                                onValueChange={setEmploymentType}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Wybierz etat" />
                                </SelectTrigger>
                                <SelectContent>
                                    {EMPLOYMENT_TYPES.map((type) => (
                                        <SelectItem
                                            key={type.value}
                                            value={type.value}
                                        >
                                            {type.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <Card className="rounded-xl overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b">
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
                                                Godziny
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
                                                <td className="px-4 py-3 text-center text-gray-600">
                                                    {month.workingDays}
                                                </td>
                                                <td className="px-4 py-3 text-center text-gray-600">
                                                    {month.freeDays}
                                                </td>
                                                <td className="px-4 py-3 text-center font-semibold text-blue-600">
                                                    {Math.round(
                                                        month.hours *
                                                            multiplier,
                                                    )}
                                                    h
                                                </td>
                                                <td className="px-4 py-3 text-center text-gray-500">
                                                    {month.holidays.length > 0
                                                        ? month.holidays.length
                                                        : "-"}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-gray-50 border-t-2">
                                        <tr>
                                            <td className="px-4 py-3 font-bold text-gray-900">
                                                Razem {YEAR}
                                            </td>
                                            <td className="px-4 py-3 text-center font-bold text-gray-900">
                                                {totalWorkingDays}
                                            </td>
                                            <td className="px-4 py-3 text-center font-bold text-gray-900">
                                                {workData.reduce(
                                                    (sum, m) =>
                                                        sum + m.freeDays,
                                                    0,
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center font-bold text-blue-600">
                                                {Math.round(
                                                    totalHours * multiplier,
                                                )}
                                                h
                                            </td>
                                            <td className="px-4 py-3 text-center font-bold text-gray-900">
                                                {totalHolidays}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </Card>
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <FAQSectionDynamic
                title="Pytania o wymiar czasu pracy"
                subtitle="Najczęściej zadawane pytania"
                faqs={faqs}
            />

            {/* CTA */}
            <section className="py-16">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
                    <CTABanner
                        title="Automatycznie pilnuj wymiaru czasu pracy"
                        subtitle="Calenda śledzi przepracowane godziny i ostrzega przed przekroczeniem limitu."
                        variant="gradient"
                    />
                </div>
            </section>
        </SEOPageLayout>
    );
}
