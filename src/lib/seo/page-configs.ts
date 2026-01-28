/**
 * =============================================================================
 * SEO PAGE CONFIGURATIONS
 * =============================================================================
 *
 * Konfiguracje stron SEO dla dynamicznego generowania.
 * Używane przez generateStaticParams i generateMetadata.
 */

import { MONTH_NAMES } from "@/lib/utils/date-helpers";

// =============================================================================
// TYPES
// =============================================================================

export interface ToolPageConfig {
    slug: string;
    title: string;
    description: string;
    keywords: string[];
    h1: string;
    schema: ("FAQ" | "HowTo" | "Calculator" | "Event" | "Article")[];
}

export interface MonthPageConfig {
    slug: string;
    month: number;
    year: number;
    monthName: string;
    title: string;
    description: string;
    keywords: string[];
}

export interface IndustryPageConfig {
    slug: string;
    name: string;
    icon: string;
    title: string;
    description: string;
    keywords: string[];
    challenges: string[];
    features: string[];
}

// =============================================================================
// TOOL PAGES - /narzedzia/
// =============================================================================

export const TOOL_PAGES: ToolPageConfig[] = [
    {
        slug: "niedziele-handlowe-2026",
        title: "Niedziele Handlowe 2026 - Pełna Lista i Kalendarz",
        description:
            "Sprawdź wszystkie niedziele handlowe w 2026 roku. Pełna lista dat, kalendarz do pobrania i eksport do kalendarza. Zgodne z polskim prawem.",
        keywords: [
            "niedziele handlowe 2026",
            "kiedy niedziela handlowa",
            "kalendarz niedziel handlowych",
            "niedziele wolne od handlu 2026",
            "lista niedziel handlowych",
        ],
        h1: "Niedziele Handlowe 2026",
        schema: ["Event", "FAQ"],
    },
    {
        slug: "wymiar-czasu-pracy-2026",
        title: "Wymiar Czasu Pracy 2026 - Kalendarz z Godzinami",
        description:
            "Wymiar czasu pracy 2026 - kalendarz z zaznaczonymi świętami i niedzielami. Sprawdź ile godzin pracy w każdym miesiącu.",
        keywords: [
            "wymiar czasu pracy 2026",
            "kalkulator czasu pracy",
            "ile godzin pracy 2026",
            "dni robocze 2026",
            "godziny pracy w miesiącu",
            "kalendarz dni roboczych",
        ],
        h1: "Wymiar Czasu Pracy 2026",
        schema: ["Calculator", "FAQ"],
    },
    {
        slug: "kalkulator-wynagrodzen",
        title: "Kalkulator Wynagrodzeń 2026 - Brutto Netto",
        description:
            "Przelicz wynagrodzenie brutto na netto. Kalkulator uwzględnia składki ZUS, podatek i najnowsze stawki 2026.",
        keywords: [
            "kalkulator wynagrodzeń",
            "brutto netto 2026",
            "kalkulator pensji",
            "wynagrodzenie netto",
            "oblicz pensję",
        ],
        h1: "Kalkulator Wynagrodzeń Brutto-Netto 2026",
        schema: ["Calculator", "FAQ"],
    },
    {
        slug: "kalendarz-dni-roboczych-2026",
        title: "Kalendarz Dni Roboczych 2026 - Święta i Dni Wolne",
        description:
            "Pełny kalendarz dni roboczych 2026. Wszystkie święta, dni wolne i długie weekendy. Do druku PDF.",
        keywords: [
            "dni robocze 2026",
            "kalendarz 2026",
            "święta 2026",
            "dni wolne od pracy",
            "kalendarz do druku",
        ],
        h1: "Kalendarz Dni Roboczych 2026",
        schema: ["Event", "FAQ"],
    },
    {
        slug: "kalkulator-nadgodzin",
        title: "Kalkulator Nadgodzin 2026 - Oblicz Dodatek 50% i 100%",
        description:
            "Bezpłatny kalkulator nadgodzin online. Oblicz ile wynosi dodatek za nadgodziny 50% i 100%. Sprawdź limity roczne i zasady rozliczania.",
        keywords: [
            "kalkulator nadgodzin",
            "nadgodziny kalkulator",
            "dodatek za nadgodziny",
            "nadgodziny 50%",
            "nadgodziny 100%",
            "limit nadgodzin",
        ],
        h1: "Kalkulator Nadgodzin 2026",
        schema: ["Calculator", "FAQ"],
    },
    {
        slug: "kalkulator-urlopu",
        title: "Kalkulator Urlopu Wypoczynkowego 2026 - Ile Dni Ci Przysługuje",
        description:
            "Bezpłatny kalkulator urlopu online. Oblicz ile dni urlopu wypoczynkowego Ci przysługuje. Uwzględnia staż pracy i wykształcenie.",
        keywords: [
            "kalkulator urlopu",
            "urlop wypoczynkowy",
            "ile dni urlopu",
            "wymiar urlopu",
            "urlop proporcjonalny",
            "20 dni urlopu",
            "26 dni urlopu",
        ],
        h1: "Kalkulator Urlopu Wypoczynkowego 2026",
        schema: ["Calculator", "FAQ"],
    },
];

// =============================================================================
// MONTH PAGES - /grafik-pracy/[miesiac]-2026
// =============================================================================

export function generateMonthPages(year: number): MonthPageConfig[] {
    const monthSlugs = [
        "styczen",
        "luty",
        "marzec",
        "kwiecien",
        "maj",
        "czerwiec",
        "lipiec",
        "sierpien",
        "wrzesien",
        "pazdziernik",
        "listopad",
        "grudzien",
    ];

    return monthSlugs.map((slug, index) => ({
        slug: `${slug}-${year}`,
        month: index + 1,
        year,
        monthName: MONTH_NAMES[index],
        title: `Grafik Pracy ${MONTH_NAMES[index]} ${year} - Dni Robocze i Święta`,
        description: `Grafik pracy na ${MONTH_NAMES[
            index
        ].toLowerCase()} ${year}. Dni robocze, święta, godziny pracy. Darmowy szablon PDF do pobrania.`,
        keywords: [
            `grafik pracy ${MONTH_NAMES[index].toLowerCase()} ${year}`,
            `dni robocze ${MONTH_NAMES[index].toLowerCase()}`,
            `ile dni pracy ${MONTH_NAMES[index].toLowerCase()}`,
            `kalendarz ${MONTH_NAMES[index].toLowerCase()} ${year}`,
        ],
    }));
}

export const MONTH_PAGES_2026 = generateMonthPages(2026);

// =============================================================================
// INDUSTRY PAGES - /grafik-pracy/[branza]
// =============================================================================

export const INDUSTRY_PAGES: IndustryPageConfig[] = [
    {
        slug: "sklep",
        name: "Sklep",
        icon: "Store",
        title: "Grafik Pracy dla Sklepu - Szablon i Generator",
        description:
            "Profesjonalny grafik pracy dla sklepu. Uwzględnia niedziele handlowe, rotacje zmian i sezonowość. Darmowy szablon.",
        keywords: [
            "grafik pracy sklep",
            "grafik dla sklepu",
            "harmonogram pracy handel",
            "grafik sprzedawcy",
        ],
        challenges: [
            "Niedziele handlowe i niehandlowe",
            "Rotacja weekendowa",
            "Sezonowe zwiększenie obsady",
            "Zmiany poranne i popołudniowe",
        ],
        features: [
            "Automatyczne wykrywanie niedziel handlowych",
            "Rotacja weekendowa",
            "Planowanie na okresy świąteczne",
        ],
    },
    {
        slug: "restauracja",
        name: "Restauracja",
        icon: "Utensils",
        title: "Grafik Pracy dla Restauracji - Gastronomia",
        description:
            "Grafik pracy dla restauracji i gastronomii. Zmiany kuchenne, kelnerskie, weekendy. Generator online.",
        keywords: [
            "grafik pracy restauracja",
            "grafik gastronomia",
            "harmonogram kelner",
            "grafik kuchnia",
        ],
        challenges: [
            "Podwójne obsady w weekendy",
            "Różne stanowiska (kuchnia, sala)",
            "Praca do późna",
            "Sezonowe eventy",
        ],
        features: [
            "Oddzielne grafiki dla kuchni i sali",
            "Wzmocnienia weekendowe",
            "Planowanie eventów specjalnych",
        ],
    },
    {
        slug: "ochrona",
        name: "Ochrona",
        icon: "Shield",
        title: "Grafik Pracy dla Ochrony - Zmiany 12h i 24h",
        description:
            "Grafik pracy dla firm ochroniarskich. System 12/24h, zmiany nocne, równoważny czas pracy.",
        keywords: [
            "grafik pracy ochrona",
            "grafik ochroniarz",
            "zmiany 12 godzin",
            "praca nocna grafik",
        ],
        challenges: [
            "System równoważny 12/24h",
            "Zapewnienie ciągłości",
            "Zmiany nocne",
            "Odpoczynki między zmianami",
        ],
        features: [
            "System zmian 12h i 24h",
            "Automatyczne odpoczynki",
            "Ciągłość obsady 24/7",
        ],
    },
    {
        slug: "produkcja",
        name: "Produkcja",
        icon: "Factory",
        title: "Grafik Pracy dla Produkcji - Zmiany Fabryczne",
        description:
            "Grafik pracy dla zakładów produkcyjnych. System 3-zmianowy, rotacje, praca ciągła.",
        keywords: [
            "grafik pracy produkcja",
            "grafik fabryka",
            "system 3 zmianowy",
            "grafik zakład produkcyjny",
        ],
        challenges: [
            "Praca ciągła 24/7",
            "System 3-zmianowy",
            "Rotacje tygodniowe",
            "Nadgodziny produkcyjne",
        ],
        features: [
            "System 3 zmian z rotacją",
            "Planowanie przestojów",
            "Zarządzanie nadgodzinami",
        ],
    },
    {
        slug: "hotel",
        name: "Hotel",
        icon: "Building",
        title: "Grafik Pracy dla Hotelu - Recepcja i Housekeeping",
        description:
            "Grafik pracy dla hoteli. Recepcja 24h, housekeeping, różne działy. Generator online.",
        keywords: [
            "grafik pracy hotel",
            "grafik recepcja",
            "harmonogram housekeeping",
            "grafik hotelowy",
        ],
        challenges: [
            "Recepcja 24/7",
            "Różne działy i stanowiska",
            "Sezonowość turystyczna",
            "Koordynacja z eventami",
        ],
        features: [
            "Grafiki per dział",
            "Sezonowe planowanie",
            "Integracja z systemem rezerwacji",
        ],
    },
    {
        slug: "magazyn",
        name: "Magazyn",
        icon: "Package",
        title: "Grafik Pracy dla Magazynu - Logistyka",
        description:
            "Grafik pracy dla magazynu i logistyki. Zmiany, kompletacja, wysyłka. Darmowy generator.",
        keywords: [
            "grafik pracy magazyn",
            "grafik logistyka",
            "harmonogram magazynier",
            "grafik centrum dystrybucji",
        ],
        challenges: [
            "Piki sezonowe (święta, promocje)",
            "Różne strefy magazynu",
            "Koordynacja z dostawami",
            "Praca weekendowa",
        ],
        features: [
            "Planowanie na piki",
            "Strefy i stanowiska",
            "Elastyczne zmiany",
        ],
    },
    {
        slug: "biuro",
        name: "Biuro",
        icon: "Briefcase",
        title: "Grafik Pracy dla Biura - Praca Hybrydowa",
        description:
            "Grafik pracy dla biura. Praca hybrydowa, zdalna, elastyczne godziny. Planowanie zespołów.",
        keywords: [
            "grafik pracy biuro",
            "praca hybrydowa grafik",
            "harmonogram biurowy",
            "grafik praca zdalna",
        ],
        challenges: [
            "Praca hybrydowa",
            "Różne zespoły i projekty",
            "Elastyczne godziny",
            "Koordynacja spotkań",
        ],
        features: [
            "Tryb stacjonarny/zdalny",
            "Rezerwacja biurek",
            "Kalendarz zespołu",
        ],
    },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getMonthPageBySlug(slug: string): MonthPageConfig | undefined {
    return MONTH_PAGES_2026.find((page) => page.slug === slug);
}

export function getIndustryPageBySlug(
    slug: string,
): IndustryPageConfig | undefined {
    return INDUSTRY_PAGES.find((page) => page.slug === slug);
}

export function getAllMonthSlugs(): string[] {
    return MONTH_PAGES_2026.map((page) => page.slug);
}

export function getAllIndustrySlugs(): string[] {
    return INDUSTRY_PAGES.map((page) => page.slug);
}
