/**
 * ArticleMeta Component
 *
 * Reusable component for displaying article metadata (author, date, reading time)
 * Usage: <ArticleMeta author="Jan Kowalski" date="2024-01-15" readingTime="5 min" />
 */

import { Calendar, Clock, User } from "lucide-react";
import { formatDatePL } from "@/lib/utils/date-helpers";

interface ArticleMetaProps {
    author?: string;
    date: string;
    readingTime?: string;
    wordCount?: number;
    className?: string;
}

export function ArticleMeta({
    author,
    date,
    readingTime,
    wordCount,
    className = "",
}: ArticleMetaProps) {
    return (
        <div
            className={`flex flex-wrap items-center gap-6 text-sm text-gray-500 ${className}`}
        >
            {author && (
                <span className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {author}
                </span>
            )}
            <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {formatDatePL(date)}
            </span>
            {readingTime && (
                <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {readingTime}
                </span>
            )}
            {wordCount && (
                <>
                    <span className="text-gray-400">•</span>
                    <span>{wordCount.toLocaleString("pl-PL")} słów</span>
                </>
            )}
        </div>
    );
}
