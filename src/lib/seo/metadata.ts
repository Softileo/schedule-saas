/**
 * =============================================================================
 * SEO METADATA HELPERS
 * =============================================================================
 *
 * Helpery do generowania metadanych Next.js.
 */

import type { Metadata } from "next";

// =============================================================================
// BASE CONFIG
// =============================================================================

const BASE_URL = "https://calenda.pl";
const SITE_NAME = "Calenda";
const DEFAULT_OG_IMAGE = "/og-image.png";

// =============================================================================
// TYPES
// =============================================================================

export interface SEOMetadataOptions {
    title: string;
    description: string;
    keywords?: string[];
    canonical?: string;
    ogImage?: string;
    noIndex?: boolean;
    article?: {
        publishedTime?: string;
        modifiedTime?: string;
        author?: string;
        tags?: string[];
    };
}

// =============================================================================
// MAIN GENERATOR
// =============================================================================

export function generateSEOMetadata(options: SEOMetadataOptions): Metadata {
    const {
        title,
        description,
        keywords = [],
        canonical,
        ogImage = DEFAULT_OG_IMAGE,
        noIndex = false,
        article,
    } = options;

    const fullTitle = title.includes("Calenda") ? title : `${title} | Calenda`;
    const url = canonical ? `${BASE_URL}${canonical}` : BASE_URL;

    return {
        title: fullTitle,
        description,
        keywords: keywords.length > 0 ? keywords : undefined,
        authors: [{ name: SITE_NAME }],
        creator: SITE_NAME,
        publisher: SITE_NAME,
        robots: noIndex
            ? { index: false, follow: false }
            : {
                  index: true,
                  follow: true,
                  googleBot: {
                      index: true,
                      follow: true,
                      "max-video-preview": -1,
                      "max-image-preview": "large",
                      "max-snippet": -1,
                  },
              },
        alternates: {
            canonical: url,
        },
        openGraph: {
            type: article ? "article" : "website",
            locale: "pl_PL",
            url,
            siteName: SITE_NAME,
            title: fullTitle,
            description,
            images: [
                {
                    url: ogImage.startsWith("http")
                        ? ogImage
                        : `${BASE_URL}${ogImage}`,
                    width: 1200,
                    height: 630,
                    alt: title,
                },
            ],
            ...(article && {
                publishedTime: article.publishedTime,
                modifiedTime: article.modifiedTime,
                authors: article.author ? [article.author] : undefined,
                tags: article.tags,
            }),
        },
        twitter: {
            card: "summary_large_image",
            title: fullTitle,
            description,
            images: [
                ogImage.startsWith("http") ? ogImage : `${BASE_URL}${ogImage}`,
            ],
        },
    };
}

// =============================================================================
// PRESET GENERATORS
// =============================================================================

export function generateMonthPageMetadata(
    monthName: string,
    year: number,
    slug: string,
): Metadata {
    return generateSEOMetadata({
        title: `Grafik Pracy ${monthName} ${year} - Dni Robocze i Święta`,
        description: `Grafik pracy na ${monthName.toLowerCase()} ${year}. Sprawdź dni robocze, święta i pobierz darmowy szablon PDF.`,
        keywords: [
            `grafik pracy ${monthName.toLowerCase()} ${year}`,
            `dni robocze ${monthName.toLowerCase()}`,
            `kalendarz ${monthName.toLowerCase()} ${year}`,
        ],
        canonical: `/grafik-pracy/${slug}`,
    });
}

export function generateIndustryPageMetadata(
    industryName: string,
    slug: string,
    description: string,
    keywords: string[] = [],
): Metadata {
    return generateSEOMetadata({
        title: `Grafik Pracy dla ${industryName} - Szablon i Generator`,
        description,
        keywords,
        canonical: `/grafik-pracy/${slug}`,
    });
}
