import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Wymiar czasu pracy 2026 - Kalkulator godzin i normy czasu pracy | Calenda",
    description:
        "Oblicz wymiar czasu pracy na każdy miesiąc 2026 roku. Kalkulator uwzględnia święta, weekendy i niepełny etat. Zobacz normy dla pełnego etatu, 1/2 i 3/4 etatu.",
    keywords: [
        "wymiar czasu pracy 2026",
        "norma czasu pracy",
        "ile godzin pracy",
        "kalkulator czasu pracy",
        "godziny pracy miesięcznie",
        "wymiar etatu",
        "niepełny etat",
    ],
    openGraph: {
        title: "Wymiar czasu pracy 2026 - Kalkulator godzin i normy czasu pracy",
        description:
            "Oblicz wymiar czasu pracy na każdy miesiąc 2026 roku. Uwzględnia święta, weekendy i niepełny etat.",
        type: "website",
        url: "https://calenda.pl/narzedzia/wymiar-czasu-pracy-2026",
    },
    alternates: {
        canonical: "https://calenda.pl/narzedzia/wymiar-czasu-pracy-2026",
    },
};

export default function WorkTimeCalculatorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
