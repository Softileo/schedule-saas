import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Niedziele handlowe 2026 - Pełna lista i kalendarz | Calenda",
    description:
        "Sprawdź wszystkie 7 niedziel handlowych w 2026 roku. Zobacz kalendarz, pobierz do PDF lub CSV. Dowiedz się kiedy sklepy będą otwarte w niedziele.",
    keywords: [
        "niedziele handlowe 2026",
        "niedziele handlowe",
        "lista niedziel handlowych",
        "kalendarz niedziel handlowych",
        "sklepy otwarte w niedziele",
        "zakaz handlu w niedziele",
        "kiedy sklepy otwarte",
        "niedziele z handlem 2026",
    ],
    openGraph: {
        title: "Niedziele handlowe 2026 - Pełna lista i kalendarz",
        description:
            "Sprawdź wszystkie 7 niedziel handlowych w 2026 roku. Zobacz kalendarz i pobierz listę.",
        type: "website",
        url: "https://calenda.pl/narzedzia/niedziele-handlowe-2026",
    },
    alternates: {
        canonical: "https://calenda.pl/narzedzia/niedziele-handlowe-2026",
    },
};

export default function TradingSundaysLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
