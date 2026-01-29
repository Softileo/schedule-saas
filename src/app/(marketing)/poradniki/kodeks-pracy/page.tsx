import { Metadata } from "next";
import Link from "next/link";
import {
    Scale,
    FileWarning,
    BookOpen,
    ChevronRight,
    Gavel,
    Shield,
    FileText,
    Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPoradnikiByCluster } from "@/lib/mdx";
import { ContentCard } from "@/components/features/content/ContentCard";
import { ArticlesGridSection } from "@/components/features/seo/articles-grid-section";
import { SEOPageLayout, CTABanner } from "@/components/features/seo";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
    title: "Kodeks Pracy - poradniki i interpretacje | Calenda",
    description:
        "Praktyczne poradniki o Kodeksie Pracy. Obowiązki pracodawcy, prawa pracownika, kontrole PIP, kary i sankcje. Aktualne interpretacje.",
    openGraph: {
        title: "Kodeks Pracy - poradniki i interpretacje | Calenda",
        description:
            "Praktyczne poradniki o Kodeksie Pracy. Obowiązki pracodawcy, prawa pracownika, kontrole PIP.",
    },
};

const keyNumbers = [
    { value: "291", label: "artykułów w Kodeksie Pracy" },
    { value: "26", label: "lat minimalnego wieku pracownika (pełnoletniego)" },
    { value: "1000-30000", label: "PLN - wysokość mandatów PIP" },
    { value: "2024", label: "ostatnia duża nowelizacja" },
];

const quickLinks = [
    {
        href: "/narzedzia/kalkulator-urlopu",
        label: "Kalkulator urlopu",
        icon: FileText,
    },
    {
        href: "/narzedzia/kalkulator-nadgodzin",
        label: "Kalkulator nadgodzin",
        icon: FileText,
    },
    {
        href: "/poradniki/czas-pracy",
        label: "Poradniki: Czas pracy",
        icon: BookOpen,
    },
];

export default async function KodeksPracyPage() {
    const articles = await getPoradnikiByCluster("kodeks-pracy");

    return (
        <SEOPageLayout>
            {/* Hero Section */}
            <div className="bg-linear-to-b from-gray-50 to-white pt-24 pb-16">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col lg:flex-row items-center gap-12">
                        <div className="flex-1 space-y-6">
                            <Badge className="bg-violet-100 text-violet-700 hover:bg-violet-100 border-violet-200">
                                Kodeks Pracy
                            </Badge>
                            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight">
                                Kodeks Pracy w{" "}
                                <span className="text-violet-600">
                                    praktyce
                                </span>
                            </h1>
                            <p className="text-xl text-gray-600 max-w-2xl">
                                Zrozumiałe interpretacje przepisów, obowiązki
                                pracodawcy i prawa pracownika w jednym miejscu.
                            </p>
                        </div>
                        <div className="lg:w-1/3 w-full">
                            <Card className="bg-white/50 backdrop-blur-xs border-violet-100 shadow-xl">
                                <CardHeader>
                                    <CardTitle>Szybka nawigacja</CardTitle>
                                </CardHeader>
                                <CardContent className="grid gap-4">
                                    {quickLinks.map((link) => (
                                        <Link
                                            key={link.href}
                                            href={link.href}
                                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-violet-50 text-gray-700 hover:text-violet-700 transition-colors group"
                                        >
                                            <div className="bg-violet-100 p-2 rounded-md group-hover:bg-violet-200 transition-colors">
                                                <link.icon className="h-4 w-4 text-violet-700" />
                                            </div>
                                            <span className="font-medium text-sm">
                                                {link.label}
                                            </span>
                                            <ChevronRight className="h-4 w-4 ml-auto opacity-50" />
                                        </Link>
                                    ))}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>

            {/* Key Numbers */}
            <div className="py-12 border-y border-gray-100 bg-white">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {keyNumbers.map((stat) => (
                            <div key={stat.label} className="text-center">
                                <div className="text-3xl font-bold text-violet-600 mb-2">
                                    {stat.value}
                                </div>
                                <div className="text-sm text-gray-600">
                                    {stat.label}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <ArticlesGridSection
                articles={articles}
                category="Kodeks Pracy"
                title="Poradniki i interpretacje"
                icon={<Scale className="h-8 w-8 text-violet-600" />}
                variant="grid"
            />

            {/* Main Topics */}
            <div className="py-16 bg-white">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <h2 className="text-2xl font-bold mb-8 text-center text-gray-900">
                        Główne obszary Kodeksu Pracy
                    </h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="bg-gray-50 rounded-xl p-8 hover:shadow-lg transition-shadow">
                            <div className="bg-white w-12 h-12 rounded-lg flex items-center justify-center shadow-xs mb-6">
                                <Gavel className="h-6 w-6 text-violet-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-4">
                                Nawiązanie stosunku pracy
                            </h3>
                            <ul className="space-y-3">
                                {[
                                    "Rodzaje umów o pracę",
                                    "Treść umowy o pracę",
                                    "Badania wstępne",
                                    "Szkolenia BHP",
                                ].map((item) => (
                                    <li
                                        key={item}
                                        className="flex items-center text-gray-600"
                                    >
                                        <div className="w-1.5 h-1.5 rounded-full bg-violet-400 mr-2" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-8 hover:shadow-lg transition-shadow">
                            <div className="bg-white w-12 h-12 rounded-lg flex items-center justify-center shadow-xs mb-6">
                                <Users className="h-6 w-6 text-violet-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-4">
                                Prawa i obowiązki
                            </h3>
                            <ul className="space-y-3">
                                {[
                                    "Obowiązki pracodawcy",
                                    "Obowiązki pracownika",
                                    "Zakaz dyskryminacji",
                                    "Mobbing",
                                ].map((item) => (
                                    <li
                                        key={item}
                                        className="flex items-center text-gray-600"
                                    >
                                        <div className="w-1.5 h-1.5 rounded-full bg-violet-400 mr-2" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-8 hover:shadow-lg transition-shadow">
                            <div className="bg-white w-12 h-12 rounded-lg flex items-center justify-center shadow-xs mb-6">
                                <Shield className="h-6 w-6 text-violet-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-4">
                                Ochrona pracy
                            </h3>
                            <ul className="space-y-3">
                                {[
                                    "BHP i ergonomia",
                                    "Ochrona kobiet",
                                    "Ochrona młodocianych",
                                    "Związki zawodowe",
                                ].map((item) => (
                                    <li
                                        key={item}
                                        className="flex items-center text-gray-600"
                                    >
                                        <div className="w-1.5 h-1.5 rounded-full bg-violet-400 mr-2" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* Important Info */}
            <div className="py-12 bg-gray-50">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                        <div className="flex gap-4">
                            <FileWarning className="h-6 w-6 text-amber-600 shrink-0 mt-1" />
                            <div>
                                <h3 className="font-semibold text-amber-900 mb-2">
                                    Uwaga - materiały informacyjne
                                </h3>
                                <p className="text-amber-800 text-sm leading-relaxed">
                                    Przedstawione treści mają charakter
                                    informacyjny i nie stanowią porady prawnej.
                                    W sprawach indywidualnych zalecamy
                                    konsultację z prawnikiem lub inspektorem
                                    PIP. Stan prawny na styczeń 2026.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* FAQ */}
            <div className="py-16 bg-white">
                <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                    <h2 className="text-2xl font-bold mb-8 text-center text-gray-900">
                        Najczęstsze pytania
                    </h2>
                    <div className="space-y-4">
                        <details className="group border border-gray-200 rounded-xl bg-white overflow-hidden transition-all duration-300 hover:shadow-sm">
                            <summary className="flex items-center justify-between p-6 cursor-pointer font-medium text-gray-900">
                                Kiedy stosuje się Kodeks Pracy?
                                <ChevronRight className="h-5 w-5 text-gray-400 transition-transform group-open:rotate-90" />
                            </summary>
                            <div className="px-6 pb-6 pt-0 text-gray-600">
                                Kodeks Pracy stosuje się do stosunków pracy
                                nawiązanych na podstawie umowy o pracę,
                                powołania, wyboru, mianowania lub spółdzielczej
                                umowy o pracę. Nie dotyczy umów cywilnoprawnych
                                (zlecenie, dzieło).
                            </div>
                        </details>

                        <details className="group border border-gray-200 rounded-xl bg-white overflow-hidden transition-all duration-300 hover:shadow-sm">
                            <summary className="flex items-center justify-between p-6 cursor-pointer font-medium text-gray-900">
                                Kto kontroluje przestrzeganie Kodeksu Pracy?
                                <ChevronRight className="h-5 w-5 text-gray-400 transition-transform group-open:rotate-90" />
                            </summary>
                            <div className="px-6 pb-6 pt-0 text-gray-600">
                                Głównym organem kontrolującym jest Państwowa
                                Inspekcja Pracy (PIP). Inspektorzy PIP mogą
                                przeprowadzać kontrole bez zapowiedzi, nakładać
                                mandaty i wydawać nakazy.
                            </div>
                        </details>

                        <details className="group border border-gray-200 rounded-xl bg-white overflow-hidden transition-all duration-300 hover:shadow-sm">
                            <summary className="flex items-center justify-between p-6 cursor-pointer font-medium text-gray-900">
                                Co grozi za łamanie Kodeksu Pracy?
                                <ChevronRight className="h-5 w-5 text-gray-400 transition-transform group-open:rotate-90" />
                            </summary>
                            <div className="px-6 pb-6 pt-0 text-gray-600">
                                Za wykroczenia przeciwko prawom pracownika grozi
                                grzywna od 1000 do 30000 zł. W poważniejszych
                                przypadkach (np. uporczywe naruszanie praw) może
                                grozić odpowiedzialność karna.
                            </div>
                        </details>
                    </div>
                </div>
            </div>

            <CTABanner
                variant="gradient"
                title="Bądź na bieżąco z przepisami"
                description="Zapisz się do newslettera, aby otrzymywać powiadomienia o zmianach w Kodeksie Pracy."
                primaryButton={{
                    text: "Zapisz się",
                    href: "#newsletter",
                }}
            />
        </SEOPageLayout>
    );
}
