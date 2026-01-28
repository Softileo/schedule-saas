import { Metadata } from "next";
import Link from "next/link";
import {
    SEOPageLayout,
    UniversalHero,
    CTABanner,
    SchemaScript,
    Breadcrumbs,
} from "@/components/features/seo";
import { generateBreadcrumbSchema } from "@/lib/seo/schemas";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Clock,
    Scale,
    Calculator,
    BookOpen,
    ArrowRight,
    FileText,
    AlertTriangle,
} from "lucide-react";

export const metadata: Metadata = {
    title: "Poradniki - Czas Pracy, Kodeks Pracy | Calenda",
    description:
        "Kompleksowe poradniki o czasie pracy, prawie pracy i grafikach. Dowiedz się jak legalnie planować pracę zgodnie z Kodeksem Pracy.",
    keywords: [
        "poradniki czas pracy",
        "kodeks pracy poradnik",
        "grafik pracy przepisy",
        "normy czasu pracy",
        "nadgodziny",
    ],
    openGraph: {
        title: "Poradniki - Czas Pracy, Kodeks Pracy | Calenda",
        description:
            "Kompleksowe poradniki o czasie pracy, prawie pracy i grafikach.",
        type: "website",
    },
};

// Klastry tematyczne
const clusters = [
    {
        title: "Czas Pracy",
        slug: "czas-pracy",
        description:
            "Wszystko o normach czasu pracy, systemach zmianowych i rozliczaniu godzin.",
        icon: Clock,
        color: "blue",
        articles: [
            { title: "Normy czasu pracy 2026", slug: "normy-czasu-pracy" },
            { title: "System równoważny", slug: "system-rownowazny" },
            { title: "Praca 12 godzin", slug: "praca-12-godzin" },
            { title: "Nadgodziny", slug: "nadgodziny" },
            { title: "Przerwy w pracy", slug: "przerwy-w-pracy" },
            {
                title: "Odpoczynek dobowy i tygodniowy",
                slug: "odpoczynek-dobowy",
            },
        ],
    },
    {
        title: "Kodeks Pracy",
        slug: "kodeks-pracy",
        description:
            "Przepisy prawne dotyczące grafiku pracy, kary PIP i obowiązki pracodawcy.",
        icon: Scale,
        color: "violet",
        articles: [
            { title: "Grafik pracy - przepisy", slug: "grafik-pracy-przepisy" },
            { title: "Kary PIP za błędy w grafiku", slug: "kary-pip-grafik" },
            { title: "Kontrola PIP", slug: "kontrola-pip" },
            { title: "Błędy w grafiku pracy", slug: "bledy-w-grafiku" },
        ],
    },
];

// Popularne artykuły
const popularArticles = [
    {
        title: "Jak ułożyć grafik pracy - kompletny poradnik",
        slug: "/blog/jak-ulozyc-grafik-pracy",
        category: "Poradnik",
        readTime: "6 min",
    },
    {
        title: "Kary PIP za zły grafik pracy",
        slug: "/blog/kary-pip-za-zly-grafik",
        category: "Prawo pracy",
        readTime: "5 min",
    },
];

const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    blue: {
        bg: "bg-blue-50",
        text: "text-blue-600",
        border: "border-blue-100",
    },
    violet: {
        bg: "bg-violet-50",
        text: "text-violet-600",
        border: "border-violet-100",
    },
    emerald: {
        bg: "bg-emerald-50",
        text: "text-emerald-600",
        border: "border-emerald-100",
    },
};

export default function PoradnikiPage() {
    const breadcrumbItems = [
        { name: "Strona główna", url: "https://calenda.pl" },
        { name: "Poradniki", url: "https://calenda.pl/poradniki" },
    ];

    return (
        <SEOPageLayout>
            <SchemaScript
                schema={[generateBreadcrumbSchema(breadcrumbItems)]}
            />

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-8">
                <Breadcrumbs items={[{ label: "Poradniki" }]} />
            </div>

            <UniversalHero
                badge={{ icon: BookOpen, text: "Baza wiedzy" }}
                title="Poradniki"
                titleHighlight="Prawo Pracy"
                subtitle="Kompleksowe poradniki o czasie pracy, grafikach i przepisach. Wszystko czego potrzebujesz, żeby planować pracę zgodnie z prawem."
            />

            {/* Klastry tematyczne */}
            <section className="py-16">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-6xl mx-auto">
                        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8 text-center">
                            Wybierz temat
                        </h2>

                        <div className="grid md:grid-cols-2 gap-8">
                            {clusters.map((cluster) => {
                                const colors = colorMap[cluster.color];
                                const Icon = cluster.icon;

                                return (
                                    <Card
                                        key={cluster.slug}
                                        className="p-6 rounded-2xl border border-gray-100 hover:shadow-lg transition-shadow"
                                    >
                                        <div className="flex items-start gap-4 mb-6">
                                            <div
                                                className={`w-14 h-14 rounded-xl ${colors.bg} flex items-center justify-center shrink-0`}
                                            >
                                                <Icon
                                                    className={`w-7 h-7 ${colors.text}`}
                                                />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-gray-900 mb-1">
                                                    {cluster.title}
                                                </h3>
                                                <p className="text-gray-600 text-sm">
                                                    {cluster.description}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            {cluster.articles.map((article) => (
                                                <Link
                                                    key={article.slug}
                                                    href={`/poradniki/${cluster.slug}/${article.slug}`}
                                                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                                                >
                                                    <span className="text-gray-700 group-hover:text-gray-900">
                                                        {article.title}
                                                    </span>
                                                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                                                </Link>
                                            ))}
                                        </div>

                                        <Link
                                            href={`/poradniki/${cluster.slug}`}
                                            className={`mt-4 flex items-center justify-center gap-2 p-3 rounded-xl ${colors.bg} ${colors.text} font-medium hover:opacity-80 transition-opacity`}
                                        >
                                            Zobacz wszystkie artykuły
                                            <ArrowRight className="w-4 h-4" />
                                        </Link>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </section>

            {/* Popularne artykuły */}
            <section className="py-16 bg-gray-50/50">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-4xl mx-auto">
                        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8 text-center">
                            Popularne artykuły
                        </h2>

                        <div className="grid sm:grid-cols-2 gap-6">
                            {popularArticles.map((article) => (
                                <Link key={article.slug} href={article.slug}>
                                    <Card className="p-6 rounded-xl hover:shadow-md transition-shadow h-full">
                                        <Badge
                                            variant="secondary"
                                            className="mb-3"
                                        >
                                            {article.category}
                                        </Badge>
                                        <h3 className="font-semibold text-gray-900 mb-2">
                                            {article.title}
                                        </h3>
                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                            <Clock className="w-4 h-4" />
                                            {article.readTime} czytania
                                        </div>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Quick links */}
            <section className="py-16">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-4xl mx-auto">
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
                            <Link href="/grafik-pracy/szablony">
                                <Card className="p-4 rounded-xl text-center hover:shadow-md transition-shadow">
                                    <FileText className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                                    <span className="text-sm font-medium text-gray-700">
                                        Szablony grafików
                                    </span>
                                </Card>
                            </Link>
                            <Link href="/narzedzia/niedziele-handlowe-2026">
                                <Card className="p-4 rounded-xl text-center hover:shadow-md transition-shadow">
                                    <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                                    <span className="text-sm font-medium text-gray-700">
                                        Niedziele handlowe
                                    </span>
                                </Card>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            <CTABanner
                variant="gradient"
                title="Automatyczny grafik pracy"
                description="Zapomnij o ręcznym planowaniu. Calenda generuje grafiki zgodne z Kodeksem Pracy w kilka sekund."
                primaryButton={{
                    text: "Wypróbuj za darmo",
                    href: "/rejestracja",
                }}
                secondaryButton={{ text: "Zobacz demo", href: "/#demo" }}
            />
        </SEOPageLayout>
    );
}
