import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import {
    SEOPageLayout,
    SchemaScript,
    Breadcrumbs,
    CTABanner,
    ArticleMeta,
    TableOfContents,
    ShareButtons,
} from "@/components/features/seo";
import { mdxComponents } from "@/lib/mdx/components";
import {
    generateArticleSchema,
    generateBreadcrumbSchema,
} from "@/lib/seo/schemas";
import { getPoradnik, getAllPoradnikiPaths } from "@/lib/mdx";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";

interface PageProps {
    params: Promise<{ slug: string[] }>;
}

// Generowanie statycznych ścieżek
export async function generateStaticParams() {
    const paths = getAllPoradnikiPaths();
    return paths.map((slugArray) => ({
        slug: slugArray,
    }));
}

// Generowanie metadanych
export async function generateMetadata({
    params,
}: PageProps): Promise<Metadata> {
    const { slug } = await params;
    const post = await getPoradnik(slug); // Pass array directly

    if (!post) {
        return { title: "Nie znaleziono artykułu" };
    }

    return {
        title: `${post.title} | Poradniki Calenda`,
        description: post.description,
        keywords: post.seo?.keywords || post.tags,
        openGraph: {
            title: post.title,
            description: post.description,
            type: "article",
            publishedTime: post.date,
            authors: [post.author],
            tags: post.tags,
        },
        twitter: {
            card: "summary_large_image",
            title: post.title,
            description: post.description,
        },
    };
}

export default async function PoradnikArticlePage({ params }: PageProps) {
    const { slug } = await params;
    const slugPath = slug.join("/");
    const post = await getPoradnik(slug); // Pass array, not string

    if (!post) {
        notFound();
    }

    // Budowanie breadcrumbs
    const breadcrumbItems = [
        { name: "Strona główna", url: "https://calenda.pl" },
        { name: "Poradniki", url: "https://calenda.pl/poradniki" },
    ];

    // Dodaj kategorię do breadcrumbs
    if (slug.length > 1) {
        const categorySlug = slug[0];
        const categoryNames: Record<string, string> = {
            "czas-pracy": "Czas pracy",
            "kodeks-pracy": "Kodeks pracy",
        };
        breadcrumbItems.push({
            name: categoryNames[categorySlug] || categorySlug,
            url: `https://calenda.pl/poradniki/${categorySlug}`,
        });
    }

    breadcrumbItems.push({
        name: post.title,
        url: `https://calenda.pl/poradniki/${slugPath}`,
    });

    // Schema dla artykułu
    const schemas = [
        generateArticleSchema(
            post.title,
            post.description,
            `https://calenda.pl/poradniki/${slugPath}`,
            post.date
        ),
        generateBreadcrumbSchema(breadcrumbItems),
    ];

    // Kategoria z URL
    const category = slug.length > 1 ? slug[0] : "poradniki";
    const categoryNames: Record<string, string> = {
        "czas-pracy": "Czas pracy",
        "kodeks-pracy": "Kodeks pracy",
    };

    return (
        <SEOPageLayout>
            <SchemaScript schema={schemas} />

            <article className="py-8">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Breadcrumbs */}
                    <Breadcrumbs
                        items={[
                            { label: "Poradniki", href: "/poradniki" },
                            ...(slug.length > 1
                                ? [
                                      {
                                          label:
                                              categoryNames[slug[0]] || slug[0],
                                          href: `/poradniki/${slug[0]}`,
                                      },
                                  ]
                                : []),
                            { label: post.title },
                        ]}
                    />

                    {/* Header artykułu */}
                    <div className="max-w-3xl mx-auto mt-8">
                        <Link
                            href={`/poradniki/${category}`}
                            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Wróć do {categoryNames[category] || "Poradniki"}
                        </Link>

                        <div className="flex flex-wrap items-center gap-2 mb-4">
                            <Badge variant="secondary">{post.category}</Badge>
                            {post.tags.slice(0, 3).map((tag) => (
                                <Badge
                                    key={tag}
                                    variant="outline"
                                    className="text-xs"
                                >
                                    {tag}
                                </Badge>
                            ))}
                        </div>

                        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 leading-tight">
                            {post.title}
                        </h1>

                        <p className="text-xl text-gray-600 mb-6">
                            {post.description}
                        </p>

                        <ArticleMeta
                            author={post.author}
                            date={post.date}
                            readingTime={post.readingTime}
                            className="pb-8 border-b border-gray-200"
                        />
                    </div>

                    {/* Treść artykułu */}
                    <div className="mx-auto mt-8 max-w-6xl">
                        <div className="flex gap-8">
                            {/* Main content */}
                            <div className="flex-1 min-w-0">
                                <div className="prose prose-lg prose-gray max-w-none prose-headings:font-bold prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3 prose-p:text-gray-600 prose-p:leading-relaxed prose-li:text-gray-600 prose-strong:text-gray-900 prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline">
                                    <MDXRemote
                                        source={post.source}
                                        components={mdxComponents}
                                        options={{
                                            mdxOptions: {
                                                remarkPlugins: [remarkGfm],
                                            },
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Table of Contents - desktop only */}
                            <aside className="hidden xl:block w-64 shrink-0">
                                <TableOfContents />
                            </aside>
                        </div>
                    </div>

                    {/* Share Buttons */}
                    <div className="max-w-6xl mx-auto mt-8">
                        <ShareButtons
                            url={`/poradniki/${slugPath}`}
                            title={post.title}
                        />
                    </div>

                    {/* Powiązane artykuły */}
                    {post.relatedPosts && post.relatedPosts.length > 0 && (
                        <div className="max-w-6xl mx-auto mt-12 pt-8 border-t border-gray-200">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">
                                Powiązane artykuły
                            </h2>
                            <div className="grid sm:grid-cols-2 gap-4">
                                {post.relatedPosts.map((relatedSlug) => (
                                    <Link
                                        key={relatedSlug}
                                        href={`/poradniki/${category}/${relatedSlug}`}
                                    >
                                        <Card className="p-4 rounded-xl hover:shadow-md transition-shadow">
                                            <span className="text-gray-700 font-medium hover:text-blue-600">
                                                {relatedSlug
                                                    .replace(/-/g, " ")
                                                    .replace(/\b\w/g, (l) =>
                                                        l.toUpperCase()
                                                    )}
                                            </span>
                                        </Card>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </article>

            <CTABanner
                variant="gradient"
                title="Automatyczny grafik pracy"
                description="Calenda generuje grafiki zgodne z Kodeksem Pracy - automatycznie pilnuje norm, odpoczynków i limitów."
                primaryButton={{
                    text: "Wypróbuj za darmo",
                    href: "/rejestracja",
                }}
                secondaryButton={{ text: "Zobacz demo", href: "/#demo" }}
            />
        </SEOPageLayout>
    );
}
