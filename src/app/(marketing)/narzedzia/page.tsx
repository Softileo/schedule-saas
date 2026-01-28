import { Metadata } from "next";
import {
    SEOPageLayout,
    UniversalHero,
    CTABanner,
    CalculatorCard,
} from "@/components/features/seo";
import { Breadcrumbs } from "@/components/features/seo/breadcrumbs";
import { generateSEOMetadata } from "@/lib/seo/metadata";
import {
    Calculator,
    Calendar,
    Clock,
    DollarSign,
    Timer,
    Palmtree,
} from "lucide-react";

export const metadata: Metadata = generateSEOMetadata({
    title: "Darmowe Narzędzia HR - Kalkulatory i Kalendarze",
    description:
        "Darmowe narzędzia dla HR i kadr. Kalkulator czasu pracy, wynagrodzeń, nadgodzin, urlopu, niedziele handlowe 2026. Wszystko zgodne z polskim prawem.",
    keywords: [
        "narzędzia hr",
        "kalkulator czasu pracy",
        "niedziele handlowe",
        "kalkulator wynagrodzeń",
        "kalkulator nadgodzin",
        "kalkulator urlopu",
        "dni robocze",
    ],
    canonical: "/narzedzia",
});

const tools = [
    {
        icon: Calendar,
        title: "Niedziele Handlowe 2026",
        description:
            "Kalendarz niedziel handlowych. Zobacz które niedziele są handlowe.",
        href: "/narzedzia/niedziele-handlowe-2026",
    },
    {
        icon: Clock,
        title: "Wymiar Czasu Pracy 2026",
        description:
            "Kalendarz z godzinami pracy i świętami. Każdy miesiąc osobno.",
        href: "/narzedzia/wymiar-czasu-pracy-2026",
    },
    {
        icon: DollarSign,
        title: "Kalkulator Wynagrodzeń",
        description:
            "Przelicz wynagrodzenie brutto na netto. Aktualne stawki 2026.",
        href: "/narzedzia/kalkulator-wynagrodzen-netto-brutto-2026",
    },
    {
        icon: Calculator,
        title: "Kalendarz Dni Roboczych",
        description:
            "Pełny kalendarz dni roboczych 2026 z wszystkimi świętami.",
        href: "/narzedzia/kalendarz-dni-roboczych-2026",
    },
    {
        icon: Timer,
        title: "Kalkulator Nadgodzin",
        description:
            "Oblicz dodatek za nadgodziny 50% i 100%. Z limitami rocznymi.",
        href: "/narzedzia/kalkulator-nadgodzin",
    },
    {
        icon: Palmtree,
        title: "Kalkulator Urlopu",
        description:
            "Oblicz ile dni urlopu Ci przysługuje. Uwzględnia wykształcenie.",
        href: "/narzedzia/kalkulator-urlopu",
    },
];

export default function NarzedziaPage() {
    return (
        <SEOPageLayout>
            {/* Breadcrumbs */}
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-8">
                <Breadcrumbs items={[{ label: "Narzędzia" }]} />
            </div>

            {/* Hero */}
            <UniversalHero
                badge={{ text: "Darmowe narzędzia" }}
                title="Narzędzia dla HR"
                titleHighlight="i Kadrowców"
                subtitle="Kalkulatory, kalendarze i szablony do pobrania. Wszystko zgodne z polskim prawem pracy i całkowicie za darmo."
            />

            {/* Tools Grid */}
            <section className="py-16">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                        {tools.map((tool) => (
                            <CalculatorCard
                                key={tool.href}
                                icon={tool.icon}
                                title={tool.title}
                                description={tool.description}
                                href={tool.href}
                                buttonText="Otwórz"
                            />
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="pt-16">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
                    <CTABanner
                        title="Potrzebujesz pełnego systemu grafików?"
                        subtitle="Calenda automatycznie tworzy grafiki pracy zgodne z Kodeksem Pracy."
                        variant="gradient"
                    />
                </div>
            </section>
        </SEOPageLayout>
    );
}
