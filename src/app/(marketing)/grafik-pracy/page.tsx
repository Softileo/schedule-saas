import { Metadata } from "next";
import Link from "next/link";
import {
    SEOPageLayout,
    UniversalHero,
    CTABanner,
} from "@/components/features/seo";
import { Breadcrumbs } from "@/components/features/seo/breadcrumbs";
import { generateSEOMetadata } from "@/lib/seo/metadata";
import { MONTH_PAGES_2026, INDUSTRY_PAGES } from "@/lib/seo/page-configs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Calendar,
    ArrowRight,
    Store,
    Utensils,
    Shield,
    Factory,
    Building,
    Package,
    Briefcase,
    Download,
    FileSpreadsheet,
    FileText,
} from "lucide-react";

export const metadata: Metadata = generateSEOMetadata({
    title: "Grafik Pracy - Szablony i Generator Online",
    description:
        "Darmowe szablony grafików pracy dla każdej branży. Grafiki miesięczne, branżowe i do druku. Generator online zgodny z Kodeksem Pracy.",
    keywords: [
        "grafik pracy",
        "szablon grafiku pracy",
        "grafik pracy online",
        "generator grafiku",
        "harmonogram pracy",
    ],
    canonical: "/grafik-pracy",
});

// Ikony dla branż
const industryIcons: Record<string, typeof Store> = {
    sklep: Store,
    restauracja: Utensils,
    ochrona: Shield,
    produkcja: Factory,
    hotel: Building,
    magazyn: Package,
    biuro: Briefcase,
};

export default function GrafikPracyPage() {
    // Pokaż tylko najbliższe 4 miesiące
    const currentMonth = new Date().getMonth() + 1;
    const upcomingMonths = MONTH_PAGES_2026.filter(
        (m) => m.month >= currentMonth,
    ).slice(0, 4);

    return (
        <SEOPageLayout>
            {/* Breadcrumbs */}
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-8">
                <Breadcrumbs items={[{ label: "Grafik pracy" }]} />
            </div>

            {/* Hero */}
            <UniversalHero
                badge={{ icon: Calendar, text: "Darmowe szablony" }}
                title="Grafik Pracy"
                titleHighlight="Szablony i Generator"
                subtitle="Darmowe szablony grafików pracy dla każdej branży. Gotowe do druku, zgodne z Kodeksem Pracy."
            />

            {/* Grafiki miesięczne */}
            <section className="py-16">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-5xl mx-auto">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                                Grafiki miesięczne 2026
                            </h2>
                            <Badge variant="outline">12 miesięcy</Badge>
                        </div>

                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            {upcomingMonths.map((month) => (
                                <Link
                                    key={month.slug}
                                    href={`/grafik-pracy/${month.slug}`}
                                >
                                    <Card className="p-5 rounded-xl hover:shadow-lg transition-all hover:-translate-y-1 group cursor-pointer">
                                        <div className="flex items-center justify-between mb-3">
                                            <Calendar className="w-5 h-5 text-blue-500" />
                                            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                                        </div>
                                        <h3 className="font-semibold text-gray-900 mb-1">
                                            {month.monthName}
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                            2026
                                        </p>
                                    </Card>
                                </Link>
                            ))}
                        </div>

                        {/* Link do wszystkich */}
                        <div className="text-center">
                            <p className="text-gray-500 text-sm">
                                Zobacz wszystkie miesiące:{" "}
                                {MONTH_PAGES_2026.map((m, i) => (
                                    <span key={m.slug}>
                                        <Link
                                            href={`/grafik-pracy/${m.slug}`}
                                            className="text-blue-600 hover:underline"
                                        >
                                            {m.monthName}
                                        </Link>
                                        {i < MONTH_PAGES_2026.length - 1 &&
                                            ", "}
                                    </span>
                                ))}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Grafiki branżowe */}
            <section className="py-16 bg-gray-50/50">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-5xl mx-auto">
                        <div className="text-center mb-12">
                            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
                                Grafiki dla Twojej branży
                            </h2>
                            <p className="text-gray-600 max-w-2xl mx-auto">
                                Każda branża ma swoją specyfikę. Wybierz szablon
                                dopasowany do Twoich potrzeb.
                            </p>
                        </div>

                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {INDUSTRY_PAGES.map((industry) => {
                                const Icon =
                                    industryIcons[industry.slug] || Store;

                                return (
                                    <Link
                                        key={industry.slug}
                                        href={`/grafik-pracy/${industry.slug}`}
                                    >
                                        <Card className="p-6 rounded-xl hover:shadow-lg transition-all hover:-translate-y-1 group cursor-pointer h-full">
                                            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition-colors">
                                                <Icon className="w-6 h-6 text-blue-600" />
                                            </div>
                                            <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                                                {industry.name}
                                            </h3>
                                            <p className="text-sm text-gray-500 line-clamp-2">
                                                {industry.description}
                                            </p>
                                        </Card>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </section>

            {/* Szablony do pobrania */}
            <section className="py-16">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-3xl mx-auto text-center">
                        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
                            Szablony do pobrania
                        </h2>
                        <p className="text-gray-600 mb-8">
                            Darmowe szablony grafików pracy w różnych formatach.
                            Gotowe do użycia.
                        </p>

                        <div className="grid sm:grid-cols-2 gap-4">
                            <Card className="p-6 rounded-xl hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                                        <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-semibold text-gray-900">
                                            Excel / CSV
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            Edytuj w Excel, LibreOffice, Google
                                            Sheets
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    asChild
                                >
                                    <a
                                        href="/api/schedule/template/csv?year=2026"
                                        download
                                    >
                                        <Download className="w-4 h-4 mr-2" />
                                        Pobierz szablon CSV
                                    </a>
                                </Button>
                            </Card>

                            <Card className="p-6 rounded-xl hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                                        <FileText className="w-5 h-5 text-red-600" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-semibold text-gray-900">
                                            PDF do druku
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            Wydrukuj i wypełnij ręcznie
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    asChild
                                >
                                    <a
                                        href="/api/schedule/template/pdf?year=2026"
                                        target="_blank"
                                    >
                                        <Download className="w-4 h-4 mr-2" />
                                        Pobierz szablon PDF
                                    </a>
                                </Button>
                            </Card>
                        </div>

                        <p className="text-sm text-gray-500 mt-4">
                            Szablony zawierają oznaczenia weekendów i miejsce na
                            godziny pracy.
                        </p>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="pt-16">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
                    <CTABanner
                        title="Generuj grafiki automatycznie"
                        subtitle="Calenda tworzy optymalne grafiki pracy jednym kliknięciem. Zgodne z Kodeksem Pracy."
                        variant="gradient"
                    />
                </div>
            </section>
        </SEOPageLayout>
    );
}
