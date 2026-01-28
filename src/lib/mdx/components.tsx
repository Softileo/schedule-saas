/**
 * MDX Components for blog and poradniki
 *
 * Custom React components that can be used in MDX files.
 */

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    AlertCircle,
    Info,
    CheckCircle,
    AlertTriangle,
    ArrowRight,
    ExternalLink,
    BookOpen,
} from "lucide-react";

// ========================================
// INFO BOX - dla ważnych informacji
// ========================================

interface InfoBoxProps {
    type?: "info" | "warning" | "success" | "error";
    title?: string;
    children: React.ReactNode;
}

const infoBoxStyles = {
    info: {
        bg: "bg-blue-50",
        border: "border-blue-200",
        icon: Info,
        iconColor: "text-blue-600",
        titleColor: "text-blue-900",
    },
    warning: {
        bg: "bg-amber-50",
        border: "border-amber-200",
        icon: AlertTriangle,
        iconColor: "text-amber-600",
        titleColor: "text-amber-900",
    },
    success: {
        bg: "bg-green-50",
        border: "border-green-200",
        icon: CheckCircle,
        iconColor: "text-green-600",
        titleColor: "text-green-900",
    },
    error: {
        bg: "bg-red-50",
        border: "border-red-200",
        icon: AlertCircle,
        iconColor: "text-red-600",
        titleColor: "text-red-900",
    },
};

export function InfoBox({ type = "info", title, children }: InfoBoxProps) {
    const styles = infoBoxStyles[type];
    const Icon = styles.icon;

    return (
        <div
            className={cn(
                "my-6 rounded-xl border p-4",
                styles.bg,
                styles.border
            )}
        >
            <div className="flex gap-3">
                <Icon
                    className={cn("h-5 w-5 mt-0.5 shrink-0", styles.iconColor)}
                />
                <div className="space-y-1 flex-1">
                    {title && (
                        <p className={cn("font-semibold", styles.titleColor)}>
                            {title}
                        </p>
                    )}
                    <div className="text-gray-700 text-sm leading-relaxed [&>p]:m-0">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ========================================
// CTA BANNER - wezwanie do działania w artykule
// ========================================

interface CTAProps {
    title: string;
    description?: string;
    buttonText?: string;
    href?: string;
}

export function CTA({
    title,
    description,
    buttonText = "Rozpocznij za darmo",
    href = "/rejestracja",
}: CTAProps) {
    return (
        <Card className="my-8 bg-linear-to-r from-blue-600 to-violet-600 border-0 p-6 text-white">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="text-xl font-semibold">{title}</h3>
                    {description && (
                        <p className="text-blue-100 mt-1">{description}</p>
                    )}
                </div>
                <Link href={href}>
                    <Button className="bg-white text-blue-600 hover:bg-blue-50 h-12 px-6 rounded-xl font-semibold whitespace-nowrap">
                        {buttonText}
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </Link>
            </div>
        </Card>
    );
}

// ========================================
// TABLE OF CONTENTS
// ========================================

interface TOCItem {
    id: string;
    title: string;
    level: number;
}

interface TableOfContentsProps {
    items?: TOCItem[];
}

export function TableOfContents({ items = [] }: TableOfContentsProps) {
    if (items.length === 0) return null;

    return (
        <nav className="my-8 rounded-xl border border-gray-200 bg-gray-50 p-6">
            <div className="flex items-center gap-2 text-gray-900 font-semibold mb-4">
                <BookOpen className="h-5 w-5" />
                Spis treści
            </div>
            <ul className="space-y-2">
                {items.map((item, index) => (
                    <li
                        key={index}
                        style={{ paddingLeft: `${(item.level - 2) * 16}px` }}
                    >
                        <a
                            href={`#${item.id}`}
                            className="text-gray-600 hover:text-blue-600 transition-colors text-sm"
                        >
                            {item.title}
                        </a>
                    </li>
                ))}
            </ul>
        </nav>
    );
}

// ========================================
// STATS BOX - statystyki/liczby
// ========================================

interface StatsBoxProps {
    stats: Array<{
        label: string;
        value: string | number;
    }>;
}

export function StatsBox({ stats }: StatsBoxProps) {
    return (
        <div className="my-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
                <Card key={index} className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                        {stat.value}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                        {stat.label}
                    </div>
                </Card>
            ))}
        </div>
    );
}

// ========================================
// EXTERNAL LINK
// ========================================

interface ExternalLinkBoxProps {
    href: string;
    title: string;
    description?: string;
    source?: string;
}

export function ExternalLinkBox({
    href,
    title,
    description,
    source,
}: ExternalLinkBoxProps) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="block my-6 rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:bg-blue-50/50 transition-colors"
        >
            <div className="flex items-start gap-3">
                <ExternalLink className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
                <div>
                    <p className="font-semibold text-gray-900">{title}</p>
                    {description && (
                        <p className="text-sm text-gray-600 mt-1">
                            {description}
                        </p>
                    )}
                    {source && (
                        <p className="text-xs text-gray-400 mt-2">
                            Źródło: {source}
                        </p>
                    )}
                </div>
            </div>
        </a>
    );
}

// ========================================
// PROSE TYPOGRAPHY WRAPPER
// ========================================

interface ProseProps {
    children: React.ReactNode;
}

export function Prose({ children }: ProseProps) {
    return (
        <div className="prose prose-lg max-w-none prose-headings:font-bold prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-li:text-gray-700 prose-strong:text-gray-900">
            {children}
        </div>
    );
}

// ========================================
// COMPONENTS MAP dla next-mdx-remote
// ========================================

export const mdxComponents = {
    InfoBox,
    CTA,
    TableOfContents,
    StatsBox,
    ExternalLinkBox,
    Prose,
    // Override default elements
    h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
        <h1
            className="text-4xl font-bold text-gray-900 mt-12 mb-6 first:mt-0"
            {...props}
        />
    ),
    h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
        <h2
            className="text-2xl font-bold text-gray-900 mt-10 mb-4 scroll-mt-24"
            {...props}
        />
    ),
    h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
        <h3
            className="text-xl font-semibold text-gray-900 mt-8 mb-3 scroll-mt-24"
            {...props}
        />
    ),
    p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
        <p className="text-gray-700 leading-relaxed mb-4" {...props} />
    ),
    ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
        <ul
            className="list-disc list-outside ml-5 mb-4 space-y-2 text-gray-700"
            {...props}
        />
    ),
    ol: (props: React.HTMLAttributes<HTMLOListElement>) => (
        <ol
            className="list-decimal list-outside ml-5 mb-4 space-y-2 text-gray-700"
            {...props}
        />
    ),
    li: (props: React.HTMLAttributes<HTMLLIElement>) => (
        <li className="text-gray-700" {...props} />
    ),
    a: ({ href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
        const isExternal = href?.startsWith("http");
        if (isExternal) {
            return (
                <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline inline-flex items-center gap-1"
                    {...props}
                >
                    {props.children}
                    <ExternalLink className="h-3 w-3" />
                </a>
            );
        }
        return (
            <Link
                href={href || "#"}
                className="text-blue-600 hover:underline"
                {...props}
            />
        );
    },
    blockquote: (props: React.HTMLAttributes<HTMLQuoteElement>) => (
        <blockquote
            className="border-l-4 border-blue-500 pl-4 my-6 italic text-gray-600 bg-blue-50/50 py-3 pr-4 rounded-r-lg"
            {...props}
        />
    ),
    code: (props: React.HTMLAttributes<HTMLElement>) => (
        <code
            className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono"
            {...props}
        />
    ),
    pre: (props: React.HTMLAttributes<HTMLPreElement>) => (
        <pre
            className="bg-gray-900 text-gray-100 p-4 rounded-xl overflow-x-auto my-6"
            {...props}
        />
    ),
    table: (props: React.TableHTMLAttributes<HTMLTableElement>) => (
        <div className="overflow-x-auto my-8 not-prose">
            <table
                className="w-full border-collapse bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200"
                {...props}
            />
        </div>
    ),
    thead: (props: React.HTMLAttributes<HTMLTableSectionElement>) => (
        <thead
            className="bg-linear-to-r from-blue-50 to-violet-50"
            {...props}
        />
    ),
    tbody: (props: React.HTMLAttributes<HTMLTableSectionElement>) => (
        <tbody className="divide-y divide-gray-100" {...props} />
    ),
    tr: (props: React.HTMLAttributes<HTMLTableRowElement>) => (
        <tr className="hover:bg-blue-50/30 transition-colors" {...props} />
    ),
    th: (props: React.ThHTMLAttributes<HTMLTableCellElement>) => (
        <th
            className="px-6 py-4 text-left text-sm font-bold text-gray-900 uppercase tracking-wide"
            {...props}
        />
    ),
    td: (props: React.TdHTMLAttributes<HTMLTableCellElement>) => (
        <td
            className="px-6 py-4 text-sm text-gray-700 font-medium"
            {...props}
        />
    ),
    hr: () => <hr className="my-8 border-gray-200" />,
    img: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            className="rounded-xl my-6 w-full"
            alt={props.alt || ""}
            {...props}
        />
    ),
};

export default mdxComponents;
