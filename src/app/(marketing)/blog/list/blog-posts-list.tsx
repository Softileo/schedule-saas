"use client";

import { useState, useEffect, useCallback, startTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, ArrowRight, Tag } from "lucide-react";
import { formatDatePL } from "@/lib/utils/date-helpers";
import { cn } from "@/lib/utils";

// Define locally since we can't easily import types from lib/mdx if they are not exported or if this runs on client
// Ideally we should import shared types. Assuming PostMeta is available or we redefine partial type.
interface BlogPost {
    slug: string;
    title: string;
    description: string;
    date: string;
    category: string;
    image?: string;
    readingTime: string;
    tags?: string[];
}

interface CategoryCount {
    name: string;
    count: number;
}

interface BlogPostsListProps {
    posts: BlogPost[];
    categories: CategoryCount[];
    tags: CategoryCount[];
}

function normalizeCategoryName(name: string) {
    if (name === "prawo-pracy") return "Prawo pracy";
    return name
        .split("-")
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(" ");
}

export function BlogPostsList({ posts, categories, tags }: BlogPostsListProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    // Get category from URL or null
    const initialCategory = searchParams.get("kategoria");
    const [activeCategory, setActiveCategory] = useState<string | null>(
        initialCategory,
    );
    const [isAnimating, setIsAnimating] = useState(false);

    const handleCategoryChange = useCallback(
        (category: string | null, updateUrl = true) => {
            if (activeCategory === category) return;

            setIsAnimating(true);
            setActiveCategory(category);

            // Small delay to allow exit animation if we had one, or just trigger re-render
            setTimeout(() => {
                setIsAnimating(false);
            }, 300);

            if (updateUrl) {
                const params = new URLSearchParams(searchParams);
                if (category) {
                    params.set("kategoria", category);
                } else {
                    params.delete("kategoria");
                }
                // Use replace to avoid filling history stack too much, or push if you want history
                // scroll: false prevents jumping to top
                router.replace(`${pathname}?${params.toString()}`, {
                    scroll: false,
                });
            }
        },
        [activeCategory, pathname, router, searchParams],
    );

    // Update state when URL changes (handling back/forward navigation)
    useEffect(() => {
        const cat = searchParams.get("kategoria");
        if (cat !== activeCategory) {
            startTransition(() => {
                handleCategoryChange(cat, false);
            });
        }
    }, [searchParams, activeCategory, handleCategoryChange]);

    const filteredPosts = activeCategory
        ? posts.filter((post) => post.category === activeCategory)
        : posts;

    return (
        <div className="relative">
            {/* Mobile Category Filter */}
            <div className="lg:hidden mb-8">
                <h2 className="text-lg font-bold text-gray-900 mb-4">
                    Kategorie
                </h2>
                <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
                    <button
                        onClick={() => handleCategoryChange(null)}
                        className="focus:outline-none"
                    >
                        <Badge
                            className="whitespace-nowrap px-4 py-2 text-sm transition-colors"
                            variant={!activeCategory ? "default" : "secondary"}
                        >
                            Wszystkie
                        </Badge>
                    </button>
                    {categories.map((cat) => (
                        <button
                            key={cat.name}
                            onClick={() => handleCategoryChange(cat.name)}
                            className="focus:outline-none"
                        >
                            <Badge
                                className="whitespace-nowrap px-4 py-2 text-sm transition-colors"
                                variant={
                                    activeCategory === cat.name
                                        ? "default"
                                        : "secondary"
                                }
                            >
                                {normalizeCategoryName(cat.name)} ({cat.count})
                            </Badge>
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Articles List */}
                <div className="lg:col-span-3">
                    <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center justify-between">
                        <span className="truncate">
                            {activeCategory
                                ? ` ${normalizeCategoryName(activeCategory)}`
                                : "Najnowsze artykuły"}
                        </span>
                        {activeCategory && (
                            <button
                                onClick={() => handleCategoryChange(null)}
                                className="text-sm font-normal text-blue-600 hover:underline shrink-0 ml-4"
                            >
                                wszystkie
                            </button>
                        )}
                    </h2>

                    <div
                        className={cn(
                            "space-y-6 transition-opacity duration-300 min-h-125",
                            isAnimating ? "opacity-50" : "opacity-100",
                        )}
                    >
                        {filteredPosts.map((post) => (
                            <Link
                                key={post.slug}
                                href={`/blog/${post.slug}`}
                                className="block"
                            >
                                <Card className="p-6 hover:shadow-lg transition-all hover:border-blue-200 group">
                                    <div className="flex flex-col md:flex-row gap-6">
                                        {/* Image */}
                                        {post.image && (
                                            <div className="relative w-full md:w-48 h-48 md:h-32 shrink-0 rounded-lg overflow-hidden bg-gray-100">
                                                <Image
                                                    src={post.image}
                                                    alt={post.title}
                                                    fill
                                                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                                                />
                                            </div>
                                        )}

                                        {/* Content */}
                                        <div className="flex-1">
                                            {/* Category Badge */}
                                            <Badge
                                                variant="secondary"
                                                className="mb-3 bg-blue-50 text-blue-700"
                                            >
                                                {normalizeCategoryName(
                                                    post.category,
                                                )}
                                            </Badge>

                                            {/* Title */}
                                            <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                                                {post.title}
                                            </h3>

                                            {/* Description */}
                                            <p className="text-gray-600 mb-4 line-clamp-2">
                                                {post.description}
                                            </p>

                                            {/* Meta */}
                                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                                                <span className="flex items-center gap-1.5">
                                                    <Calendar className="h-4 w-4" />
                                                    {formatDatePL(post.date)}
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <Clock className="h-4 w-4" />
                                                    {post.readingTime}
                                                </span>
                                            </div>

                                            {/* Tags */}
                                            {post.tags &&
                                                post.tags.length > 0 && (
                                                    <div className="flex flex-wrap gap-2 mt-4">
                                                        {post.tags
                                                            .slice(0, 3)
                                                            .map((tag) => (
                                                                <span
                                                                    key={tag}
                                                                    className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full"
                                                                >
                                                                    {tag}
                                                                </span>
                                                            ))}
                                                    </div>
                                                )}
                                        </div>

                                        {/* Arrow */}
                                        <div className="hidden md:flex items-center">
                                            <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                                        </div>
                                    </div>
                                </Card>
                            </Link>
                        ))}

                        {filteredPosts.length === 0 && (
                            <Card className="p-12 text-center animate-in fade-in zoom-in duration-300">
                                <p className="text-gray-600">
                                    Brak artykułów w tej kategorii.
                                    <button
                                        onClick={() =>
                                            handleCategoryChange(null)
                                        }
                                        className="text-blue-600 hover:underline ml-2"
                                    >
                                        Wróć do wszystkich
                                    </button>
                                </p>
                            </Card>
                        )}
                    </div>
                </div>

                {/* Sidebar */}
                <div className="hidden lg:block lg:col-span-1 space-y-6">
                    {/* Categories */}
                    <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        Kategorie
                    </h2>
                    <Card className="p-6">
                        <div className="space-y-2">
                            <button
                                onClick={() => handleCategoryChange(null)}
                                className={cn(
                                    "flex items-center justify-between text-sm p-2 rounded-2xl transition-colors w-full",
                                    !activeCategory
                                        ? "bg-blue-50 text-blue-700"
                                        : "text-gray-700 hover:bg-gray-50",
                                )}
                            >
                                <span>Wszystkie</span>
                            </button>
                            {categories.map((cat) => (
                                <button
                                    key={cat.name}
                                    onClick={() =>
                                        handleCategoryChange(cat.name)
                                    }
                                    className={cn(
                                        "flex items-center justify-between text-sm p-2 rounded-2xl transition-colors w-full",
                                        activeCategory === cat.name
                                            ? "bg-blue-50 text-blue-700"
                                            : "text-gray-700 hover:bg-gray-50",
                                    )}
                                >
                                    <span className="capitalize">
                                        {normalizeCategoryName(cat.name)}
                                    </span>
                                    <Badge
                                        variant="secondary"
                                        className="text-xs"
                                    >
                                        {cat.count}
                                    </Badge>
                                </button>
                            ))}
                        </div>
                    </Card>

                    {/* Tags */}
                    <Card className="p-6">
                        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Tag className="h-5 w-5 text-blue-600" />
                            Tagi
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {tags.slice(0, 10).map((tag) => (
                                <Badge
                                    key={tag.name}
                                    variant="outline"
                                    className="text-xs cursor-pointer hover:bg-gray-50"
                                >
                                    {tag.name}
                                </Badge>
                            ))}
                        </div>
                    </Card>

                    {/* CTA */}
                    <Card className="p-6 bg-linear-to-br from-blue-50 to-violet-50 border-blue-100">
                        <h3 className="font-semibold text-gray-900 mb-2">
                            Twórz grafiki automatycznie
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Zamiast ręcznie układać grafik, pozwól algorytmowi
                            zrobić to za Ciebie.
                        </p>
                        <Link
                            href="/rejestracja"
                            className="text-blue-600 font-medium text-sm hover:text-blue-700 flex items-center gap-1"
                        >
                            Wypróbuj za darmo
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </Card>
                </div>
            </div>
        </div>
    );
}
