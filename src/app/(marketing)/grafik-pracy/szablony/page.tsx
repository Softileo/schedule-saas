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
import { generateSEOMetadata } from "@/lib/seo/metadata";
import { generateFAQSchema, generateBreadcrumbSchema } from "@/lib/seo/schemas";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    FileSpreadsheet,
    FileText,
    Download,
    ExternalLink,
    CheckCircle2,
    Users,
    Clock,
    Calendar,
} from "lucide-react";

export const metadata: Metadata = generateSEOMetadata({
    title: "Szablony Grafiku Pracy - Excel, PDF, do Druku | Darmowe",
    description:
        "Darmowe szablony grafiku pracy do pobrania. Excel, PDF, Google Sheets. Gotowe do użycia, zgodne z Kodeksem Pracy. Pobierz teraz!",
    keywords: [
        "grafik pracy excel",
        "grafik pracy pdf",
        "szablon grafiku pracy",
        "grafik pracy do druku",
        "grafik pracy google sheets",
        "darmowy grafik pracy",
    ],
    canonical: "/grafik-pracy/szablony",
});

// FAQ
const faqs = [
    {
        question: "Czy szablony są darmowe?",
        answer: "Tak, wszystkie szablony grafiku pracy są całkowicie darmowe. Możesz je pobierać, edytować i używać bez żadnych ograniczeń.",
    },
    {
        question: "Czy szablony są zgodne z Kodeksem Pracy?",
        answer: "Szablony zawierają pola do wprowadzania danych zgodnych z wymogami Kodeksu Pracy, ale to użytkownik odpowiada za prawidłowe wypełnienie grafiku zgodnie z przepisami.",
    },
    {
        question: "Jak edytować szablon Excel?",
        answer: "Pobierz plik i otwórz go w Microsoft Excel, LibreOffice Calc lub Google Sheets. Możesz edytować wszystkie pola, dodawać pracowników i dostosowywać do swoich potrzeb.",
    },
    {
        question: "Czy mogę wydrukować szablon PDF?",
        answer: "Tak, szablony PDF są zoptymalizowane do druku w formacie A4. Zalecamy druk w orientacji poziomej dla lepszej czytelności.",
    },
    {
        question: "Jak używać szablonu Google Sheets?",
        answer: "Kliknij link, aby otworzyć szablon w Google Sheets. Następnie wybierz Plik → Utwórz kopię, aby zapisać własną wersję do edycji.",
    },
];

// Kategorie szablonów
const TEMPLATE_CATEGORIES = [
    {
        id: "weekly",
        name: "Grafik tygodniowy",
        description: "Planowanie na 7 dni, idealny dla małych zespołów",
        icon: Calendar,
        color: "blue",
    },
    {
        id: "monthly",
        name: "Grafik miesięczny",
        description: "Pełny miesiąc na jednej stronie",
        icon: FileSpreadsheet,
        color: "emerald",
    },
    {
        id: "shift",
        name: "Grafik zmianowy",
        description: "Dla pracy na zmiany (8h, 12h, 24h)",
        icon: Clock,
        color: "violet",
    },
    {
        id: "industry",
        name: "Branżowe",
        description: "Dopasowane do specyfiki branży",
        icon: Users,
        color: "amber",
    },
];

// Szablony
const TEMPLATES = [
    {
        id: 1,
        name: "Grafik tygodniowy - podstawowy",
        category: "weekly",
        format: "Excel",
        formatIcon: FileSpreadsheet,
        description: "Prosty grafik na 7 dni dla zespołu do 10 osób",
        features: ["Do 10 pracowników", "Godziny pracy", "Suma godzin"],
        popular: true,
        downloadUrl: "#",
    },
    {
        id: 2,
        name: "Grafik miesięczny - pełny",
        category: "monthly",
        format: "Excel",
        formatIcon: FileSpreadsheet,
        description: "Rozbudowany grafik z automatycznym liczeniem godzin",
        features: [
            "31 dni",
            "Formuły automatyczne",
            "Podsumowanie miesięczne",
            "Święta PL",
        ],
        popular: true,
        downloadUrl: "#",
    },
    {
        id: 3,
        name: "Grafik zmianowy 12h",
        category: "shift",
        format: "Excel",
        formatIcon: FileSpreadsheet,
        description: "Dla systemu równoważnego czasu pracy",
        features: [
            "Zmiany 12h",
            "Rotacja zmian",
            "Nocne/dzienne",
            "Kontrola odpoczynku",
        ],
        downloadUrl: "#",
    },
    {
        id: 4,
        name: "Grafik tygodniowy - do druku",
        category: "weekly",
        format: "PDF",
        formatIcon: FileText,
        description: "Gotowy do wydruku w formacie A4",
        features: ["Format A4", "Czytelny druk", "Miejsce na notatki"],
        downloadUrl: "#",
    },
    {
        id: 5,
        name: "Grafik dla sklepu",
        category: "industry",
        format: "Excel",
        formatIcon: FileSpreadsheet,
        description: "Z uwzględnieniem niedziel handlowych",
        features: [
            "Niedziele handlowe 2026",
            "Rotacja weekendowa",
            "Godziny otwarcia",
        ],
        downloadUrl: "#",
    },
    {
        id: 6,
        name: "Grafik dla restauracji",
        category: "industry",
        format: "Excel",
        formatIcon: FileSpreadsheet,
        description: "Kuchnia i sala osobno",
        features: [
            "Podział stanowisk",
            "Zmiany wieczorne",
            "Weekendy wzmocnione",
        ],
        downloadUrl: "#",
    },
    {
        id: 7,
        name: "Grafik miesięczny - Google Sheets",
        category: "monthly",
        format: "Google Sheets",
        formatIcon: FileSpreadsheet,
        description: "Edycja online, współdzielenie z zespołem",
        features: [
            "Współpraca w czasie rzeczywistym",
            "Dostęp z każdego urządzenia",
            "Automatyczne kopie",
        ],
        isOnline: true,
        downloadUrl: "#",
    },
    {
        id: 8,
        name: "Grafik dla ochrony - 24h",
        category: "shift",
        format: "Excel",
        formatIcon: FileSpreadsheet,
        description: "System zmian 24-godzinnych",
        features: [
            "Dyżury 24h",
            "Ciągłość obsady",
            "Kontrola norm czasu",
            "Odpoczynki",
        ],
        downloadUrl: "#",
    },
];

export default function SzablonyPage() {
    // Breadcrumbs
    const breadcrumbItems = [
        { name: "Strona główna", url: "https://calenda.pl" },
        { name: "Grafik pracy", url: "https://calenda.pl/grafik-pracy" },
        {
            name: "Szablony",
            url: "https://calenda.pl/grafik-pracy/szablony",
        },
    ];

    return (
        <SEOPageLayout>
            {/* Schema */}
            <SchemaScript
                schema={[
                    generateFAQSchema(faqs),
                    generateBreadcrumbSchema(breadcrumbItems),
                ]}
            />

            {/* Breadcrumbs */}
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-8">
                <Breadcrumbs
                    items={[
                        { label: "Grafik pracy", href: "/grafik-pracy" },
                        { label: "Szablony" },
                    ]}
                />
            </div>

            {/* Hero */}
            <UniversalHero
                badge={{ icon: Download, text: "Darmowe pobieranie" }}
                title="Szablony Grafiku Pracy"
                titleHighlight="Do Pobrania"
                subtitle="Darmowe szablony Excel, PDF i Google Sheets. Gotowe do użycia, łatwe w edycji. Wybierz szablon dopasowany do Twoich potrzeb."
            />

            {/* Kategorie */}
            <section className="pb-12">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
                        {TEMPLATE_CATEGORIES.map((cat) => {
                            const Icon = cat.icon;
                            const colorClasses = {
                                blue: "bg-blue-50 border-blue-100 text-blue-600",
                                emerald:
                                    "bg-emerald-50 border-emerald-100 text-emerald-600",
                                violet: "bg-violet-50 border-violet-100 text-violet-600",
                                amber: "bg-amber-50 border-amber-100 text-amber-600",
                            };
                            return (
                                <Card
                                    key={cat.id}
                                    className={`p-4 rounded-xl text-center ${
                                        colorClasses[
                                            cat.color as keyof typeof colorClasses
                                        ]
                                    }`}
                                >
                                    <Icon className="w-6 h-6 mx-auto mb-2" />
                                    <h3 className="font-semibold text-gray-900 text-sm">
                                        {cat.name}
                                    </h3>
                                    <p className="text-xs text-gray-600 mt-1">
                                        {cat.description}
                                    </p>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Lista szablonów */}
            <section className="py-12 bg-gray-50/50">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-5xl mx-auto">
                        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8 text-center">
                            Wszystkie szablony
                        </h2>

                        <div className="grid md:grid-cols-2 gap-6">
                            {TEMPLATES.map((template) => {
                                const FormatIcon = template.formatIcon;
                                return (
                                    <Card
                                        key={template.id}
                                        className="p-6 rounded-xl bg-white hover:shadow-lg transition-shadow"
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                                    <FormatIcon className="w-5 h-5 text-blue-600" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-gray-900">
                                                        {template.name}
                                                    </h3>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <Badge
                                                            variant="secondary"
                                                            className="text-xs"
                                                        >
                                                            {template.format}
                                                        </Badge>
                                                        {/* {template.popular && (
                                                            <Badge className="bg-amber-100 text-amber-700 text-xs">
                                                                <Star className="w-3 h-3 mr-1" />
                                                                Popularne
                                                            </Badge>
                                                        )} */}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <p className="text-sm text-gray-600 mb-4">
                                            {template.description}
                                        </p>

                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {template.features.map(
                                                (feature, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="inline-flex items-center text-xs text-gray-500"
                                                    >
                                                        <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-500" />
                                                        {feature}
                                                    </span>
                                                ),
                                            )}
                                        </div>

                                        <Button
                                            className="w-full"
                                            variant={
                                                template.isOnline
                                                    ? "outline"
                                                    : "default"
                                            }
                                            disabled
                                        >
                                            {template.isOnline ? (
                                                <>
                                                    <ExternalLink className="w-4 h-4 mr-2" />
                                                    Otwórz online (wkrótce)
                                                </>
                                            ) : (
                                                <>
                                                    <Download className="w-4 h-4 mr-2" />
                                                    Pobierz (wkrótce)
                                                </>
                                            )}
                                        </Button>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </section>

            {/* Korzyści automatycznego generatora */}
            <section className="py-12">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-4xl mx-auto">
                        <Card className="p-8 rounded-2xl bg-linear-to-br from-blue-600 to-violet-600 text-white">
                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-bold mb-2">
                                    Szablony to za mało?
                                </h2>
                                <p className="text-blue-100">
                                    Wypróbuj automatyczny generator grafików z
                                    AI
                                </p>
                            </div>

                            <div className="grid sm:grid-cols-3 gap-6 mb-8">
                                <div className="text-center">
                                    <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mx-auto mb-3">
                                        <Clock className="w-6 h-6" />
                                    </div>
                                    <h3 className="font-semibold mb-1">
                                        Oszczędność czasu
                                    </h3>
                                    <p className="text-sm text-blue-100">
                                        Grafik w 2 minuty zamiast godzin
                                    </p>
                                </div>
                                <div className="text-center">
                                    <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mx-auto mb-3">
                                        <CheckCircle2 className="w-6 h-6" />
                                    </div>
                                    <h3 className="font-semibold mb-1">
                                        Zgodność z prawem
                                    </h3>
                                    <p className="text-sm text-blue-100">
                                        Automatyczna kontrola norm czasu pracy
                                    </p>
                                </div>
                                <div className="text-center">
                                    <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mx-auto mb-3">
                                        <Users className="w-6 h-6" />
                                    </div>
                                    <h3 className="font-semibold mb-1">
                                        Preferencje zespołu
                                    </h3>
                                    <p className="text-sm text-blue-100">
                                        Uwzględnianie dostępności pracowników
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Button
                                    size="lg"
                                    variant="secondary"
                                    className="bg-white text-blue-600 hover:bg-blue-50"
                                    asChild
                                >
                                    <Link href="/rejestracja">
                                        Wypróbuj za darmo
                                    </Link>
                                </Button>
                                <Button
                                    size="lg"
                                    variant="outline"
                                    className="border-white/30 text-violet-600 hover:bg-white/80"
                                    asChild
                                >
                                    <Link href="/#demo">Zobacz demo</Link>
                                </Button>
                            </div>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Jak używać */}
            <section className="py-12 bg-gray-50/50">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-3xl mx-auto">
                        <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
                            Jak używać szablonów?
                        </h2>

                        <div className="space-y-4">
                            {[
                                {
                                    step: 1,
                                    title: "Pobierz szablon",
                                    desc: "Wybierz szablon odpowiedni dla Twojej firmy i kliknij Pobierz",
                                },
                                {
                                    step: 2,
                                    title: "Otwórz w programie",
                                    desc: "Excel, Google Sheets lub wydrukuj PDF",
                                },
                                {
                                    step: 3,
                                    title: "Dostosuj do siebie",
                                    desc: "Dodaj pracowników, ustaw godziny pracy, wypełnij grafik",
                                },
                                {
                                    step: 4,
                                    title: "Udostępnij zespołowi",
                                    desc: "Wydrukuj lub wyślij elektronicznie",
                                },
                            ].map((item) => (
                                <Card
                                    key={item.step}
                                    className="p-4 rounded-xl bg-white"
                                >
                                    <div className="flex gap-4">
                                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shrink-0 text-sm">
                                            {item.step}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900">
                                                {item.title}
                                            </h3>
                                            <p className="text-sm text-gray-600">
                                                {item.desc}
                                            </p>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <FAQSectionDynamic title="Pytania o szablony" faqs={faqs} />

            {/* CTA */}
            <CTABanner
                variant="gradient"
                title="Wygeneruj grafik automatycznie"
                description="Szablony to dopiero początek. Wypróbuj inteligentny generator grafików."
                primaryButton={{
                    text: "Rozpocznij za darmo",
                    href: "/rejestracja",
                }}
                secondaryButton={{
                    text: "Wróć do grafik-pracy",
                    href: "/grafik-pracy",
                }}
            />
        </SEOPageLayout>
    );
}
