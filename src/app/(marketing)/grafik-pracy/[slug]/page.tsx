import { Metadata } from "next";
import { notFound } from "next/navigation";
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
    generateMonthPageMetadata,
    generateIndustryPageMetadata,
} from "@/lib/seo/metadata";
import {
    generateFAQSchema,
    generateArticleSchema,
    generateBreadcrumbSchema,
    generateHowToSchema,
} from "@/lib/seo/schemas";
import {
    getMonthPageBySlug,
    getAllMonthSlugs,
    getIndustryPageBySlug,
    getAllIndustrySlugs,
    MONTH_PAGES_2026,
    INDUSTRY_PAGES,
} from "@/lib/seo/page-configs";
import { calculateWorkingHours } from "@/lib/core/schedule/work-hours";
import { fetchHolidays } from "@/lib/api/holidays";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TemplateDownloadDialog } from "@/components/features/schedule/template-download-dialog";
import {
    Calendar,
    Clock,
    Download,
    ArrowLeft,
    ArrowRight,
    Sun,
    Store,
    Utensils,
    Shield,
    Factory,
    Building,
    Package,
    Briefcase,
    CheckCircle2,
    AlertTriangle,
    Users,
    type LucideIcon,
} from "lucide-react";

interface PageProps {
    params: Promise<{ slug: string }>;
}

// Mapowanie ikon dla branż
const iconMap: Record<string, LucideIcon> = {
    Store,
    Utensils,
    Shield,
    Factory,
    Building,
    Package,
    Briefcase,
};

// Generowanie statycznych ścieżek (miesiące + branże)
export async function generateStaticParams() {
    const monthSlugs = getAllMonthSlugs().map((slug) => ({ slug }));
    const industrySlugs = getAllIndustrySlugs().map((slug) => ({ slug }));
    return [...monthSlugs, ...industrySlugs];
}

// Generowanie metadanych
export async function generateMetadata({
    params,
}: PageProps): Promise<Metadata> {
    const { slug } = await params;

    // Sprawdź czy to miesiąc
    const monthConfig = getMonthPageBySlug(slug);
    if (monthConfig) {
        return generateMonthPageMetadata(
            monthConfig.monthName,
            monthConfig.year,
            slug,
        );
    }

    // Sprawdź czy to branża
    const industryConfig = getIndustryPageBySlug(slug);
    if (industryConfig) {
        return generateIndustryPageMetadata(
            industryConfig.name,
            slug,
            industryConfig.description,
            industryConfig.keywords,
        );
    }

    return { title: "Nie znaleziono strony" };
}

// ============================================================================
// FAQ dla stron miesięcznych
// ============================================================================
const getMonthFAQs = (monthName: string, year: number) => [
    {
        question: `Ile dni roboczych jest w ${monthName.toLowerCase()} ${year}?`,
        answer: `Liczba dni roboczych w ${monthName.toLowerCase()} ${year} zależy od świąt przypadających w tym miesiącu. Sprawdź dokładne dane w tabeli powyżej.`,
    },
    {
        question: `Ile godzin pracy w ${monthName.toLowerCase()} ${year}?`,
        answer: `Wymiar czasu pracy dla pełnego etatu oblicza się mnożąc liczbę dni roboczych przez 8 godzin. Dla niepełnego etatu proporcjonalnie mniej.`,
    },
    {
        question: `Jakie święta są w ${monthName.toLowerCase()} ${year}?`,
        answer: `Lista świąt państwowych przypadających w ${monthName.toLowerCase()} ${year} znajduje się w sekcji powyżej.`,
    },
];

// ============================================================================
// FAQ dla stron branżowych
// ============================================================================
const getIndustryFAQs = (name: string, challenges: string[]) => [
    {
        question: `Jak stworzyć grafik pracy dla ${name.toLowerCase()}?`,
        answer: `Tworzenie grafiku dla branży ${name.toLowerCase()} wymaga uwzględnienia specyficznych wyzwań: ${challenges
            .slice(0, 2)
            .join(
                ", ",
            )}. Najłatwiej użyć automatycznego generatora, który uwzględni te aspekty.`,
    },
    {
        question: `Czy grafik pracy dla ${name.toLowerCase()} musi być zgodny z Kodeksem Pracy?`,
        answer: `Tak, każdy grafik pracy musi być zgodny z Kodeksem Pracy, niezależnie od branży. Obejmuje to normy czasu pracy, odpoczynki dobowe (min. 11h) i tygodniowe (min. 35h).`,
    },
    {
        question: `Ile wcześniej musi być gotowy grafik pracy dla ${name.toLowerCase()}?`,
        answer: `Zgodnie z art. 129 §3 Kodeksu Pracy, pracownik musi poznać rozkład czasu pracy co najmniej 1 tydzień przed rozpoczęciem pracy w okresie, na który został sporządzony.`,
    },
    {
        question: `Jakie są najczęstsze błędy w grafikach dla ${name.toLowerCase()}?`,
        answer: `Najczęstsze błędy to: zbyt krótki odpoczynek między zmianami, przekroczenie norm tygodniowych, brak uwzględnienia świąt oraz nieplanowanie zastępstw.`,
    },
];

// Kroki do HowTo Schema dla branż
const getHowToSteps = (name: string) => [
    {
        name: "Określ zapotrzebowanie kadrowe",
        text: `Przeanalizuj potrzeby ${name.toLowerCase()} - ile osób potrzebujesz na poszczególne zmiany i stanowiska.`,
    },
    {
        name: "Zbierz dostępność pracowników",
        text: "Zapytaj pracowników o ich preferencje i ograniczenia czasowe.",
    },
    {
        name: "Uwzględnij przepisy prawne",
        text: "Pamiętaj o normach czasu pracy, odpoczynkach i limitach nadgodzin.",
    },
    {
        name: "Wygeneruj grafik",
        text: "Użyj generatora lub stwórz grafik ręcznie, uwzględniając wszystkie zebrane dane.",
    },
    {
        name: "Udostępnij pracownikom",
        text: "Opublikuj grafik minimum tydzień przed rozpoczęciem okresu rozliczeniowego.",
    },
];

// ============================================================================
// KOMPONENT STRONY MIESIĘCZNEJ
// ============================================================================
async function MonthPage({
    slug,
    config,
}: {
    slug: string;
    config: NonNullable<ReturnType<typeof getMonthPageBySlug>>;
}) {
    const holidays = await fetchHolidays(config.year);
    const workData = calculateWorkingHours(
        config.year,
        config.month,
        holidays,
        8,
    );

    const currentIndex = MONTH_PAGES_2026.findIndex((m) => m.slug === slug);
    const prevMonth =
        currentIndex > 0 ? MONTH_PAGES_2026[currentIndex - 1] : null;
    const nextMonth =
        currentIndex < MONTH_PAGES_2026.length - 1
            ? MONTH_PAGES_2026[currentIndex + 1]
            : null;

    const faqs = getMonthFAQs(config.monthName, config.year);

    const breadcrumbItems = [
        { name: "Strona główna", url: "https://calenda.pl" },
        { name: "Grafik pracy", url: "https://calenda.pl/grafik-pracy" },
        {
            name: `${config.monthName} ${config.year}`,
            url: `https://calenda.pl/grafik-pracy/${slug}`,
        },
    ];

    return (
        <SEOPageLayout>
            <SchemaScript
                schema={[
                    generateFAQSchema(faqs),
                    generateArticleSchema(
                        config.title,
                        config.description,
                        `https://calenda.pl/grafik-pracy/${slug}`,
                        "2026-01-01",
                    ),
                    generateBreadcrumbSchema(breadcrumbItems),
                ]}
            />
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-8">
                <Breadcrumbs
                    items={[
                        { label: "Grafik pracy", href: "/grafik-pracy" },
                        { label: `${config.monthName} ${config.year}` },
                    ]}
                />
            </div>
            <UniversalHero
                badge={{ icon: Calendar, text: `${config.year}` }}
                title={`Grafik Pracy`}
                titleHighlight={config.monthName}
                subtitle={`Dni robocze, święta i wymiar czasu pracy w ${config.monthName.toLowerCase()} ${
                    config.year
                }. Darmowy szablon do pobrania.`}
            />
            <section className="pb-12">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
                        <Card className="p-6 rounded-xl bg-blue-50 border-blue-100 text-center">
                            <Clock className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                            <div className="text-3xl font-bold text-blue-600 mb-1">
                                {workData.totalWorkingHours}h
                            </div>
                            <div className="text-sm text-blue-700">
                                Godzin pracy
                            </div>
                        </Card>
                        <Card className="p-6 rounded-xl bg-emerald-50 border-emerald-100 text-center">
                            <Calendar className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                            <div className="text-3xl font-bold text-emerald-600 mb-1">
                                {workData.totalWorkingDays}
                            </div>
                            <div className="text-sm text-emerald-700">
                                Dni roboczych
                            </div>
                        </Card>
                        <Card className="p-6 rounded-xl bg-violet-50 border-violet-100 text-center">
                            <Sun className="w-6 h-6 text-violet-500 mx-auto mb-2" />
                            <div className="text-3xl font-bold text-violet-600 mb-1">
                                {workData.holidays.length}
                            </div>
                            <div className="text-sm text-violet-700">Świąt</div>
                        </Card>
                    </div>
                </div>
            </section>
            {workData.holidays.length > 0 && (
                <section className="py-12">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="max-w-2xl mx-auto">
                            <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">
                                Święta w {config.monthName.toLowerCase()}
                            </h2>
                            <div className="space-y-3">
                                {workData.holidays.map((holiday) => (
                                    <Card
                                        key={holiday.date}
                                        className="p-4 rounded-xl flex items-center justify-between"
                                    >
                                        <span className="font-medium text-gray-900">
                                            {holiday.name}
                                        </span>
                                        <Badge variant="secondary">
                                            {new Date(
                                                holiday.date,
                                            ).toLocaleDateString("pl-PL", {
                                                day: "numeric",
                                                month: "long",
                                            })}
                                        </Badge>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>
            )}
            <section className="py-8">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-2xl mx-auto flex items-center justify-between">
                        {prevMonth ? (
                            <Button asChild variant="outline">
                                <Link href={`/grafik-pracy/${prevMonth.slug}`}>
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    {prevMonth.monthName}
                                </Link>
                            </Button>
                        ) : (
                            <div />
                        )}
                        {nextMonth ? (
                            <Button asChild variant="outline">
                                <Link href={`/grafik-pracy/${nextMonth.slug}`}>
                                    {nextMonth.monthName}
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Link>
                            </Button>
                        ) : (
                            <div />
                        )}
                    </div>
                </div>
            </section>
            <section className="py-8">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-xl mx-auto text-center">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Pobierz szablon grafiku
                        </h3>
                        <div className="flex flex-wrap justify-center gap-4">
                            <TemplateDownloadDialog
                                format="pdf"
                                year={config.year}
                                month={config.month}
                            >
                                <Button variant="outline">
                                    <Download className="w-4 h-4 mr-2" />
                                    Pobierz PDF
                                </Button>
                            </TemplateDownloadDialog>
                            <TemplateDownloadDialog
                                format="csv"
                                year={config.year}
                                month={config.month}
                            >
                                <Button variant="outline">
                                    <Download className="w-4 h-4 mr-2" />
                                    Pobierz Excel (CSV)
                                </Button>
                            </TemplateDownloadDialog>
                        </div>
                    </div>
                </div>
            </section>
            <FAQSectionDynamic
                title={`Pytania o ${config.monthName.toLowerCase()} ${
                    config.year
                }`}
                faqs={faqs}
            />
            <section className="pt-16">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
                    <CTABanner
                        title="Wygeneruj grafik automatycznie"
                        subtitle={`Calenda stworzy optymalny grafik na ${config.monthName.toLowerCase()} w kilka sekund.`}
                        variant="gradient"
                    />
                </div>
            </section>
        </SEOPageLayout>
    );
}

// ============================================================================
// KOMPONENT STRONY BRANŻOWEJ
// ============================================================================
function IndustryPage({
    slug,
    config,
}: {
    slug: string;
    config: NonNullable<ReturnType<typeof getIndustryPageBySlug>>;
}) {
    const Icon = iconMap[config.icon] || Briefcase;
    const faqs = getIndustryFAQs(config.name, config.challenges);
    const howToSteps = getHowToSteps(config.name);
    const otherIndustries = INDUSTRY_PAGES.filter((i) => i.slug !== slug).slice(
        0,
        4,
    );
    const breadcrumbItems = [
        { name: "Strona główna", url: "https://calenda.pl" },
        { name: "Grafik pracy", url: "https://calenda.pl/grafik-pracy" },
        { name: config.name, url: `https://calenda.pl/grafik-pracy/${slug}` },
    ];

    return (
        <SEOPageLayout>
            <SchemaScript
                schema={[
                    generateFAQSchema(faqs),
                    generateArticleSchema(
                        config.title,
                        config.description,
                        `https://calenda.pl/grafik-pracy/${slug}`,
                        "2026-01-01",
                    ),
                    generateBreadcrumbSchema(breadcrumbItems),
                    generateHowToSchema(
                        `Jak stworzyć grafik pracy dla ${config.name.toLowerCase()}`,
                        config.description,
                        howToSteps,
                        "PT15M",
                    ),
                ]}
            />
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-8">
                <Breadcrumbs
                    items={[
                        { label: "Grafik pracy", href: "/grafik-pracy" },
                        { label: config.name },
                    ]}
                />
            </div>
            <UniversalHero
                badge={{ icon: Icon, text: config.name }}
                title="Grafik Pracy dla"
                titleHighlight={config.name}
                subtitle={config.description}
            />
            <section className="py-12">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-4xl mx-auto">
                        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8 text-center">
                            Wyzwania w branży{" "}
                            <span className="bg-linear-to-r from-blue-600 to-violet-500 bg-clip-text text-transparent">
                                {config.name}
                            </span>
                        </h2>
                        <div className="grid sm:grid-cols-2 gap-4">
                            {config.challenges.map((challenge, index) => (
                                <Card
                                    key={index}
                                    className="p-5 rounded-xl border border-amber-100 bg-amber-50/50"
                                >
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                                        <span className="text-gray-700">
                                            {challenge}
                                        </span>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                </div>
            </section>
            <section className="py-12 bg-gray-50/50">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-4xl mx-auto">
                        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8 text-center">
                            Jak{" "}
                            <span className="bg-linear-to-r from-blue-600 to-violet-500 bg-clip-text text-transparent">
                                Calenda
                            </span>{" "}
                            pomaga
                        </h2>
                        <div className="grid sm:grid-cols-3 gap-6">
                            {config.features.map((feature, index) => (
                                <Card
                                    key={index}
                                    className="p-6 rounded-xl bg-white border border-gray-100 text-center"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle2 className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <p className="text-gray-700 font-medium">
                                        {feature}
                                    </p>
                                </Card>
                            ))}
                        </div>
                    </div>
                </div>
            </section>
            <section className="py-12">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-4xl mx-auto">
                        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8 text-center">
                            Korzyści automatycznego grafiku
                        </h2>
                        <div className="grid sm:grid-cols-3 gap-6">
                            <Card className="p-6 rounded-xl bg-emerald-50 border-emerald-100 text-center">
                                <Clock className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
                                <div className="text-2xl font-bold text-emerald-600 mb-1">
                                    90%
                                </div>
                                <div className="text-sm text-emerald-700">
                                    Mniej czasu na planowanie
                                </div>
                            </Card>
                            <Card className="p-6 rounded-xl bg-blue-50 border-blue-100 text-center">
                                <Users className="w-8 h-8 text-blue-500 mx-auto mb-3" />
                                <div className="text-2xl font-bold text-blue-600 mb-1">
                                    100%
                                </div>
                                <div className="text-sm text-blue-700">
                                    Zgodność z prawem
                                </div>
                            </Card>
                            <Card className="p-6 rounded-xl bg-violet-50 border-violet-100 text-center">
                                <Calendar className="w-8 h-8 text-violet-500 mx-auto mb-3" />
                                <div className="text-2xl font-bold text-violet-600 mb-1">
                                    24/7
                                </div>
                                <div className="text-sm text-violet-700">
                                    Dostęp do grafiku
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>
            </section>
            <section className="py-12 bg-gray-50/50">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-3xl mx-auto">
                        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8 text-center">
                            Jak stworzyć grafik dla{" "}
                            <span className="bg-linear-to-r from-blue-600 to-violet-500 bg-clip-text text-transparent">
                                {config.name.toLowerCase()}
                            </span>
                        </h2>
                        <div className="space-y-4">
                            {howToSteps.map((step, index) => (
                                <Card
                                    key={index}
                                    className="p-5 rounded-xl bg-white"
                                >
                                    <div className="flex gap-4">
                                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shrink-0">
                                            {index + 1}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900 mb-1">
                                                {step.name}
                                            </h3>
                                            <p className="text-gray-600 text-sm">
                                                {step.text}
                                            </p>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                </div>
            </section>
            <section className="py-12">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-2xl mx-auto">
                        <Card className="p-8 rounded-2xl bg-linear-to-br from-blue-600 to-violet-600 text-white text-center">
                            <Download className="w-12 h-12 mx-auto mb-4 opacity-80" />
                            <h3 className="text-xl font-bold mb-2">
                                Darmowy szablon grafiku dla{" "}
                                {config.name.toLowerCase()}
                            </h3>
                            <p className="text-blue-100 mb-6">
                                Pobierz gotowy szablon Excel lub PDF i zacznij
                                planować już dziś.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                <TemplateDownloadDialog
                                    format="csv"
                                    year={2026}
                                >
                                    <Button
                                        variant="secondary"
                                        className="bg-white text-blue-600 hover:bg-blue-50"
                                    >
                                        <Download className="w-4 h-4 mr-2" />
                                        Pobierz Excel (CSV)
                                    </Button>
                                </TemplateDownloadDialog>
                                <TemplateDownloadDialog
                                    format="pdf"
                                    year={2026}
                                >
                                    <Button
                                        variant="secondary"
                                        className="bg-white/10 text-white hover:bg-white/20 border-white/20"
                                    >
                                        <Download className="w-4 h-4 mr-2" />
                                        Pobierz PDF
                                    </Button>
                                </TemplateDownloadDialog>
                            </div>
                        </Card>
                    </div>
                </div>
            </section>
            <FAQSectionDynamic
                title={`Najczęściej zadawane pytania - ${config.name}`}
                faqs={faqs}
            />
            <section className="py-12 bg-gray-50/50">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-4xl mx-auto">
                        <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">
                            Grafiki pracy dla innych branż
                        </h2>
                        <div className="grid sm:grid-cols-4 gap-4">
                            {otherIndustries.map((industry) => {
                                const OtherIcon =
                                    iconMap[industry.icon] || Briefcase;
                                return (
                                    <Link
                                        key={industry.slug}
                                        href={`/grafik-pracy/${industry.slug}`}
                                    >
                                        <Card className="p-4 rounded-xl text-center hover:shadow-md transition-shadow cursor-pointer">
                                            <OtherIcon className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                                            <span className="text-sm font-medium text-gray-700">
                                                {industry.name}
                                            </span>
                                        </Card>
                                    </Link>
                                );
                            })}
                        </div>
                        <div className="text-center mt-6">
                            <Link href="/grafik-pracy">
                                <Button
                                    variant="outline"
                                    className="rounded-xl"
                                >
                                    Zobacz wszystkie branże
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
            <CTABanner
                variant="gradient"
                title="Wygeneruj grafik automatycznie"
                description={`Zacznij tworzyć profesjonalne grafiki dla ${config.name.toLowerCase()} w kilka minut. Bez karty kredytowej.`}
                primaryButton={{
                    text: "Rozpocznij za darmo",
                    href: "/rejestracja",
                }}
                secondaryButton={{ text: "Zobacz demo", href: "/#demo" }}
            />
        </SEOPageLayout>
    );
}

// ============================================================================
// GŁÓWNY KOMPONENT - decyduje czy to miesiąc czy branża
// ============================================================================
export default async function DynamicSchedulePage({ params }: PageProps) {
    const { slug } = await params;
    const monthConfig = getMonthPageBySlug(slug);
    if (monthConfig) {
        return <MonthPage slug={slug} config={monthConfig} />;
    }
    const industryConfig = getIndustryPageBySlug(slug);
    if (industryConfig) {
        return <IndustryPage slug={slug} config={industryConfig} />;
    }
    notFound();
}
