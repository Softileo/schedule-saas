/**
 * =============================================================================
 * JSON-LD SCHEMA GENERATORS
 * =============================================================================
 *
 * Generatory Schema.org dla Rich Snippets w Google.
 */

// =============================================================================
// TYPES
// =============================================================================

export interface FAQItem {
    question: string;
    answer: string;
}

export interface EventItem {
    name: string;
    date: string;
    description?: string;
}

// =============================================================================
// ORGANIZATION SCHEMA (dla całej strony)
// =============================================================================

export function generateOrganizationSchema() {
    return {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "Calenda",
        url: "https://calenda.pl",
        logo: "https://calenda.pl/logo.png",
        description:
            "Aplikacja do tworzenia grafików pracy online. Automatyczny generator z AI, zgodny z Kodeksem Pracy.",
        sameAs: [],
        contactPoint: {
            "@type": "ContactPoint",
            contactType: "customer service",
            availableLanguage: "Polish",
        },
    };
}

// =============================================================================
// FAQ SCHEMA
// =============================================================================

export function generateFAQSchema(faqs: FAQItem[]) {
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: {
                "@type": "Answer",
                text: faq.answer,
            },
        })),
    };
}

// =============================================================================
// HOWTO SCHEMA
// =============================================================================

export interface HowToStep {
    name: string;
    text: string;
    image?: string;
}

export function generateHowToSchema(
    name: string,
    description: string,
    steps: HowToStep[],
    totalTime?: string
) {
    return {
        "@context": "https://schema.org",
        "@type": "HowTo",
        name,
        description,
        totalTime: totalTime || "PT10M",
        step: steps.map((step, index) => ({
            "@type": "HowToStep",
            position: index + 1,
            name: step.name,
            text: step.text,
            ...(step.image && { image: step.image }),
        })),
    };
}

// =============================================================================
// ARTICLE SCHEMA
// =============================================================================

export function generateArticleSchema(
    title: string,
    description: string,
    url: string,
    datePublished: string,
    dateModified?: string,
    author?: string
) {
    return {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: title,
        description,
        url,
        datePublished,
        dateModified: dateModified || datePublished,
        author: {
            "@type": "Organization",
            name: author || "Calenda",
        },
        publisher: {
            "@type": "Organization",
            name: "Calenda",
            logo: {
                "@type": "ImageObject",
                url: "https://calenda.pl/logo.png",
            },
        },
    };
}

// =============================================================================
// EVENT SCHEMA (dla niedziel handlowych)
// =============================================================================

export function generateEventSchema(events: EventItem[]) {
    return events.map((event) => ({
        "@context": "https://schema.org",
        "@type": "Event",
        name: event.name,
        startDate: event.date,
        endDate: event.date,
        description: event.description || event.name,
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        eventStatus: "https://schema.org/EventScheduled",
        location: {
            "@type": "Country",
            name: "Polska",
        },
    }));
}

// =============================================================================
// BREADCRUMB SCHEMA
// =============================================================================

export interface BreadcrumbItem {
    name: string;
    url: string;
}

export function generateBreadcrumbSchema(items: BreadcrumbItem[]) {
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.name,
            item: item.url,
        })),
    };
}

// =============================================================================
// SOFTWARE APPLICATION SCHEMA (dla strony głównej)
// =============================================================================

export function generateSoftwareApplicationSchema() {
    return {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "Calenda",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "PLN",
            description: "14 dni za darmo, bez karty kredytowej",
        },
        aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: "4.8",
            ratingCount: "127",
        },
    };
}

// =============================================================================
// HELPER - Combine multiple schemas
// =============================================================================

export function combineSchemas(...schemas: object[]): string {
    if (schemas.length === 1) {
        return JSON.stringify(schemas[0]);
    }
    return JSON.stringify(schemas);
}
