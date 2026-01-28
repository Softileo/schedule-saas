import Link from "next/link";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, ArrowRight } from "lucide-react";
import { formatDatePL } from "@/lib/utils/date-helpers";
import { cn } from "@/lib/utils";

export interface ContentCardProps {
    title: string;
    description: string;
    slug: string;
    date: string;
    category?: string;
    image?: string;
    readingTime?: string;
    tags?: string[];
    hrefPrefix?: string; // e.g., "/blog" or "/poradniki"
    className?: string;
    variant?: "list" | "grid";
}

export function ContentCard({
    title,
    description,
    slug,
    date,
    category,
    image,
    readingTime,
    tags,
    hrefPrefix = "/blog",
    className,
    variant = "list",
}: ContentCardProps) {
    // Construct href. If slug starts with /, use it as is, otherwise prepend prefix
    const href = slug.startsWith("/") ? slug : `${hrefPrefix}/${slug}`;

    const isGrid = variant === "grid";

    return (
        <Link href={href} className={cn("block h-full", className)}>
            <Card className="p-6 hover:shadow-lg transition-all hover:border-blue-200 group h-full">
                <div
                    className={cn(
                        "flex gap-6 h-full",
                        isGrid ? "flex-col" : "flex-col md:flex-row"
                    )}
                >
                    {/* Image */}
                    {image && (
                        <div
                            className={cn(
                                "relative shrink-0 rounded-lg overflow-hidden bg-gray-100",
                                isGrid
                                    ? "w-full h-48"
                                    : "w-full md:w-48 h-48 md:h-32"
                            )}
                        >
                            <Image
                                src={image}
                                alt={title}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                        </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 flex flex-col">
                        {/* Category Badge */}
                        {category && (
                            <Badge
                                variant="secondary"
                                className="mb-3 bg-blue-50 text-blue-700 w-fit"
                            >
                                {category}
                            </Badge>
                        )}

                        {/* Title */}
                        <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                            {title}
                        </h3>

                        {/* Description */}
                        <p className="text-gray-600 mb-4 line-clamp-2 flex-grow">
                            {description}
                        </p>

                        {/* Meta */}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mt-auto">
                            <span className="flex items-center gap-1.5">
                                <Calendar className="h-4 w-4" />
                                {formatDatePL(date)}
                            </span>
                            {readingTime && (
                                <span className="flex items-center gap-1.5">
                                    <Clock className="h-4 w-4" />
                                    {readingTime}
                                </span>
                            )}
                        </div>

                        {/* Tags */}
                        {tags && tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-4">
                                {tags.slice(0, 3).map((tag) => (
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

                    {/* Arrow - only show in list view on desktop */}
                    {!isGrid && (
                        <div className="hidden md:flex items-center h-full">
                            <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                        </div>
                    )}
                </div>
            </Card>
        </Link>
    );
}
