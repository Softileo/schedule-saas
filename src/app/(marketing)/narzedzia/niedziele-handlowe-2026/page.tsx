"use client";

import { useMemo } from "react";
import {
    SEOPageLayout,
    UniversalHero,
    FAQSectionDynamic,
    CTABanner,
    SchemaScript,
    YearCalendarGrid,
} from "@/components/features/seo";
import { Breadcrumbs } from "@/components/features/seo/breadcrumbs";
import {
    generateFAQSchema,
    generateEventSchema,
    generateBreadcrumbSchema,
} from "@/lib/seo/schemas";
import { calculateTradingSundays } from "@/lib/api/holidays";
import { formatDatePL } from "@/lib/utils/date-helpers";
import { Download, ShoppingBag } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Konfiguracja strony
const YEAR = 2026;

// FAQ dla strony
const faqs = [
    {
        question: "Ile jest niedziel handlowych w 2026 roku?",
        answer: `W 2026 roku jest 7 niedziel handlowych. Są to: ostatnia niedziela stycznia, dwie niedziele przed Wielkanocą, ostatnia niedziela czerwca, ostatnia niedziela sierpnia oraz dwie ostatnie niedziele grudnia.`,
    },
    {
        question: "Kiedy jest najbliższa niedziela handlowa?",
        answer: "Aby sprawdzić najbliższą niedzielę handlową, zobacz naszą listę powyżej. Daty są automatycznie obliczane zgodnie z polskim prawem.",
    },
    {
        question: "Czy w Wigilię sklepy są otwarte?",
        answer: "Wigilia (24 grudnia) nie jest niedzielą handlową, ale sklepy mogą być otwarte do godziny 14:00, jeśli Wigilia przypada w dzień roboczy.",
    },
    {
        question:
            "Jakie kary grożą za otwarcie sklepu w niedzielę niehandlową?",
        answer: "Za złamanie zakazu handlu w niedzielę grozi kara grzywny od 1000 do 100 000 zł. W przypadku uporczywego łamania przepisów kara może być wyższa.",
    },
    {
        question: "Czy apteki mogą być otwarte w niedziele niehandlowe?",
        answer: "Tak, apteki są wyłączone z zakazu handlu w niedziele. Podobnie stacje benzynowe, kwiaciarnie, piekarnie (sprzedające własne wyroby) i sklepy na dworcach.",
    },
    {
        question: "Skąd pochodzą te daty?",
        answer: "Daty niedziel handlowych są obliczane automatycznie na podstawie ustawy o ograniczeniu handlu w niedziele i święta. Algorytm uwzględnia wszystkie zasady określone w polskim prawie.",
    },
];

export default function NiedzieleHandlowePage() {
    // Oblicz niedziele handlowe
    const tradingSundays = useMemo(() => calculateTradingSundays(YEAR), []);
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    // Znajdź najbliższą niedzielę handlową
    const nextTradingSunday = tradingSundays.find((date) => date >= todayStr);

    // Przygotuj eventy do schema
    const events = tradingSundays.map((date) => ({
        name: `Niedziela handlowa ${formatDatePL(date, "d MMMM yyyy")}`,
        date,
        description: `Niedziela handlowa w Polsce - sklepy otwarte`,
    }));

    // Breadcrumbs
    const breadcrumbItems = [
        { name: "Strona główna", url: "https://calenda.pl" },
        { name: "Narzędzia", url: "https://calenda.pl/narzedzia" },
        {
            name: "Niedziele handlowe 2026",
            url: "https://calenda.pl/narzedzia/niedziele-handlowe-2026",
        },
    ];

    // Funkcja do oznaczania dni w kalendarzu
    const getMarkedDates = (month: number) => {
        return tradingSundays
            .filter((date) => {
                const d = new Date(date);
                return d.getMonth() + 1 === month;
            })
            .map((date) => ({
                date,
                type: "trading-sunday" as const,
            }));
    };

    // Grupuj niedziele wg powodu
    const groupedSundays = tradingSundays.map((date) => ({
        date,
        reason: getReasonForTradingSunday(date),
        isPast: date < todayStr,
        isNext: date === nextTradingSunday,
    }));

    return (
        <SEOPageLayout>
            {/* Schema markup */}
            <SchemaScript
                schema={[
                    generateFAQSchema(faqs),
                    ...generateEventSchema(events),
                    generateBreadcrumbSchema(breadcrumbItems),
                ]}
            />

            {/* Breadcrumbs */}
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-8">
                <Breadcrumbs
                    items={[
                        { label: "Narzędzia", href: "/narzedzia" },
                        { label: "Niedziele handlowe 2026" },
                    ]}
                />
            </div>

            {/* Hero */}
            <UniversalHero
                badge={{ icon: ShoppingBag, text: "Kalendarz 2026" }}
                title="Niedziele Handlowe"
                titleHighlight="2026"
                subtitle="7 niedziel handlowych w roku. Zobacz na kalendarzu kiedy sklepy będą otwarte."
            />

            {/* Kalendarz roczny */}
            <section className="pt-12">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-6xl mx-auto">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
                            Kalendarz {YEAR}
                        </h2>
                        <p className="text-gray-600 text-center mb-8">
                            <span className="inline-flex items-center gap-2">
                                <span className="w-4 h-4 rounded bg-red-500"></span>
                                <span className="text-sm">
                                    = Niedziela handlowa (sklepy otwarte)
                                </span>
                            </span>
                        </p>

                        <YearCalendarGrid
                            year={YEAR}
                            getMarkedDates={getMarkedDates}
                        />
                    </div>
                </div>
            </section>

            {/* Lista z powodami */}
            <section className="py-8 bg-gray-50">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-3xl mx-auto">
                        <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">
                            Lista niedziel handlowych {YEAR}
                        </h3>
                        <div className="grid sm:grid-cols-2 gap-3">
                            {groupedSundays.map(
                                ({ date, reason, isPast, isNext }, index) => (
                                    <Card
                                        key={date}
                                        className={`p-4 rounded-xl transition-all ${
                                            isNext
                                                ? "border-red-500 bg-red-50 shadow-md"
                                                : isPast
                                                  ? "opacity-50"
                                                  : ""
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                                                    isNext
                                                        ? "bg-red-500 text-white"
                                                        : "bg-red-100 text-red-700"
                                                }`}
                                            >
                                                {index + 1}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-semibold text-gray-900">
                                                    {formatDatePL(
                                                        date,
                                                        "d MMMM",
                                                    )}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {reason}
                                                </p>
                                            </div>
                                            {isNext && (
                                                <Badge className="bg-red-500 text-xs">
                                                    Najbliższa
                                                </Badge>
                                            )}
                                        </div>
                                    </Card>
                                ),
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Eksport */}
            <section className="py-12">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-xl mx-auto text-center">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Pobierz kalendarz
                        </h3>
                        <div className="flex flex-wrap justify-center gap-4">
                            <Button variant="outline" asChild>
                                <a
                                    href={`/api/calendar/trading-sundays/${YEAR}`}
                                    download={`niedziele-handlowe-${YEAR}.ics`}
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    Eksport do kalendarza (ICS)
                                </a>
                            </Button>
                        </div>
                        <p className="text-sm text-gray-500 mt-3">
                            Plik ICS możesz zaimportować do Google Calendar,
                            Outlook, Apple Calendar i innych aplikacji.
                        </p>
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <FAQSectionDynamic
                title="Pytania o niedziele handlowe"
                subtitle="Odpowiedzi na najczęściej zadawane pytania"
                faqs={faqs}
            />

            {/* CTA */}
            <section className="py-16">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
                    <CTABanner
                        title="Twórz grafiki z uwzględnieniem niedziel handlowych"
                        subtitle="Calenda automatycznie oznacza niedziele handlowe w grafiku pracy."
                        variant="gradient"
                    />
                </div>
            </section>
        </SEOPageLayout>
    );
}

/**
 * Zwraca powód dla którego dana niedziela jest handlowa
 */
function getReasonForTradingSunday(dateStr: string): string {
    const date = new Date(dateStr);
    const month = date.getMonth();

    if (month === 0) return "Ostatnia niedziela stycznia";
    if (month === 2 || month === 3) return "Przed Wielkanocą";
    if (month === 5) return "Ostatnia niedziela czerwca";
    if (month === 7) return "Ostatnia niedziela sierpnia";
    if (month === 11) return "Grudzień przedświąteczny";

    return "Niedziela handlowa";
}
