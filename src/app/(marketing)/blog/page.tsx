/**
 * Blog page - lista wszystkich artykułów
 */

import { Metadata } from "next";
import { Suspense } from "react";
import { getAllBlogPosts, getCategories, getTags } from "@/lib/mdx";
import { generateSEOMetadata } from "@/lib/seo";
import {
    SEOPageLayout,
    UniversalHero,
    CTABanner,
    Breadcrumbs,
} from "@/components/features/seo";
import { BlogPostsList } from "./list/blog-posts-list";

export const metadata: Metadata = generateSEOMetadata({
    title: "Blog - poradniki i artykuły o czasie pracy",
    description:
        "Praktyczne porady o tworzeniu grafików pracy, przepisach Kodeksu Pracy i zarządzaniu czasem pracy. Artykuły dla pracodawców i HR.",
    keywords: [
        "blog grafik pracy",
        "poradniki HR",
        "kodeks pracy",
        "czas pracy",
    ],
    canonical: "/blog",
});

export default async function BlogPage() {
    const allPosts = await getAllBlogPosts();
    const categories = await getCategories();
    const tags = await getTags();

    return (
        <SEOPageLayout>
            {/* Breadcrumbs */}
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-8">
                <Breadcrumbs items={[{ label: "Blog" }]} />
            </div>
            {/* Hero Section */}
            <UniversalHero
                badge={{ text: "Blog" }}
                title="Poradniki i artykuły"
                titleHighlight="o czasie pracy"
                subtitle="Praktyczne porady, aktualne przepisy i sprawdzone rozwiązania. Wszystko, czego potrzebujesz do profesjonalnego zarządzania czasem pracy."
            />

            {/* Main Content */}
            <div className="relative py-16">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <Suspense fallback={<div>Ładowanie...</div>}>
                        <BlogPostsList
                            posts={allPosts}
                            categories={categories}
                            tags={tags}
                        />
                    </Suspense>
                </div>
            </div>

            {/* CTA Section */}
            <CTABanner
                variant="gradient"
                title="Gotowy na automatyzację grafików?"
                description="Dołącz do firm, które oszczędzają godziny każdego miesiąca."
                primaryButton={{
                    text: "Rozpocznij za darmo",
                    href: "/rejestracja",
                }}
                secondaryButton={{ text: "Zobacz demo", href: "/demo" }}
            />
        </SEOPageLayout>
    );
}
