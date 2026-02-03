import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Kalkulator wynagrodzeń brutto-netto 2026 - Oblicz wynagrodzenie | Calenda",
    description:
        "Bezpłatny kalkulator wynagrodzeń online. Oblicz wynagrodzenie netto z brutto lub brutto z netto. Uwzględnia składki ZUS, podatek, koszty pracodawcy 2026.",
    keywords: [
        "kalkulator wynagrodzeń",
        "brutto netto",
        "oblicz wynagrodzenie",
        "kalkulator pensji",
        "wynagrodzenie netto",
        "składki ZUS",
        "podatek od wynagrodzenia",
        "koszty pracodawcy",
    ],
    openGraph: {
        title: "Kalkulator wynagrodzeń brutto-netto 2026 - Oblicz wynagrodzenie",
        description:
            "Bezpłatny kalkulator wynagrodzeń online. Oblicz wynagrodzenie netto z brutto lub brutto z netto.",
        type: "website",
        url: "https://calenda.pl/narzedzia/kalkulator-wynagrodzen-netto-brutto-2026",
    },
    alternates: {
        canonical:
            "https://calenda.pl/narzedzia/kalkulator-wynagrodzen-netto-brutto-2026",
    },
};

export default function SalaryCalculatorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
