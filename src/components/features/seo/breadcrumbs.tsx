import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export interface BreadcrumbItem {
    label: string;
    href?: string;
}

interface BreadcrumbsProps {
    items: BreadcrumbItem[];
}

/**
 * Komponent breadcrumbs dla nawigacji
 */
export function Breadcrumbs({ items }: BreadcrumbsProps) {
    return (
        <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-2 text-sm text-gray-500 overflow-x-auto whitespace-nowrap"
        >
            <Link
                href="/"
                className="hover:text-gray-700 transition-colors flex items-center"
            >
                <Home className="w-4 h-4" />
            </Link>

            {items.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                    {item.href ? (
                        <Link
                            href={item.href}
                            className="hover:text-gray-700 transition-colors"
                        >
                            {item.label}
                        </Link>
                    ) : (
                        <span className="text-gray-900 font-medium">
                            {item.label}
                        </span>
                    )}
                </div>
            ))}
        </nav>
    );
}
