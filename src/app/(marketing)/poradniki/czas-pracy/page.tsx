import { Metadata } from "next";
import Link from "next/link";
import {
    SEOPageLayout,
    UniversalHero,
    FAQSectionDynamic,
    CTABanner,
    SchemaScript,
    Breadcrumbs,
} from "@/components/features/seo";
import {
    generateFAQSchema,
    generateArticleSchema,
    generateBreadcrumbSchema,
} from "@/lib/seo/schemas";
import { Card } from "@/components/ui/card";
import {
    Clock,
    CheckCircle2,
    AlertTriangle,
    ArrowRight,
    Calculator,
    Calendar,
    Scale,
} from "lucide-react";
import { getPoradnikiByCluster } from "@/lib/mdx";
import { ContentCard } from "@/components/features/content/ContentCard";
import { ArticlesGridSection } from "@/components/features/seo/articles-grid-section";

export const metadata: Metadata = {
    title: "Czas Pracy - Kompletny Poradnik 2026 | Normy, Systemy, Przepisy",
    description:
        "Wszystko o czasie pracy w 2026: normy czasu pracy, systemy zmianowe, nadgodziny, przerwy i odpoczynki. Zgodność z Kodeksem Pracy.",
    keywords: [
        "czas pracy",
        "normy czasu pracy",
        "system równoważny",
        "nadgodziny",
        "przerwy w pracy",
        "odpoczynek dobowy",
        "kodeks pracy czas pracy",
        "grafik pracy przepisy",
    ],
    openGraph: {
        title: "Czas Pracy - Kompletny Poradnik 2026",
        description:
            "Wszystko o czasie pracy: normy, systemy zmianowe, nadgodziny, przerwy.",
        type: "website",
        url: "https://calenda.pl/poradniki/czas-pracy",
    },
    alternates: {
        canonical: "https://calenda.pl/poradniki/czas-pracy",
    },
};

// FAQ dla pillar page
const faqs = [
    {
        question: "Ile godzin można pracować dziennie?",
        answer: "W podstawowym systemie czasu pracy dobowy wymiar to 8 godzin. W systemie równoważnym można przedłużyć do 12, 16, a nawet 24 godzin, z zachowaniem średniotygodniowej normy 40 godzin.",
    },
    {
        question: "Ile godzin pracy tygodniowo maksymalnie?",
        answer: "Przeciętnie 40 godzin tygodniowo w przyjętym okresie rozliczeniowym. Z nadgodzinami maksymalnie 48 godzin średnio, a absolutne maksimum to 416 nadgodzin rocznie (150 standardowo).",
    },
    {
        question: "Czy przerwa wlicza się do czasu pracy?",
        answer: "15-minutowa przerwa przy pracy powyżej 6 godzin wlicza się do czasu pracy. Przerwa na lunch (do 60 min) nie wlicza się i może być nieodpłatna.",
    },
    {
        question: "Ile minimalnie godzin odpoczynku między zmianami?",
        answer: "Minimum 11 godzin nieprzerwanego odpoczynku dobowego. Można skrócić do 8 godzin tylko w szczególnych przypadkach (np. zmiana pory zmiany).",
    },
    {
        question: "Jak rozliczyć nadgodziny?",
        answer: "Nadgodziny można rekompensować: 1) dodatkiem 50% lub 100% do wynagrodzenia, 2) czasem wolnym - 1:1 na wniosek pracownika lub 1:1,5 z inicjatywy pracodawcy.",
    },
];

// Kluczowe liczby
const keyNumbers = [
    { value: "8h", label: "Norma dobowa", description: "Podstawowy wymiar" },
    {
        value: "40h",
        label: "Norma tygodniowa",
        description: "Średnio w okresie",
    },
    { value: "11h", label: "Odpoczynek dobowy", description: "Minimum" },
    { value: "35h", label: "Odpoczynek tygodniowy", description: "Minimum" },
];

export default async function CzasPracyPillarPage() {
    const articles = await getPoradnikiByCluster("czas-pracy");

    const breadcrumbItems = [
        { name: "Strona główna", url: "https://calenda.pl" },
        { name: "Poradniki", url: "https://calenda.pl/poradniki" },
        { name: "Czas pracy", url: "https://calenda.pl/poradniki/czas-pracy" },
    ];

    return (
        <SEOPageLayout>
            <SchemaScript
                schema={[
                    generateFAQSchema(faqs),
                    generateArticleSchema(
                        "Czas Pracy - Kompletny Poradnik 2026",
                        "Wszystko o czasie pracy: normy, systemy zmianowe, nadgodziny, przerwy i odpoczynki.",
                        "https://calenda.pl/poradniki/czas-pracy",
                        "2026-01-07",
                    ),
                    generateBreadcrumbSchema(breadcrumbItems),
                ]}
            />

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-8">
                <Breadcrumbs
                    items={[
                        { label: "Poradniki", href: "/poradniki" },
                        { label: "Czas pracy" },
                    ]}
                />
            </div>

            <UniversalHero
                badge={{ icon: Clock, text: "Poradnik 2026" }}
                title="Czas Pracy"
                titleHighlight="Kompletny Poradnik"
                subtitle="Wszystko co musisz wiedzieć o czasie pracy: normy, systemy zmianowe, nadgodziny, przerwy i odpoczynki. Zgodność z Kodeksem Pracy."
            />

            {/* Kluczowe liczby */}
            <section className="py-12">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                        {keyNumbers.map((item) => (
                            <Card
                                key={item.label}
                                className="p-5 rounded-xl text-center bg-blue-50/50 border-blue-100"
                            >
                                <div className="text-3xl font-bold text-blue-600 mb-1">
                                    {item.value}
                                </div>
                                <div className="text-sm font-medium text-gray-900">
                                    {item.label}
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5">
                                    {item.description}
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* Wprowadzenie */}
            <section className="py-12">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-3xl mx-auto prose prose-lg">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">
                            Czym jest czas pracy?
                        </h2>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            <strong>Czas pracy</strong> to okres, w którym
                            pracownik pozostaje w dyspozycji pracodawcy w
                            zakładzie pracy lub w innym miejscu wyznaczonym do
                            wykonywania pracy. Regulują go przepisy Kodeksu
                            Pracy (art. 128-151).
                        </p>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            Prawidłowe planowanie czasu pracy to nie tylko
                            kwestia prawna - to fundament efektywnego
                            zarządzania zespołem. Błędy w grafikach mogą
                            skutkować karami PIP do <strong>30 000 zł</strong>.
                        </p>

                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 my-6">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                                <div>
                                    <div className="font-semibold text-amber-900 mb-1">
                                        Ważne zmiany w 2026
                                    </div>
                                    <p className="text-sm text-amber-800">
                                        Pamiętaj o weryfikacji grafiku pod kątem
                                        nowych świąt i zmian w wymiarze czasu
                                        pracy. Rok 2026 ma 2016 godzin pracy
                                        (252 dni robocze).
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Artykuły w klastrze */}
            <ArticlesGridSection
                articles={articles}
                category="Czas Pracy"
                title="Artykuły w tym dziale"
                variant="grid"
            />

            {/* Podstawowe zasady */}
            <section className="py-12">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-3xl mx-auto">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                            Podstawowe zasady czasu pracy
                        </h2>

                        <div className="space-y-4">
                            {[
                                "Dobowy wymiar czasu pracy nie może przekraczać 8 godzin (w podstawowym systemie)",
                                "Tygodniowy czas pracy łącznie z nadgodzinami nie może przekraczać przeciętnie 48 godzin",
                                "Pracownikowi przysługuje minimum 11 godzin nieprzerwanego odpoczynku dobowego",
                                "Pracownikowi przysługuje minimum 35 godzin nieprzerwanego odpoczynku tygodniowego",
                                "Rozkład czasu pracy musi być podany pracownikowi minimum 1 tydzień przed rozpoczęciem",
                                "Praca w niedziele i święta jest co do zasady zabroniona (z wyjątkami)",
                            ].map((rule, index) => (
                                <Card
                                    key={index}
                                    className="p-4 rounded-xl flex items-start gap-3"
                                >
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                                    <span className="text-gray-700">
                                        {rule}
                                    </span>
                                </Card>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Systemy czasu pracy - krótki przegląd */}
            <section className="py-12 bg-gray-50/50">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-4xl mx-auto">
                        <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
                            Systemy czasu pracy
                        </h2>

                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[
                                {
                                    name: "Podstawowy",
                                    hours: "8h/dobę",
                                    description:
                                        "Standardowy system dla większości stanowisk",
                                },
                                {
                                    name: "Równoważny",
                                    hours: "do 12h/dobę",
                                    description:
                                        "Dla prac wymagających dłuższych zmian",
                                },
                                {
                                    name: "Równoważny rozszerzony",
                                    hours: "do 16h lub 24h",
                                    description:
                                        "Dla dozoru, ochrony, akcji ratowniczych",
                                },
                                {
                                    name: "Przerywany",
                                    hours: "z przerwą do 5h",
                                    description:
                                        "Dla prac z naturalną przerwą (np. transport)",
                                },
                                {
                                    name: "Zadaniowy",
                                    hours: "elastyczny",
                                    description:
                                        "Rozliczanie według wykonanych zadań",
                                },
                                {
                                    name: "Weekendowy",
                                    hours: "pt-nd",
                                    description:
                                        "Praca tylko w piątki, soboty i niedziele",
                                },
                            ].map((system) => (
                                <Card
                                    key={system.name}
                                    className="p-4 rounded-xl"
                                >
                                    <div className="font-semibold text-gray-900 mb-1">
                                        {system.name}
                                    </div>
                                    <div className="text-blue-600 font-medium text-sm mb-2">
                                        {system.hours}
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        {system.description}
                                    </p>
                                </Card>
                            ))}
                        </div>

                        <div className="text-center mt-6">
                            <Link
                                href="/poradniki/czas-pracy/system-rownowazny"
                                className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
                            >
                                Dowiedz się więcej o systemach
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            <FAQSectionDynamic
                title="Najczęściej zadawane pytania"
                faqs={faqs}
            />

            {/* Powiązane narzędzia */}
            <section className="py-12">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-3xl mx-auto">
                        <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">
                            Przydatne narzędzia
                        </h2>

                        <div className="grid sm:grid-cols-3 gap-4">
                            <Link href="/narzedzia/wymiar-czasu-pracy-2026">
                                <Card className="p-4 rounded-xl text-center hover:shadow-md transition-shadow">
                                    <Calculator className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                                    <span className="text-sm font-medium text-gray-700">
                                        Kalkulator czasu pracy
                                    </span>
                                </Card>
                            </Link>
                            <Link href="/grafik-pracy">
                                <Card className="p-4 rounded-xl text-center hover:shadow-md transition-shadow">
                                    <Calendar className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                                    <span className="text-sm font-medium text-gray-700">
                                        Generator grafików
                                    </span>
                                </Card>
                            </Link>
                            <Link href="/poradniki/kodeks-pracy">
                                <Card className="p-4 rounded-xl text-center hover:shadow-md transition-shadow">
                                    <Scale className="w-8 h-8 text-violet-500 mx-auto mb-2" />
                                    <span className="text-sm font-medium text-gray-700">
                                        Kodeks pracy
                                    </span>
                                </Card>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            <CTABanner
                variant="gradient"
                title="Generuj grafiki zgodne z prawem"
                description="Calenda automatycznie pilnuje norm czasu pracy, odpoczynków i limitów nadgodzin."
                primaryButton={{
                    text: "Wypróbuj za darmo",
                    href: "/rejestracja",
                }}
                secondaryButton={{ text: "Zobacz demo", href: "/#demo" }}
            />
        </SEOPageLayout>
    );
}
