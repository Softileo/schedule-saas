import {
    HeroSection,
    StatsSection,
    FeaturesSection,
    HowAIWorksSection,
    ComparisonSection,
    UseCasesSection,
    ComplianceSection,
    TimelineSection,
    TestimonialsSection,
    FAQSection,
    CTASection,
    FooterSection,
} from "@/components/features/landing";
import { MarketingHeader } from "@/components/features/marketing";

const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Calenda",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "PLN",
    },
    description:
        "Darmowy generator grafików pracy online z AI. Automatyczne układanie harmonogramów zgodnych z Kodeksem Pracy. Eksport do PDF i Excel.",
    featureList: [
        "Generator grafiku pracy AI",
        "Walidacja Kodeksu Pracy",
        "Eksport PDF i Excel",
        "Preferencje pracowników",
        "Nieobecności i urlopy",
        "Powiadomienia email",
        "Statystyki godzin i nadgodzin",
        "Obsługa wielu lokalizacji",
    ],
    screenshot: "https://calenda.pl/images/og-image.png",
    aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "4.9",
        ratingCount: "50",
        bestRating: "5",
    },
};

const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
        {
            "@type": "Question",
            name: "Jak działa generator grafiku pracy AI?",
            acceptedAnswer: {
                "@type": "Answer",
                text: "Algorytm AI analizuje dostępność pracowników, ich preferencje, umiejętności, wymagania prawne i historyczne dane, aby stworzyć optymalny grafik w kilka sekund. System uwzględnia Kodeks Pracy, odpoczynek dobowy i tygodniowy oraz limity nadgodzin.",
            },
        },
        {
            "@type": "Question",
            name: "Czy grafik jest zgodny z Kodeksem Pracy?",
            acceptedAnswer: {
                "@type": "Answer",
                text: "Tak, Calenda automatycznie weryfikuje zgodność grafiku z polskim Kodeksem Pracy: 11-godzinny odpoczynek dobowy, 35-godzinny odpoczynek tygodniowy, limity nadgodzin (150h rocznie) i niedziele handlowe.",
            },
        },
        {
            "@type": "Question",
            name: "Ile kosztuje program do grafików pracy?",
            acceptedAnswer: {
                "@type": "Answer",
                text: "Calenda oferuje 14-dniowy bezpłatny okres próbny bez konieczności podawania karty kredytowej. W tym czasie masz pełny dostęp do wszystkich funkcji systemu, w tym generatora AI.",
            },
        },
        {
            "@type": "Question",
            name: "Dla jakich branż nadaje się Calenda?",
            acceptedAnswer: {
                "@type": "Answer",
                text: "Calenda sprawdza się w każdej branży wymagającej grafiku pracy: handel detaliczny, gastronomia, hotelarstwo, produkcja, logistyka, usługi, call center i wiele innych.",
            },
        },
    ],
};

export default function HomePage() {
    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
            />
            <MarketingHeader variant="transparent" />
            <HeroSection />
            <StatsSection />
            {/* <HowAIWorksSection /> */}
            <ComparisonSection />
            <TimelineSection />
            <FeaturesSection />
            <UseCasesSection />
            {/* <ComplianceSection /> */}
            <TestimonialsSection />
            <FAQSection />
            <CTASection />
            <FooterSection />
        </>
    );
}
