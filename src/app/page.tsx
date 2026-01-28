import {
    HeroSection,
    StatsSection,
    FeaturesSection,
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
    description: "Darmowy program do układania grafików pracy online.",
};

export default function HomePage() {
    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <MarketingHeader variant="transparent" />
            <HeroSection />
            <StatsSection />
            <FeaturesSection />
            <TimelineSection />
            <TestimonialsSection />
            <FAQSection />
            <CTASection />
            <FooterSection />
        </>
    );
}
