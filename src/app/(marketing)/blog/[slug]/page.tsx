/**
 * Blog Post Page - single article view
 */

import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import { getBlogPost, getBlogSlugs, getRelatedPosts } from "@/lib/mdx";
import { mdxComponents } from "@/lib/mdx/components";
import {
    generateSEOMetadata,
    generateArticleSchema,
    generateBreadcrumbSchema,
    generateFAQSchema,
} from "@/lib/seo";
import {
    SEOPageLayout,
    SchemaScript,
    Breadcrumbs,
    RelatedPosts,
    ArticleMeta,
    CTABanner,
    ShareButtons,
    TableOfContents,
} from "@/components/features/seo";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Tag } from "lucide-react";

interface PageProps {
    params: Promise<{ slug: string }>;
}

// Generate static paths
export async function generateStaticParams() {
    const slugs = await getBlogSlugs();
    return slugs.map((slug) => ({ slug }));
}

// Generate metadata
export async function generateMetadata({
    params,
}: PageProps): Promise<Metadata> {
    const { slug } = await params;
    const post = await getBlogPost(slug);

    if (!post) {
        return {};
    }

    return generateSEOMetadata({
        title: post.title,
        description: post.description,
        keywords: post.seo?.keywords || post.tags,
        canonical: `/blog/${slug}`,
        article: {
            publishedTime: post.date,
            author: post.author,
            tags: post.tags,
        },
    });
}

export default async function BlogPostPage({ params }: PageProps) {
    const { slug } = await params;
    const post = await getBlogPost(slug);

    if (!post) {
        notFound();
    }

    const relatedPosts = await getRelatedPosts(slug, post.category, post.tags);

    // Generate schemas
    const articleSchema = generateArticleSchema(
        post.title,
        post.description,
        post.date,
        post.author,
        `/blog/${slug}`,
    );

    const breadcrumbSchema = generateBreadcrumbSchema([
        { name: "Strona główna", url: "/" },
        { name: "Blog", url: "/blog" },
        { name: post.title, url: `/blog/${slug}` },
    ]);

    // Extract FAQ from content if schema includes FAQ
    const faqSchema = post.schema?.includes("FAQ")
        ? generateFAQSchema([
              // These would be extracted from MDX in a more sophisticated implementation
              {
                  question: "Przykładowe pytanie",
                  answer: "Odpowiedź znajduje się w artykule.",
              },
          ])
        : null;

    return (
        <SEOPageLayout>
            {/* Schema Markup */}
            <SchemaScript schema={articleSchema} />
            <SchemaScript schema={breadcrumbSchema} />
            {faqSchema && <SchemaScript schema={faqSchema} />}

            {/* Header */}
            <div className="relative container mx-auto px-4 py-8 md:py-12">
                <div className="mx-auto max-w-5xl">
                    {/* Breadcrumbs */}
                    <Breadcrumbs
                        items={[
                            { label: "Strona główna", href: "/" },
                            { label: "Blog", href: "/blog" },
                            { label: post.title },
                        ]}
                    />
                    {/* Back link */}
                    <div className="pt-16 mb-4 flex items-center gap-2">
                        <Link
                            href="/blog"
                            className="inline-flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors "
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Wróć do listy artykułów
                        </Link>

                        {/* Category */}
                        <Badge className=" bg-blue-100 text-blue-700 hover:bg-blue-100">
                            {post.category}
                        </Badge>
                    </div>

                    {/* Title */}
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                        {post.title}
                    </h1>

                    {/* Description */}
                    <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                        {post.description}
                    </p>

                    {/* Meta info */}
                    <ArticleMeta
                        author={post.author}
                        date={post.date}
                        readingTime={post.readingTime}
                        wordCount={post.wordCount}
                        className="pb-8 border-b border-gray-200"
                    />

                    {/* Featured Image */}
                    {post.image && (
                        <div className="relative w-full md:h-100 h-80 rounded-2xl overflow-hidden md:mt-8 bg-gray-100/50">
                            <Image
                                src={post.image}
                                alt={post.title}
                                fill
                                className="object-contain "
                                priority
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Article Content */}
            <div className="relative md:pt-8">
                <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col xl:flex-row gap-8">
                        {/* Table of Contents - mobile (above article) */}
                        <div className="xl:hidden">
                            <TableOfContents />
                        </div>

                        {/* Main content */}
                        <article className="prose prose-lg max-w-none flex-1 min-w-0">
                            <MDXRemote
                                source={post.content}
                                components={mdxComponents}
                                options={{
                                    mdxOptions: {
                                        remarkPlugins: [remarkGfm],
                                    },
                                }}
                            />
                        </article>

                        {/* Table of Contents - desktop (right side) */}
                        <aside className="hidden xl:block w-60 shrink-0">
                            <TableOfContents />
                        </aside>
                    </div>

                    {/* Tags */}
                    {post.tags && post.tags.length > 0 && (
                        <div className="mt-12 pt-8 border-t border-gray-200 max-w-4xl">
                            <div className="flex items-center gap-2 flex-wrap">
                                <Tag className="h-5 w-5 text-gray-400" />
                                {post.tags.map((tag) => (
                                    <Badge
                                        key={tag}
                                        variant="outline"
                                        className="text-sm"
                                    >
                                        {tag}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Share */}
                    <div className="mt-8 max-w-4xl">
                        <ShareButtons
                            url={`/blog/${slug}`}
                            title={post.title}
                        />
                    </div>

                    {/* Related Posts */}
                    <div className="max-w-4xl py-12">
                        <RelatedPosts posts={relatedPosts} />
                    </div>

                    {/* CTA at the end */}
                    <div>
                        <CTABanner
                            variant="gradient"
                            title="Chcesz automatycznie tworzyć grafiki pracy?"
                            subtitle="Calenda generuje grafiki zgodne z Kodeksem Pracy, uwzględniając preferencje pracowników i potrzeby Twojej firmy."
                            primaryButton={{
                                text: "Rozpocznij za darmo",
                                href: "/rejestracja",
                            }}
                            secondaryButton={{
                                text: "Zobacz narzędzia",
                                href: "/narzedzia",
                            }}
                        />
                    </div>
                </div>
            </div>
        </SEOPageLayout>
    );
}
