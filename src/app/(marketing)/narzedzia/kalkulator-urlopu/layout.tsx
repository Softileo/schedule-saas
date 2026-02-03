import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Kalkulator urlopu wypoczynkowego 2026 - Oblicz ile dni Ci przysługuje | Calenda",
    description:
        "Bezpłatny kalkulator urlopu online. Oblicz ile dni urlopu wypoczynkowego Ci przysługuje. Uwzględnia staż pracy, wykształcenie, wymiar etatu i urlop proporcjonalny.",
    keywords: [
        "kalkulator urlopu",
        "urlop wypoczynkowy",
        "ile dni urlopu",
        "urlop kalkulator",
        "wymiar urlopu",
        "urlop proporcjonalny",
        "staż pracy urlop",
        "wykształcenie urlop",
        "20 dni urlopu",
        "26 dni urlopu",
    ],
    openGraph: {
        title: "Kalkulator urlopu wypoczynkowego 2026 - Oblicz ile dni Ci przysługuje",
        description:
            "Bezpłatny kalkulator urlopu online. Oblicz ile dni urlopu wypoczynkowego Ci przysługuje.",
        type: "website",
        url: "https://calenda.pl/narzedzia/kalkulator-urlopu",
    },
    alternates: {
        canonical: "https://calenda.pl/narzedzia/kalkulator-urlopu",
    },
};

export default function VacationCalculatorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
