/**
 * =============================================================================
 * ARTICLES GRID SECTION - Shared component for displaying article grids
 * =============================================================================
 */

import { ContentCard } from "@/components/features/content/ContentCard";
import { Card } from "@/components/ui/card";

interface Article {
    slug: string;
    title: string;
    description: string;
    date: string;
    image?: string;
    readingTime?: string;
    tags?: string[];
}

interface ArticlesGridSectionProps {
    articles: Article[];
    category: string;
    title?: string;
    icon?: React.ReactNode;
    emptyMessage?: string;
    variant?: "grid" | "list";
}

export function ArticlesGridSection({
    articles,
    category,
    title = "Artykuły w tym dziale",
    icon,
    emptyMessage = "Trwają prace nad artykułami w tej sekcji. Wróć wkrótce!",
    variant = "grid",
}: ArticlesGridSectionProps) {
    return (
        <section className="py-12 bg-gray-50/50">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto">
                    {icon ? (
                        <div className="flex items-center gap-3 mb-8">
                            {icon}
                            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                                {title}
                            </h2>
                        </div>
                    ) : (
                        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8 text-center">
                            {title}
                        </h2>
                    )}

                    <div className="grid sm:grid-cols-2 gap-6">
                        {articles.map((article) => (
                            <ContentCard
                                key={article.slug}
                                title={article.title}
                                description={article.description}
                                slug={article.slug}
                                date={article.date}
                                category={category}
                                image={article.image}
                                readingTime={article.readingTime}
                                tags={article.tags}
                                hrefPrefix="/poradniki"
                                variant={variant}
                            />
                        ))}

                        {articles.length === 0 && (
                            <Card className="p-12 text-center col-span-full">
                                <p className="text-gray-600">{emptyMessage}</p>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
