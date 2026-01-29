import { Metadata } from "next";
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
import { Scale, Clock, Bed, Timer } from "lucide-react";

export const metadata: Metadata = {
    title: "Kodeks Pracy 2026 - aktualne przepisy o czasie pracy | Calenda",
    description:
        "Kodeks Pracy 2026: aktualne przepisy o czasie pracy, nadgodzinach i odpoczynku. Stan prawny 2026 z odwołaniem do oficjalnych źródeł.",
};

export default function LaborCode2026Page() {
    const breadcrumbs = [
        { name: "Strona główna", url: "https://calenda.pl" },
        {
            name: "Kodeks pracy 2026",
            url: "https://calenda.pl/kodeks-pracy-2026",
        },
    ];

    return (
        <SEOPageLayout>
            <SchemaScript schema={[generateBreadcrumbSchema(breadcrumbs)]} />

            <div className="container mx-auto px-4 pt-8">
                <Breadcrumbs items={[{ label: "Kodeks pracy 2026" }]} />
            </div>

            <UniversalHero
                badge={{ icon: Scale, text: "Stan prawny 2026" }}
                title="Kodeks Pracy"
                titleHighlight="2026"
                subtitle="Aktualne przepisy regulujące czas pracy, odpoczynek i nadgodziny. Oparte na obowiązującym prawie i oficjalnych źródłach rządowych."
            />

            {/* TREŚĆ MERYTORYCZNA SEO */}
            {/* TREŚĆ MERYTORYCZNA SEO - WERSJA ULEPSZONA */}
            <section className="py-20">
                <div className="container mx-auto px-4 max-w-4xl space-y-12">
                    {/* INTRO */}
                    <header className="text-center space-y-4">
                        <Badge variant="secondary" className="mx-auto">
                            Prawo pracy • stan prawny 2026
                        </Badge>
                        <h2 className="text-3xl font-bold text-gray-900">
                            Kodeks Pracy 2026 - najważniejsze informacje
                        </h2>
                        <p className="text-gray-600 text-lg">
                            Poniżej znajdziesz aktualne i obowiązujące przepisy
                            Kodeksu Pracy dotyczące czasu pracy, odpoczynku oraz
                            nadgodzin - opisane prostym językiem i oparte na
                            oficjalnych źródłach rządowych.
                        </p>
                    </header>

                    {/* CZYM JEST KP */}
                    <Card className="p-8 rounded-2xl space-y-4">
                        <div className="flex items-center gap-3">
                            <Scale className="w-6 h-6 text-blue-600" />
                            <h3 className="text-2xl font-semibold text-gray-900">
                                Czym jest Kodeks Pracy w 2026 roku?
                            </h3>
                        </div>

                        <p className="text-gray-700 leading-relaxed">
                            Kodeks Pracy to podstawowy akt prawny regulujący
                            stosunek pracy w Polsce. Określa on prawa i
                            obowiązki zarówno pracowników, jak i pracodawców, w
                            tym zasady dotyczące czasu pracy, wynagrodzeń,
                            urlopów oraz odpowiedzialności stron.
                        </p>

                        <p className="text-gray-700 leading-relaxed">
                            W 2026 roku obowiązuje ustawa z dnia 26 czerwca 1974
                            r. - Kodeks pracy, wraz z późniejszymi
                            nowelizacjami. Oficjalny i aktualny tekst
                            publikowany jest w systemie ISAP prowadzonym przez
                            Sejm RP.
                        </p>

                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm">
                            <span className="font-medium text-gray-900">
                                Podstawa prawna:
                            </span>{" "}
                            <a
                                href="https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU19740240141"
                                target="_blank"
                                className="text-blue-600 underline"
                            >
                                Ustawa - Kodeks pracy (ISAP)
                            </a>
                        </div>
                    </Card>

                    {/* CZAS PRACY */}
                    <Card className="p-8 rounded-2xl space-y-4">
                        <div className="flex items-center gap-3">
                            <Clock className="w-6 h-6 text-emerald-600" />
                            <h3 className="text-2xl font-semibold text-gray-900">
                                Czas pracy - normy i limity w 2026
                            </h3>
                        </div>

                        <p className="text-gray-700 leading-relaxed">
                            Zgodnie z Kodeksem pracy, standardowy czas pracy nie
                            może przekraczać 8 godzin na dobę oraz przeciętnie
                            40 godzin w przeciętnie pięciodniowym tygodniu
                            pracy, w ramach przyjętego okresu rozliczeniowego.
                        </p>

                        <p className="text-gray-700 leading-relaxed">
                            Przepisy dopuszczają jednak stosowanie różnych
                            systemów czasu pracy, w tym systemu równoważnego,
                            który pozwala na wydłużenie dobowego wymiaru pracy
                            przy zachowaniu średnich norm tygodniowych.
                        </p>

                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-sm">
                            <span className="font-medium text-gray-900">
                                Podstawa prawna:
                            </span>{" "}
                            art. 129-131{" "}
                            <a
                                href="https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU19740240141"
                                target="_blank"
                                className="text-emerald-700 underline"
                            >
                                Kodeksu pracy
                            </a>
                        </div>
                    </Card>

                    {/* ODPOCZYNEK */}
                    <Card className="p-8 rounded-2xl space-y-4">
                        <div className="flex items-center gap-3">
                            <Bed className="w-6 h-6 text-indigo-600" />
                            <h3 className="text-2xl font-semibold text-gray-900">
                                Odpoczynek dobowy i tygodniowy
                            </h3>
                        </div>

                        <p className="text-gray-700 leading-relaxed">
                            Każdy pracownik ma prawo do co najmniej 11 godzin
                            nieprzerwanego odpoczynku w każdej dobie
                            pracowniczej. Dodatkowo w każdym tygodniu
                            przysługuje mu minimum 35 godzin nieprzerwanego
                            odpoczynku.
                        </p>

                        <p className="text-gray-700 leading-relaxed">
                            Odpoczynek tygodniowy powinien co do zasady
                            obejmować niedzielę, jednak w określonych systemach
                            czasu pracy możliwe są wyjątki, o ile zachowane
                            zostaną ustawowe minima.
                        </p>

                        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-sm">
                            <span className="font-medium text-gray-900">
                                Podstawa prawna:
                            </span>{" "}
                            art. 132-133{" "}
                            <a
                                href="https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU19740240141"
                                target="_blank"
                                className="text-indigo-700 underline"
                            >
                                Kodeksu pracy
                            </a>
                        </div>
                    </Card>

                    {/* NADGODZINY */}
                    <Card className="p-8 rounded-2xl space-y-4">
                        <div className="flex items-center gap-3">
                            <Timer className="w-6 h-6 text-rose-600" />
                            <h3 className="text-2xl font-semibold text-gray-900">
                                Nadgodziny - zasady w 2026 roku
                            </h3>
                        </div>

                        <p className="text-gray-700 leading-relaxed">
                            Praca w godzinach nadliczbowych występuje w
                            przypadku przekroczenia norm czasu pracy lub
                            przedłużonego dobowego wymiaru wynikającego z
                            obowiązującego systemu.
                        </p>

                        <p className="text-gray-700 leading-relaxed">
                            Co do zasady, roczny limit nadgodzin dla jednego
                            pracownika wynosi 150 godzin, chyba że wewnętrzne
                            przepisy zakładowe przewidują inny limit, zgodny z
                            Kodeksem pracy.
                        </p>

                        <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-sm">
                            <span className="font-medium text-gray-900">
                                Podstawa prawna:
                            </span>{" "}
                            art. 151{" "}
                            <a
                                href="https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU19740240141"
                                target="_blank"
                                className="text-rose-700 underline"
                            >
                                Kodeksu pracy
                            </a>
                        </div>
                    </Card>
                </div>
            </section>

            {/* CTA */}
            <CTABanner
                variant="gradient"
                title="Grafik pracy zgodny z Kodeksem Pracy 2026"
                description="Planuj czas pracy automatycznie i bez ryzyka naruszeń przepisów."
                primaryButton={{
                    text: "Wypróbuj Calenda",
                    href: "/rejestracja",
                }}
            />
        </SEOPageLayout>
    );
}
