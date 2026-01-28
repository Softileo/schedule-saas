/**
 * RelatedPosts Component
 *
 * Displays a grid of related blog posts with category badges and metadata
 * Usage: <RelatedPosts posts={relatedPosts} />
 */

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import type { PostMeta } from "@/lib/mdx";

interface RelatedPostsProps {
    posts: PostMeta[];
    title?: string;
    className?: string;
}

export function RelatedPosts({
    posts,
    title = "Powiązane artykuły",
    className = "",
}: RelatedPostsProps) {
    if (posts.length === 0) return null;

    return (
        <div className={`mt-12 pt-12 border-t border-gray-200 ${className}`}>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{title}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {posts.map((post) => (
                    <Link key={post.slug} href={`/blog/${post.slug}`}>
                        <Card className="p-4 h-full hover:shadow-md transition-shadow hover:border-blue-200">
                            <Badge variant="secondary" className="mb-2 text-xs">
                                {post.category}
                            </Badge>
                            <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                                {post.title}
                            </h3>
                            <p className="text-sm text-gray-600 line-clamp-2">
                                {post.description}
                            </p>
                            <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
                                <Clock className="h-3 w-3" />
                                {post.readingTime}
                            </div>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}
