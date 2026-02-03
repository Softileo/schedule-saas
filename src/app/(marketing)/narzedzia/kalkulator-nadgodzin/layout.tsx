import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Kalkulator nadgodzin 2026 - Oblicz dodatek 50% i 100% | Calenda",
    description:
        "Bezpłatny kalkulator nadgodzin online. Oblicz ile wynosi dodatek za nadgodziny 50% i 100%. Sprawdź limity roczne i zasady rozliczania pracy w godzinach nadliczbowych.",
    keywords: [
        "kalkulator nadgodzin",
        "nadgodziny kalkulator",
        "dodatek za nadgodziny",
        "nadgodziny 50%",
        "nadgodziny 100%",
        "oblicz nadgodziny",
        "limit nadgodzin",
        "nadgodziny kodeks pracy",
        "wynagrodzenie za nadgodziny",
        "praca w godzinach nadliczbowych",
    ],
    openGraph: {
        title: "Kalkulator nadgodzin 2026 - Oblicz dodatek 50% i 100%",
        description:
            "Bezpłatny kalkulator nadgodzin online. Oblicz ile wynosi dodatek za nadgodziny 50% i 100%.",
        type: "website",
        url: "https://calenda.pl/narzedzia/kalkulator-nadgodzin",
    },
    alternates: {
        canonical: "https://calenda.pl/narzedzia/kalkulator-nadgodzin",
    },
};

export default function OvertimeCalculatorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
