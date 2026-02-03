import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Kalendarz dni roboczych 2026 - Święta, długie weekendy, urlopy | Calenda",
    description:
        "Pełny kalendarz dni roboczych 2026 z oznaczonymi świętami i długimi weekendami. 251 dni roboczych, 13 świąt. Zaplanuj urlopy i dni wolne.",
    keywords: [
        "kalendarz 2026",
        "dni robocze 2026",
        "święta 2026",
        "długie weekendy 2026",
        "ile dni roboczych",
        "kalendarz świąt",
        "planowanie urlopu",
    ],
    openGraph: {
        title: "Kalendarz dni roboczych 2026 - Święta, długie weekendy, urlopy",
        description:
            "Pełny kalendarz dni roboczych 2026 z oznaczonymi świętami i długimi weekendami. 251 dni roboczych.",
        type: "website",
        url: "https://calenda.pl/narzedzia/kalendarz-dni-roboczych-2026",
    },
    alternates: {
        canonical: "https://calenda.pl/narzedzia/kalendarz-dni-roboczych-2026",
    },
};

export default function WorkDaysCalendarLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
