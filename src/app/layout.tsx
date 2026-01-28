import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

import { generateSEOMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = generateSEOMetadata({
    title: "Grafik Pracy Online - Darmowy Program do Harmonogramów | Calenda",
    description:
        "Twórz grafiki pracy w minuty! ✓ Automatyczny generator z AI ✓ Święta państwowe ✓ Niedziele handlowe ✓ Eksport PDF ✓ Dla gastronomii, handlu, produkcji. Wypróbuj za darmo najlepszy program do harmonogramów pracy w Polsce!",
    keywords: [
        "grafik pracy online",
        "program do grafików pracy",
        "harmonogram pracy pracowników",
        "aplikacja do układania grafików",
        "system grafików pracy",
        "generator grafiku pracy",
        "darmowy program do grafików pracy",
        "grafik pracy dla małej firmy",
        "automatyczny grafik pracy",
        "grafik pracy gastronomia",
        "grafik pracy sklep",
        "grafik pracy z uwzględnieniem świąt",
        "niedziele handlowe",
        "grafik pracy aplikacja polska",
        "harmonogram pracy online",
        "planowanie grafików pracy",
        "program do planowania zmian",
        "aplikacja HR grafiki",
    ],
});

// JSON-LD Structured Data
const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
        {
            "@type": "WebSite",
            "@id": "https://calenda.pl/#website",
            url: "https://calenda.pl",
            name: "Calenda - Program do Grafików Pracy",
            description:
                "Najlepszy program do tworzenia grafików pracy online w Polsce",
            publisher: {
                "@id": "https://calenda.pl/#organization",
            },
            inLanguage: "pl-PL",
        },
        {
            "@type": "Organization",
            "@id": "https://calenda.pl/#organization",
            name: "Calenda",
            url: "https://calenda.pl",
            logo: {
                "@type": "ImageObject",
                url: "https://calenda.pl/logo.svg",
                width: 512,
                height: 512,
            },
            contactPoint: {
                "@type": "ContactPoint",
                telephone: "+48-123-456-789",
                contactType: "customer service",
                availableLanguage: ["Polish", "English"],
            },
            sameAs: [
                "https://facebook.com/calenda.pl",
                "https://twitter.com/calenda_pl",
                "https://linkedin.com/company/calenda-pl",
            ],
        },
        {
            "@type": "SoftwareApplication",
            "@id": "https://calenda.pl/#software",
            name: "Calenda - Program do Grafików Pracy",
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web, iOS, Android",
            offers: {
                "@type": "AggregateOffer",
                lowPrice: "0",
                highPrice: "149",
                priceCurrency: "PLN",
                offerCount: 3,
            },
            aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: "4.9",
                ratingCount: "500",
                bestRating: "5",
                worstRating: "1",
            },
            featureList: [
                "Generator grafików pracy z AI",
                "Automatyczne święta państwowe",
                "Niedziele handlowe w Polsce",
                "Eksport PDF (3 szablony)",
                "Drag & Drop edycja",
                "Multi-organizacja",
                "Zgodność z Kodeksem Pracy",
                "Aplikacja mobilna PWA",
            ],
        },
        {
            "@type": "FAQPage",
            "@id": "https://calenda.pl/#faq",
            mainEntity: [
                {
                    "@type": "Question",
                    name: "Jak zacząć korzystać z programu do grafików pracy Calenda?",
                    acceptedAnswer: {
                        "@type": "Answer",
                        text: "Rozpoczęcie pracy z Calenda jest bardzo proste i zajmuje dosłownie 5 minut. Wystarczy zarejestrować darmowe konto, dodać pracowników i już możesz tworzyć pierwszy grafik pracy.",
                    },
                },
                {
                    "@type": "Question",
                    name: "Czy program do grafików pracy Calenda jest darmowy?",
                    acceptedAnswer: {
                        "@type": "Answer",
                        text: "Tak! Calenda oferuje w pełni funkcjonalny plan darmowy, który pozwala zarządzać grafikami dla małych zespołów (do 5 pracowników) bez żadnych opłat, bez limitu czasowego.",
                    },
                },
                {
                    "@type": "Question",
                    name: "Jak działa generator grafików pracy z AI w Calenda?",
                    acceptedAnswer: {
                        "@type": "Answer",
                        text: "Nasz generator AI wykorzystuje zaawansowany algorytm 3-warstwowej optymalizacji uwzględniający wymogi prawne, preferencje pracowników i potrzeby biznesowe.",
                    },
                },
                {
                    "@type": "Question",
                    name: "Czy Calenda obsługuje polskie święta państwowe i niedziele handlowe?",
                    acceptedAnswer: {
                        "@type": "Answer",
                        text: "Tak! Calenda automatycznie pobiera aktualne święta państwowe i zna polskie prawo o ograniczeniu handlu w niedziele, włącznie z kalendarzem niedziel handlowych na lata 2024-2026.",
                    },
                },
                {
                    "@type": "Question",
                    name: "Czy harmonogramy pracy w Calenda są zgodne z Kodeksem Pracy?",
                    acceptedAnswer: {
                        "@type": "Answer",
                        text: "Tak! System automatycznie weryfikuje zgodność z polskim prawem pracy: minimalną 11-godzinną przerwę między zmianami, maksymalny czas pracy, limity nadgodzin i przerwy w pracy.",
                    },
                },
            ],
        },
    ],
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="pl">
            <head>
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify(jsonLd),
                    }}
                />
            </head>
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-dvh`}
            >
                <ErrorBoundary>{children}</ErrorBoundary>
                <Toaster richColors position="top-center" />
                <Analytics />
            </body>
        </html>
    );
}
